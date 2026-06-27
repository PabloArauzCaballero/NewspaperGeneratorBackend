import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { RedisCacheService } from '../cache/redis-cache.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { SEQUELIZE } from '../database/database.constants';
import { AdminArticleQueryDto, AttachMediaDto, CreateArticleDto, PublicArticleQueryDto, RequestChangesDto, ScheduleArticleDto, UpdateArticleDto } from './articles.schemas';

type ArticleListRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  access_type: 'public' | 'premium' | 'internal_only';
  status: string;
  published_at: Date | null;
  category_name: string;
  category_slug: string;
  tags: string[] | null;
  cover_image_url: string | null;
  cover_alt_text: string | null;
};

type ArticleDetailRow = ArticleListRow & {
  body: string;
  audio_transcript: string | null;
  comments_enabled: boolean;
  reactions_enabled: boolean;
  author_name: string;
  author_id: string;
  category_id: string;
  article_type: string;
};

@Injectable()
export class ArticlesService {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    private readonly redisCache: RedisCacheService
  ) {}

  async listPublishedArticles(query: PublicArticleQueryDto): Promise<Array<Record<string, unknown>>> {
    const cacheKey = this.redisCache.key('articles', 'public-list', this.redisCache.stableHash(query));
    return this.redisCache.rememberJson(cacheKey, 120, async () => this.listPublishedArticlesFromDb(query));
  }

  private async listPublishedArticlesFromDb(query: PublicArticleQueryDto): Promise<Array<Record<string, unknown>>> {
    const filters = [`a.status = 'published'`, `a.access_type IN ('public', 'premium')`];
    const replacements: Record<string, unknown> = { limit: query.limit, offset: query.offset };

    if (query.category) { filters.push('c.slug = :category'); replacements.category = query.category; }
    if (query.accessType) { filters.push('a.access_type = :accessType'); replacements.accessType = query.accessType; }
    if (query.q) { filters.push('(a.title ILIKE :q OR a.summary ILIKE :q)'); replacements.q = `%${query.q}%`; }
    if (query.tag) { filters.push('EXISTS (SELECT 1 FROM article_tags at2 INNER JOIN tags t2 ON t2.id = at2.tag_id WHERE at2.article_id = a.id AND t2.slug = :tag)'); replacements.tag = query.tag; }

    const rows = await this.sequelize.query<ArticleListRow>(
      `
      SELECT
        a.id,
        a.title,
        a.slug,
        a.summary,
        a.access_type,
        a.status,
        a.published_at,
        c.name AS category_name,
        c.slug AS category_slug,
        COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS tags,
        cover.url AS cover_image_url,
        cover.alt_text AS cover_alt_text
      FROM articles a
      INNER JOIN categories c ON c.id = a.category_id
      LEFT JOIN article_tags at ON at.article_id = a.id
      LEFT JOIN tags t ON t.id = at.tag_id
      LEFT JOIN article_media am ON am.article_id = a.id AND am.is_cover = true
      LEFT JOIN media_assets cover ON cover.id = am.media_asset_id
      WHERE ${filters.join(' AND ')}
      GROUP BY a.id, c.id, cover.id
      ORDER BY a.published_at DESC
      LIMIT :limit OFFSET :offset;
      `,
      { replacements, type: QueryTypes.SELECT }
    );

    return rows.map((row) => this.toListPayload(row));
  }

  async getPublishedArticleBySlug(slug: string, user?: AuthenticatedUser): Promise<Record<string, unknown>> {
    const anonymousCacheKey = this.redisCache.key('articles', 'detail', 'anonymous', slug);
    if (!user) {
      const cached = await this.redisCache.getJson<Record<string, unknown>>(anonymousCacheKey);
      if (cached) return cached;
    }

    const article = await this.findArticleDetailBySlug(slug);
    if (!article || article.status !== 'published' || !['public', 'premium'].includes(article.access_type)) {
      throw new NotFoundException('Article not found');
    }

    const isPremium = article.access_type === 'premium';
    const hasPremiumAccess = isPremium ? await this.hasActiveSubscription(user?.id) : true;
    const basePayload = this.toDetailBasePayload(article);

    if (isPremium && !hasPremiumAccess) {
      await this.writeOutbox('PremiumArticleAccessDenied', 'Article', article.id, {
        articleId: article.id,
        slug: article.slug,
        userId: user?.id ?? null,
        reason: user ? 'ACTIVE_SUBSCRIPTION_REQUIRED' : 'LOGIN_AND_ACTIVE_SUBSCRIPTION_REQUIRED'
      });
      const payload = {
        ...basePayload,
        body: null,
        audioTranscript: null,
        access: { allowed: false, reason: user ? 'ACTIVE_SUBSCRIPTION_REQUIRED' : 'LOGIN_AND_ACTIVE_SUBSCRIPTION_REQUIRED' },
        ads: []
      };
      if (!user) await this.redisCache.setJson(anonymousCacheKey, payload, 60);
      return payload;
    }

    const payload = {
      ...basePayload,
      body: article.body,
      audioTranscript: article.audio_transcript,
      access: { allowed: true, reason: isPremium ? 'ACTIVE_SUBSCRIPTION_VERIFIED' : 'PUBLIC_ARTICLE' },
      ads: isPremium ? [] : undefined
    };
    if (!user) await this.redisCache.setJson(anonymousCacheKey, payload, 120);
    return payload;
  }

  async getPremiumArticleBySlug(slug: string, user: AuthenticatedUser) {
    const article = await this.findArticleDetailBySlug(slug);
    if (!article || article.status !== 'published' || article.access_type !== 'premium') throw new NotFoundException('Premium article not found');
    const hasAccess = await this.hasActiveSubscription(user.id);
    if (!hasAccess) throw new ForbiddenException('Active subscription is required');
    return {
      ...this.toDetailBasePayload(article),
      body: article.body,
      audioTranscript: article.audio_transcript,
      access: { allowed: true, reason: 'ACTIVE_SUBSCRIPTION_VERIFIED' },
      ads: []
    };
  }

  async listAdmin(query: AdminArticleQueryDto) {
    const filters = ['1 = 1'];
    const replacements: Record<string, unknown> = { limit: query.limit, offset: query.offset };
    if (query.status) { filters.push('a.status = :status'); replacements.status = query.status; }
    if (query.accessType) { filters.push('a.access_type = :accessType'); replacements.accessType = query.accessType; }
    if (query.authorId) { filters.push('a.author_id = :authorId'); replacements.authorId = query.authorId; }

    const rows = await this.sequelize.query<ArticleListRow & { author_name: string }>(
      `
      SELECT a.id, a.title, a.slug, a.summary, a.access_type, a.status, a.published_at,
             c.name AS category_name, c.slug AS category_slug, u.full_name AS author_name,
             COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS tags,
             cover.url AS cover_image_url, cover.alt_text AS cover_alt_text
      FROM articles a
      INNER JOIN categories c ON c.id = a.category_id
      INNER JOIN users u ON u.id = a.author_id
      LEFT JOIN article_tags at ON at.article_id = a.id
      LEFT JOIN tags t ON t.id = at.tag_id
      LEFT JOIN article_media am ON am.article_id = a.id AND am.is_cover = true
      LEFT JOIN media_assets cover ON cover.id = am.media_asset_id
      WHERE ${filters.join(' AND ')}
      GROUP BY a.id, c.id, u.id, cover.id
      ORDER BY a.created_at DESC
      LIMIT :limit OFFSET :offset;
      `,
      { replacements, type: QueryTypes.SELECT }
    );
    return rows.map((row) => ({ ...this.toListPayload(row), authorName: row.author_name }));
  }

  async getAdmin(id: string) {
    const [article] = await this.sequelize.query<ArticleDetailRow>(
      `
      SELECT a.id, a.author_id, a.category_id, a.title, a.slug, a.summary, a.body, a.audio_transcript, a.article_type,
             a.access_type, a.status, a.comments_enabled, a.reactions_enabled, a.published_at,
             c.name AS category_name, c.slug AS category_slug, u.full_name AS author_name,
             COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS tags,
             cover.url AS cover_image_url, cover.alt_text AS cover_alt_text
      FROM articles a
      INNER JOIN categories c ON c.id = a.category_id
      INNER JOIN users u ON u.id = a.author_id
      LEFT JOIN article_tags at ON at.article_id = a.id
      LEFT JOIN tags t ON t.id = at.tag_id
      LEFT JOIN article_media am ON am.article_id = a.id AND am.is_cover = true
      LEFT JOIN media_assets cover ON cover.id = am.media_asset_id
      WHERE a.id = :id
      GROUP BY a.id, c.id, u.id, cover.id
      LIMIT 1;
      `,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!article) throw new NotFoundException('Article not found');
    return { ...this.toDetailBasePayload(article), body: article.body, audioTranscript: article.audio_transcript, authorId: article.author_id, categoryId: article.category_id, articleType: article.article_type };
  }

  async create(dto: CreateArticleDto, actorUser: AuthenticatedUser) {
    return this.sequelize.transaction(async (transaction) => {
      const [article] = await this.sequelize.query<{ id: string }>(
        `
        INSERT INTO articles (author_id, category_id, title, slug, summary, body, audio_transcript, article_type, access_type, status, comments_enabled, reactions_enabled)
        VALUES (:authorId, :categoryId, :title, :slug, :summary, :body, :audioTranscript, :articleType, :accessType, 'draft', :commentsEnabled, :reactionsEnabled)
        RETURNING id;
        `,
        { replacements: { authorId: actorUser.id, ...dto }, type: QueryTypes.SELECT, transaction }
      );
      await this.replaceTags(article.id, dto.tagIds, transaction);
      await this.createRevision(article.id, actorUser.id, dto.title, dto.body, 'Creación de borrador', transaction);
      await this.writeOutbox('ArticleDraftCreated', 'Article', article.id, { articleId: article.id, title: dto.title, accessType: dto.accessType }, transaction);
      await this.audit(actorUser.id, article.id, 'article.created', { status: 'draft' }, transaction);
      await this.invalidateArticleCaches(article.id);
      return this.getAdmin(article.id);
    });
  }

  async update(id: string, dto: UpdateArticleDto, actorUser: AuthenticatedUser) {
    return this.sequelize.transaction(async (transaction) => {
      const current = await this.getCurrentArticleForMutation(id, transaction);
      if (['published', 'archived'].includes(current.status) && !actorUser.roles.some((role) => ['admin', 'editor'].includes(role))) {
        throw new ForbiddenException('Only editors or admins can edit published/archived articles');
      }

      const fields: string[] = [];
      const replacements: Record<string, unknown> = { id };
      const mapping: Array<[keyof UpdateArticleDto, string, string]> = [
        ['title', 'title', 'title'], ['slug', 'slug', 'slug'], ['summary', 'summary', 'summary'], ['body', 'body', 'body'],
        ['audioTranscript', 'audio_transcript', 'audioTranscript'], ['categoryId', 'category_id', 'categoryId'], ['articleType', 'article_type', 'articleType'],
        ['accessType', 'access_type', 'accessType'], ['commentsEnabled', 'comments_enabled', 'commentsEnabled'], ['reactionsEnabled', 'reactions_enabled', 'reactionsEnabled']
      ];
      for (const [dtoKey, column, replKey] of mapping) {
        if (dto[dtoKey] !== undefined) { fields.push(`${column} = :${replKey}`); replacements[replKey] = dto[dtoKey] as unknown; }
      }
      if (fields.length) {
        await this.sequelize.query(`UPDATE articles SET ${fields.join(', ')}, updated_at = now() WHERE id = :id`, { replacements, type: QueryTypes.UPDATE, transaction });
      }
      if (dto.tagIds !== undefined) await this.replaceTags(id, dto.tagIds, transaction);
      if (dto.title || dto.body) await this.createRevision(id, actorUser.id, dto.title ?? current.title, dto.body ?? current.body, dto.changeReason ?? 'Actualización editorial', transaction);
      await this.writeOutbox('ArticleUpdatedAfterPublication', 'Article', id, { articleId: id, wasPublished: current.status === 'published' }, transaction);
      await this.audit(actorUser.id, id, 'article.updated', dto, transaction);
      await this.invalidateArticleCaches(id);
      return this.getAdmin(id);
    });
  }

  async submitReview(id: string, actorUser: AuthenticatedUser) { return this.transition(id, 'in_review', actorUser, 'ArticleSubmittedForReview', 'article.submitted_for_review'); }
  async approve(id: string, actorUser: AuthenticatedUser) { return this.transition(id, 'approved', actorUser, 'ArticleApproved', 'article.approved'); }
  async unpublish(id: string, actorUser: AuthenticatedUser) { return this.transition(id, 'unpublished', actorUser, 'ArticleUnpublished', 'article.unpublished'); }
  async archive(id: string, actorUser: AuthenticatedUser) { return this.transition(id, 'archived', actorUser, 'ArticleArchived', 'article.archived'); }

  async requestChanges(id: string, dto: RequestChangesDto, actorUser: AuthenticatedUser) {
    return this.sequelize.transaction(async (transaction) => {
      await this.getCurrentArticleForMutation(id, transaction);
      await this.sequelize.query(`UPDATE articles SET status = 'changes_requested', updated_at = now() WHERE id = :id`, { replacements: { id }, type: QueryTypes.UPDATE, transaction });
      await this.writeOutbox('ArticleChangesRequested', 'Article', id, { articleId: id, reason: dto.reason }, transaction);
      await this.audit(actorUser.id, id, 'article.changes_requested', dto, transaction);
      await this.invalidateArticleCaches(id);
      return this.getAdmin(id);
    });
  }

  async schedule(id: string, dto: ScheduleArticleDto, actorUser: AuthenticatedUser) {
    const publishAt = new Date(dto.publishAt);
    if (publishAt <= new Date()) throw new BadRequestException('publishAt must be in the future');
    return this.sequelize.transaction(async (transaction) => {
      await this.getCurrentArticleForMutation(id, transaction);
      await this.sequelize.query(`UPDATE articles SET status = 'scheduled', published_at = :publishAt, updated_at = now() WHERE id = :id`, { replacements: { id, publishAt }, type: QueryTypes.UPDATE, transaction });
      await this.writeOutbox('ArticleScheduled', 'Article', id, { articleId: id, publishAt: dto.publishAt }, transaction);
      await this.audit(actorUser.id, id, 'article.scheduled', dto, transaction);
      await this.invalidateArticleCaches(id);
      return this.getAdmin(id);
    });
  }

  async publish(id: string, actorUser: AuthenticatedUser) {
    return this.sequelize.transaction(async (transaction) => {
      const current = await this.getCurrentArticleForMutation(id, transaction);
      if (current.access_type === 'internal_only') throw new BadRequestException('Internal-only articles cannot be published publicly');
      await this.sequelize.query(`UPDATE articles SET status = 'published', published_at = now(), updated_at = now() WHERE id = :id`, { replacements: { id }, type: QueryTypes.UPDATE, transaction });
      const eventType = current.access_type === 'premium' ? 'PremiumArticlePublished' : 'PublicArticlePublished';
      await this.writeOutbox(eventType, 'Article', id, { articleId: id, title: current.title, slug: current.slug, accessType: current.access_type, categoryId: current.category_id }, transaction);
      if (current.access_type === 'premium') await this.writeOutbox('PremiumAdSlotsDisabled', 'Article', id, { articleId: id, reason: 'premium_articles_have_zero_ads' }, transaction);
      else await this.writeOutbox('PublicAdSlotsEnabled', 'Article', id, { articleId: id, reason: 'public_articles_allow_discreet_ads' }, transaction);
      await this.audit(actorUser.id, id, 'article.published', { eventType }, transaction);
      await this.invalidateArticleCaches(id);
      return this.getAdmin(id);
    });
  }

  async attachMedia(id: string, dto: AttachMediaDto, actorUser: AuthenticatedUser) {
    return this.sequelize.transaction(async (transaction) => {
      await this.getCurrentArticleForMutation(id, transaction);
      if (dto.isCover) {
        await this.sequelize.query(`UPDATE article_media SET is_cover = false WHERE article_id = :id`, { replacements: { id }, type: QueryTypes.UPDATE, transaction });
      }
      await this.sequelize.query(
        `
        INSERT INTO article_media (article_id, media_asset_id, display_order, is_cover)
        VALUES (:id, :mediaAssetId, :displayOrder, :isCover)
        ON CONFLICT (article_id, media_asset_id)
        DO UPDATE SET display_order = EXCLUDED.display_order, is_cover = EXCLUDED.is_cover;
        `,
        { replacements: { id, ...dto }, type: QueryTypes.INSERT, transaction }
      );
      await this.audit(actorUser.id, id, 'article.media_attached', dto, transaction);
      await this.invalidateArticleCaches(id);
      return this.getAdmin(id);
    });
  }

  async assertCanInteract(articleId: string, user?: AuthenticatedUser): Promise<void> {
    if (!user) throw new ForbiddenException('Login is required to interact with articles');
    const [article] = await this.sequelize.query<{ access_type: string; status: string; comments_enabled: boolean; reactions_enabled: boolean }>(
      `SELECT access_type, status, comments_enabled, reactions_enabled FROM articles WHERE id = :articleId LIMIT 1`,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
    if (!article || article.status !== 'published') throw new NotFoundException('Article not found');
    if (article.access_type === 'premium') {
      const hasAccess = await this.hasActiveSubscription(user.id);
      if (!hasAccess) throw new ForbiddenException('Active subscription is required for premium article interactions');
    }
  }

  private async findArticleDetailBySlug(slug: string) {
    const [article] = await this.sequelize.query<ArticleDetailRow>(
      `
      SELECT a.id, a.author_id, a.category_id, a.title, a.slug, a.summary, a.body, a.audio_transcript, a.article_type,
             a.access_type, a.status, a.comments_enabled, a.reactions_enabled, a.published_at,
             c.name AS category_name, c.slug AS category_slug, u.full_name AS author_name,
             COALESCE(array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::text[]) AS tags,
             cover.url AS cover_image_url, cover.alt_text AS cover_alt_text
      FROM articles a
      INNER JOIN categories c ON c.id = a.category_id
      INNER JOIN users u ON u.id = a.author_id
      LEFT JOIN article_tags at ON at.article_id = a.id
      LEFT JOIN tags t ON t.id = at.tag_id
      LEFT JOIN article_media am ON am.article_id = a.id AND am.is_cover = true
      LEFT JOIN media_assets cover ON cover.id = am.media_asset_id
      WHERE a.slug = :slug
      GROUP BY a.id, c.id, u.id, cover.id
      LIMIT 1;
      `,
      { replacements: { slug }, type: QueryTypes.SELECT }
    );
    return article ?? null;
  }

  private async getCurrentArticleForMutation(id: string, transaction?: Transaction) {
    const [article] = await this.sequelize.query<{ id: string; title: string; slug: string; body: string; status: string; access_type: string; category_id: string }>(
      `SELECT id, title, slug, body, status, access_type, category_id FROM articles WHERE id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT, transaction }
    );
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  private async hasActiveSubscription(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const [subscription] = await this.sequelize.query<{ id: string }>(
      `SELECT id FROM subscriptions WHERE user_id = :userId AND status = 'active' AND starts_at <= now() AND ends_at > now() LIMIT 1`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
    return Boolean(subscription);
  }

  private async replaceTags(articleId: string, tagIds: string[], transaction?: Transaction) {
    await this.sequelize.query('DELETE FROM article_tags WHERE article_id = :articleId', { replacements: { articleId }, type: QueryTypes.DELETE, transaction });
    for (const tagId of tagIds) {
      await this.sequelize.query('INSERT INTO article_tags (article_id, tag_id) VALUES (:articleId, :tagId) ON CONFLICT (article_id, tag_id) DO NOTHING', {
        replacements: { articleId, tagId }, type: QueryTypes.INSERT, transaction
      });
    }
  }

  private async createRevision(articleId: string, editedByUserId: string, title: string, body: string, changeReason: string, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO article_revisions (article_id, edited_by_user_id, title_snapshot, body_snapshot, change_reason) VALUES (:articleId, :editedByUserId, :title, :body, :changeReason)`,
      { replacements: { articleId, editedByUserId, title, body, changeReason }, type: QueryTypes.INSERT, transaction }
    );
  }

  private async transition(id: string, status: string, actorUser: AuthenticatedUser, eventType: string, action: string) {
    return this.sequelize.transaction(async (transaction) => {
      await this.getCurrentArticleForMutation(id, transaction);
      await this.sequelize.query('UPDATE articles SET status = :status, updated_at = now(), published_at = CASE WHEN :status <> \'published\' THEN published_at ELSE now() END WHERE id = :id', {
        replacements: { id, status }, type: QueryTypes.UPDATE, transaction
      });
      await this.writeOutbox(eventType, 'Article', id, { articleId: id, status }, transaction);
      await this.audit(actorUser.id, id, action, { status }, transaction);
      await this.invalidateArticleCaches(id);
      return this.getAdmin(id);
    });
  }


  private async invalidateArticleCaches(articleId?: string): Promise<void> {
    await this.redisCache.deleteManyByPattern([
      this.redisCache.key('articles', '*'),
      this.redisCache.key('ads', '*'),
      this.redisCache.key('analytics', '*')
    ]);
    if (articleId) {
      await this.sequelize.query(
        `INSERT INTO cache_invalidation_jobs (entity_name, entity_id, reason, status, processed_at) VALUES ('Article', :articleId, 'article mutation invalidated redis public/article caches', 'processed', now())`,
        { replacements: { articleId }, type: QueryTypes.INSERT }
      ).catch(() => undefined);
    }
  }

  private async writeOutbox(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `
      INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, correlation_id, causation_id)
      VALUES (:eventType, :aggregateType, :aggregateId, :payload::jsonb, gen_random_uuid(), gen_random_uuid())
      `,
      { replacements: { eventType, aggregateType, aggregateId, payload: JSON.stringify(payload) }, type: QueryTypes.INSERT, transaction }
    );
  }

  private async audit(actorUserId: string, entityId: string, action: string, metadata: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, metadata) VALUES (:actorUserId, 'Article', :entityId, :action, :metadata::jsonb)`,
      { replacements: { actorUserId, entityId, action, metadata: JSON.stringify(metadata) }, type: QueryTypes.INSERT, transaction }
    );
  }

  private toListPayload(row: ArticleListRow) {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      accessType: row.access_type,
      isPremium: row.access_type === 'premium',
      status: row.status,
      publishedAt: row.published_at,
      category: { name: row.category_name, slug: row.category_slug },
      tags: row.tags ?? [],
      cover: row.cover_image_url ? { url: row.cover_image_url, altText: row.cover_alt_text } : null
    };
  }

  private toDetailBasePayload(article: ArticleDetailRow) {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      accessType: article.access_type,
      isPremium: article.access_type === 'premium',
      status: article.status,
      publishedAt: article.published_at,
      author: { id: article.author_id, name: article.author_name },
      category: { id: article.category_id, name: article.category_name, slug: article.category_slug },
      tags: article.tags ?? [],
      cover: article.cover_image_url ? { url: article.cover_image_url, altText: article.cover_alt_text } : null,
      commentsEnabled: article.comments_enabled,
      reactionsEnabled: article.reactions_enabled
    };
  }
}
