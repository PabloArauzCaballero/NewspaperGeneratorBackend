import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { SEQUELIZE } from '../database/database.constants';
import { CreateCommentDto, ModerateCommentDto } from './comments.schemas';

@Injectable()
export class CommentsService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async listForArticle(articleId: string, user?: AuthenticatedUser) {
    await this.assertArticleCanBeRead(articleId, user);
    return this.sequelize.query(
      `
      SELECT c.id, c.article_id AS "articleId", c.parent_comment_id AS "parentCommentId", c.content, c.status,
             u.id AS "userId", u.full_name AS "userFullName", c.created_at AS "createdAt"
      FROM comments c
      INNER JOIN users u ON u.id = c.user_id
      WHERE c.article_id = :articleId AND c.status = 'approved'
      ORDER BY c.created_at ASC;
      `,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
  }

  async create(articleId: string, dto: CreateCommentDto, user: AuthenticatedUser) {
    await this.assertArticleCanComment(articleId, user);
    return this.sequelize.transaction(async (transaction) => {
      const [row] = await this.sequelize.query<{ id: string }>(
        `
        INSERT INTO comments (article_id, user_id, parent_comment_id, content, status)
        VALUES (:articleId, :userId, :parentCommentId, :content, 'pending_moderation')
        RETURNING id;
        `,
        { replacements: { articleId, userId: user.id, parentCommentId: dto.parentCommentId ?? null, content: dto.content }, type: QueryTypes.SELECT, transaction }
      );
      await this.writeOutbox('CommentCreated', 'Comment', row.id, { commentId: row.id, articleId, userId: user.id }, transaction);
      await this.writeOutbox('CommentModerationRequired', 'Comment', row.id, { commentId: row.id, articleId }, transaction);
      return this.getAdmin(row.id, transaction);
    });
  }

  async listAdmin() {
    return this.sequelize.query(
      `
      SELECT c.id, c.article_id AS "articleId", a.title AS "articleTitle", c.user_id AS "userId", u.full_name AS "userFullName",
             c.content, c.status, c.created_at AS "createdAt", c.updated_at AS "updatedAt"
      FROM comments c
      INNER JOIN articles a ON a.id = c.article_id
      INNER JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC
      LIMIT 200;
      `,
      { type: QueryTypes.SELECT }
    );
  }

  async moderate(commentId: string, dto: ModerateCommentDto, moderatorUserId: string) {
    return this.sequelize.transaction(async (transaction) => {
      const current = await this.getAdmin(commentId, transaction) as { id: string; status: string };
      const [row] = await this.sequelize.query<{ id: string }>(
        `UPDATE comments SET status = :status, updated_at = now() WHERE id = :commentId RETURNING id`,
        { replacements: { commentId, status: dto.status }, type: QueryTypes.SELECT, transaction }
      );
      if (!row) throw new NotFoundException('Comment not found');
      await this.sequelize.query(
        `INSERT INTO comment_moderation_logs (comment_id, moderator_user_id, previous_status, new_status, reason) VALUES (:commentId, :moderatorUserId, :previousStatus, :newStatus, :reason)`,
        { replacements: { commentId, moderatorUserId, previousStatus: current.status, newStatus: dto.status, reason: dto.reason ?? null }, type: QueryTypes.INSERT, transaction }
      );
      return this.getAdmin(commentId, transaction);
    });
  }

  private async getAdmin(commentId: string, transaction?: Transaction) {
    const [row] = await this.sequelize.query(
      `SELECT id, article_id AS "articleId", user_id AS "userId", parent_comment_id AS "parentCommentId", content, status, created_at AS "createdAt", updated_at AS "updatedAt" FROM comments WHERE id = :commentId LIMIT 1`,
      { replacements: { commentId }, type: QueryTypes.SELECT, transaction }
    );
    if (!row) throw new NotFoundException('Comment not found');
    return row;
  }

  private async assertArticleCanRead(articleId: string, user?: AuthenticatedUser) { return this.assertArticleCanBeRead(articleId, user); }

  private async assertArticleCanBeRead(articleId: string, user?: AuthenticatedUser) {
    const [article] = await this.sequelize.query<{ access_type: string; status: string }>(
      `SELECT access_type, status FROM articles WHERE id = :articleId LIMIT 1`,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
    if (!article || article.status !== 'published') throw new NotFoundException('Article not found');
    if (article.access_type === 'premium' && !(await this.hasActiveSubscription(user?.id))) throw new ForbiddenException('Active subscription is required');
  }

  private async assertArticleCanComment(articleId: string, user: AuthenticatedUser) {
    const [article] = await this.sequelize.query<{ access_type: string; status: string; comments_enabled: boolean }>(
      `SELECT access_type, status, comments_enabled FROM articles WHERE id = :articleId LIMIT 1`,
      { replacements: { articleId }, type: QueryTypes.SELECT }
    );
    if (!article || article.status !== 'published') throw new NotFoundException('Article not found');
    if (!article.comments_enabled) throw new ForbiddenException('Comments are disabled for this article');
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
