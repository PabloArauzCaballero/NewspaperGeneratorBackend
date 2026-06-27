import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { SEQUELIZE } from '../database/database.constants';
import { ArticleViewDto } from './analytics.schemas';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async trackArticleView(articleId: string, dto: ArticleViewDto, user?: AuthenticatedUser) {
    await this.assertArticleCanBeViewed(articleId, user);
    const [row] = await this.sequelize.query(
      `INSERT INTO article_views (article_id, user_id, visitor_hash, user_agent, ip_address) VALUES (:articleId, :userId, :visitorHash, :userAgent, :ipAddress) RETURNING id, viewed_at AS "viewedAt"`,
      { replacements: { articleId, userId: user?.id ?? null, visitorHash: dto.visitorHash ?? null, userAgent: dto.userAgent ?? null, ipAddress: dto.ipAddress ?? null }, type: QueryTypes.SELECT }
    );
    await this.sequelize.query(
      `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, correlation_id, causation_id) VALUES ('ArticleViewed', 'Article', :articleId, :payload::jsonb, gen_random_uuid(), gen_random_uuid())`,
      { replacements: { articleId, payload: JSON.stringify({ articleId, userId: user?.id ?? null }) }, type: QueryTypes.INSERT }
    );
    return row;
  }

  async articleSummaryAdmin() {
    return this.sequelize.query(
      `
      SELECT a.id AS "articleId", a.title, a.slug, a.access_type AS "accessType",
             count(v.id)::int AS "totalViews", count(DISTINCT v.user_id)::int AS "knownUserViews"
      FROM articles a
      LEFT JOIN article_views v ON v.article_id = a.id
      GROUP BY a.id
      ORDER BY "totalViews" DESC, a.created_at DESC
      LIMIT 100;
      `,
      { type: QueryTypes.SELECT }
    );
  }

  private async assertArticleCanBeViewed(articleId: string, user?: AuthenticatedUser) {
    const [article] = await this.sequelize.query<{ access_type: string; status: string }>(
      `SELECT access_type, status FROM articles WHERE id = :articleId LIMIT 1`,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
    if (!article || article.status !== 'published') throw new NotFoundException('Article not found');
    if (article.access_type === 'premium' && !(await this.hasActiveSubscription(user?.id))) throw new ForbiddenException('Active subscription is required');
  }

  private async hasActiveSubscription(userId?: string) {
    if (!userId) return false;
    const [row] = await this.sequelize.query<{ id: string }>(`SELECT id FROM subscriptions WHERE user_id = :userId AND status = 'active' AND starts_at <= now() AND ends_at > now() LIMIT 1`, {
      replacements: { userId }, type: QueryTypes.SELECT
    });
    return Boolean(row);
  }
}
