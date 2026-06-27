import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { SEQUELIZE } from '../database/database.constants';
import { UpsertReactionDto } from './reactions.schemas';

@Injectable()
export class ReactionsService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async summary(articleId: string, user?: AuthenticatedUser) {
    await this.assertArticleCanBeRead(articleId, user);
    const counts = await this.sequelize.query(
      `SELECT reaction_type AS "reactionType", count(*)::int AS count FROM reactions WHERE article_id = :articleId GROUP BY reaction_type ORDER BY reaction_type ASC`,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
    const [mine] = user
      ? await this.sequelize.query<{ reactionType: string }>(`SELECT reaction_type AS "reactionType" FROM reactions WHERE article_id = :articleId AND user_id = :userId LIMIT 1`, {
          replacements: { articleId, userId: user.id }, type: QueryTypes.SELECT
        })
      : [];
    return { articleId, counts, myReaction: mine?.reactionType ?? null };
  }

  async upsert(articleId: string, dto: UpsertReactionDto, user: AuthenticatedUser) {
    await this.assertArticleCanReact(articleId, user);
    return this.sequelize.transaction(async (transaction) => {
      const [row] = await this.sequelize.query<{ id: string }>(
        `
        INSERT INTO reactions (article_id, user_id, reaction_type)
        VALUES (:articleId, :userId, :reactionType)
        ON CONFLICT (article_id, user_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type
        RETURNING id;
        `,
        { replacements: { articleId, userId: user.id, reactionType: dto.reactionType }, type: QueryTypes.SELECT, transaction }
      );
      await this.writeOutbox('ReactionCreated', 'Reaction', row.id, { reactionId: row.id, articleId, userId: user.id, reactionType: dto.reactionType }, transaction);
      return this.summary(articleId, user);
    });
  }

  async remove(articleId: string, user: AuthenticatedUser) {
    await this.assertArticleCanBeRead(articleId, user);
    await this.sequelize.query(`DELETE FROM reactions WHERE article_id = :articleId AND user_id = :userId`, {
      replacements: { articleId, userId: user.id }, type: QueryTypes.DELETE
    });
    return this.summary(articleId, user);
  }

  private async assertArticleCanBeRead(articleId: string, user?: AuthenticatedUser) {
    const [article] = await this.sequelize.query<{ access_type: string; status: string }>(
      `SELECT access_type, status FROM articles WHERE id = :articleId LIMIT 1`,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
    if (!article || article.status !== 'published') throw new NotFoundException('Article not found');
    if (article.access_type === 'premium' && !(await this.hasActiveSubscription(user?.id))) throw new ForbiddenException('Active subscription is required');
  }

  private async assertArticleCanReact(articleId: string, user: AuthenticatedUser) {
    const [article] = await this.sequelize.query<{ access_type: string; status: string; reactions_enabled: boolean }>(
      `SELECT access_type, status, reactions_enabled FROM articles WHERE id = :articleId LIMIT 1`,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
    if (!article || article.status !== 'published') throw new NotFoundException('Article not found');
    if (!article.reactions_enabled) throw new ForbiddenException('Reactions are disabled for this article');
    if (article.access_type === 'premium' && !(await this.hasActiveSubscription(user.id))) throw new ForbiddenException('Active subscription is required');
  }

  private async hasActiveSubscription(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const [row] = await this.sequelize.query<{ id: string }>(
      `SELECT id FROM subscriptions WHERE user_id = :userId AND status = 'active' AND starts_at <= now() AND ends_at > now() LIMIT 1`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
    return Boolean(row);
  }

  private async writeOutbox(eventType: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, correlation_id, causation_id) VALUES (:eventType, :aggregateType, :aggregateId, :payload::jsonb, gen_random_uuid(), gen_random_uuid())`,
      { replacements: { eventType, aggregateType, aggregateId, payload: JSON.stringify(payload) }, type: QueryTypes.INSERT, transaction }
    );
  }
}
