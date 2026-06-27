import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';
import { AdSlotsQueryDto, CreateAdvertisementDto, UpdateAdvertisementDto } from './ads.schemas';

type ArticleAccessRow = { id: string; slug: string; access_type: 'public' | 'premium' | 'internal_only'; category_id: string };
type AdRow = { id: string; title: string; image_url: string; target_url: string; placement_code: string; placement_name: string };

@Injectable()
export class AdsService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async getSlotsForArticle(query: AdSlotsQueryDto, userId?: string): Promise<{ articleSlug: string; articleId: string; ads: Array<Record<string, unknown>> }> {
    const where = query.articleId ? 'id = :articleId' : 'slug = :articleSlug';
    const [article] = await this.sequelize.query<ArticleAccessRow>(
      `SELECT id, slug, access_type, category_id FROM articles WHERE ${where} AND status = 'published' LIMIT 1`,
      { replacements: query, type: QueryTypes.SELECT }
    );
    if (!article) throw new NotFoundException('Article not found');
    if (article.access_type === 'premium') return { articleSlug: article.slug, articleId: article.id, ads: [] };

    const ads = await this.sequelize.query<AdRow>(
      `
      SELECT ads.id, ads.title, ads.image_url, ads.target_url, p.code AS placement_code, p.name AS placement_name
      FROM advertisements ads
      INNER JOIN advertisement_placements p ON p.id = ads.placement_id
      LEFT JOIN advertisement_category_targets act ON act.advertisement_id = ads.id
      WHERE ads.status = 'active'
        AND p.is_active = true
        AND p.allowed_context = 'public_articles'
        AND ads.starts_at <= now()
        AND ads.ends_at > now()
        AND (act.category_id IS NULL OR act.category_id = :categoryId)
      ORDER BY p.code ASC, ads.created_at DESC
      LIMIT 3;
      `,
      { replacements: { categoryId: article.category_id }, type: QueryTypes.SELECT }
    );

    for (const ad of ads) {
      await this.sequelize.query(
        `INSERT INTO advertisement_impressions (advertisement_id, article_id, user_id) VALUES (:adId, :articleId, :userId)`,
        { replacements: { adId: ad.id, articleId: article.id, userId: userId ?? null }, type: QueryTypes.INSERT }
      );
    }

    return {
      articleSlug: article.slug,
      articleId: article.id,
      ads: ads.map((ad) => ({
        id: ad.id,
        title: ad.title,
        imageUrl: ad.image_url,
        targetUrl: ad.target_url,
        placement: { code: ad.placement_code, name: ad.placement_name },
        policy: 'discreet_non_popup_public_content_only'
      }))
    };
  }

  async listAdmin() {
    return this.sequelize.query(
      `
      SELECT ads.id, ads.title, ads.image_url AS "imageUrl", ads.target_url AS "targetUrl", ads.status,
             ads.starts_at AS "startsAt", ads.ends_at AS "endsAt", ads.created_at AS "createdAt",
             p.id AS "placementId", p.code AS "placementCode", p.name AS "placementName",
             COALESCE(array_agg(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL), ARRAY[]::uuid[]) AS "categoryIds"
      FROM advertisements ads
      INNER JOIN advertisement_placements p ON p.id = ads.placement_id
      LEFT JOIN advertisement_category_targets act ON act.advertisement_id = ads.id
      LEFT JOIN categories c ON c.id = act.category_id
      GROUP BY ads.id, p.id
      ORDER BY ads.created_at DESC;
      `,
      { type: QueryTypes.SELECT }
    );
  }

  async listPlacements() {
    return this.sequelize.query(
      `SELECT id, code, name, description, allowed_context AS "allowedContext", is_active AS "isActive" FROM advertisement_placements ORDER BY code ASC`,
      { type: QueryTypes.SELECT }
    );
  }

  async create(dto: CreateAdvertisementDto, actorUserId: string) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('endsAt must be after startsAt');

    return this.sequelize.transaction(async (transaction) => {
      const [row] = await this.sequelize.query<{ id: string }>(
        `
        INSERT INTO advertisements (placement_id, title, image_url, target_url, status, starts_at, ends_at)
        VALUES (:placementId, :title, :imageUrl, :targetUrl, 'draft', :startsAt, :endsAt)
        RETURNING id;
        `,
        { replacements: { ...dto, startsAt, endsAt }, type: QueryTypes.SELECT, transaction }
      );
      await this.replaceTargets(row.id, dto.categoryIds, transaction);
      await this.audit(actorUserId, row.id, 'advertisement.created', dto, transaction);
      return this.getAdmin(row.id, transaction);
    });
  }

  async update(id: string, dto: UpdateAdvertisementDto, actorUserId: string) {
    return this.sequelize.transaction(async (transaction) => {
      const fields: string[] = [];
      const replacements: Record<string, unknown> = { id };
      const mapping: Array<[keyof UpdateAdvertisementDto, string, string]> = [
        ['placementId', 'placement_id', 'placementId'], ['title', 'title', 'title'], ['imageUrl', 'image_url', 'imageUrl'], ['targetUrl', 'target_url', 'targetUrl']
      ];
      for (const [dtoKey, column, replKey] of mapping) {
        if (dto[dtoKey] !== undefined) { fields.push(`${column} = :${replKey}`); replacements[replKey] = dto[dtoKey]; }
      }
      if (dto.startsAt !== undefined) { fields.push('starts_at = :startsAt'); replacements.startsAt = new Date(dto.startsAt); }
      if (dto.endsAt !== undefined) { fields.push('ends_at = :endsAt'); replacements.endsAt = new Date(dto.endsAt); }
      if (fields.length) await this.sequelize.query(`UPDATE advertisements SET ${fields.join(', ')}, updated_at = now() WHERE id = :id`, { replacements, type: QueryTypes.UPDATE, transaction });
      if (dto.categoryIds !== undefined) await this.replaceTargets(id, dto.categoryIds, transaction);
      await this.audit(actorUserId, id, 'advertisement.updated', dto, transaction);
      return this.getAdmin(id, transaction);
    });
  }

  async activate(id: string, actorUserId: string) { return this.setStatus(id, 'active', actorUserId); }
  async pause(id: string, actorUserId: string) { return this.setStatus(id, 'paused', actorUserId); }

  private async setStatus(id: string, status: string, actorUserId: string) {
    const [row] = await this.sequelize.query<{ id: string }>(`UPDATE advertisements SET status = :status, updated_at = now() WHERE id = :id RETURNING id`, {
      replacements: { id, status }, type: QueryTypes.SELECT
    });
    if (!row) throw new NotFoundException('Advertisement not found');
    await this.audit(actorUserId, id, `advertisement.${status}`, { status });
    return this.getAdmin(id);
  }

  private async getAdmin(id: string, transaction?: Transaction) {
    const [row] = await this.sequelize.query(
      `
      SELECT ads.id, ads.title, ads.image_url AS "imageUrl", ads.target_url AS "targetUrl", ads.status,
             ads.starts_at AS "startsAt", ads.ends_at AS "endsAt", ads.created_at AS "createdAt", ads.updated_at AS "updatedAt",
             p.id AS "placementId", p.code AS "placementCode", p.name AS "placementName",
             COALESCE(array_agg(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL), ARRAY[]::uuid[]) AS "categoryIds"
      FROM advertisements ads
      INNER JOIN advertisement_placements p ON p.id = ads.placement_id
      LEFT JOIN advertisement_category_targets act ON act.advertisement_id = ads.id
      LEFT JOIN categories c ON c.id = act.category_id
      WHERE ads.id = :id
      GROUP BY ads.id, p.id
      LIMIT 1;
      `,
      { replacements: { id }, type: QueryTypes.SELECT, transaction }
    );
    if (!row) throw new NotFoundException('Advertisement not found');
    return row;
  }

  private async replaceTargets(advertisementId: string, categoryIds: string[], transaction?: Transaction) {
    await this.sequelize.query('DELETE FROM advertisement_category_targets WHERE advertisement_id = :advertisementId', { replacements: { advertisementId }, type: QueryTypes.DELETE, transaction });
    for (const categoryId of categoryIds) {
      await this.sequelize.query('INSERT INTO advertisement_category_targets (advertisement_id, category_id) VALUES (:advertisementId, :categoryId) ON CONFLICT (advertisement_id, category_id) DO NOTHING', {
        replacements: { advertisementId, categoryId }, type: QueryTypes.INSERT, transaction
      });
    }
  }

  private async audit(actorUserId: string, entityId: string, action: string, metadata: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, metadata) VALUES (:actorUserId, 'Advertisement', :entityId, :action, :metadata::jsonb)`,
      { replacements: { actorUserId, entityId, action, metadata: JSON.stringify(metadata) }, type: QueryTypes.INSERT, transaction }
    );
  }
}
