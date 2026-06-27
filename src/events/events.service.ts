import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { RedisCacheService } from '../cache/redis-cache.service';
import { SEQUELIZE } from '../database/database.constants';

@Injectable()
export class EventsService {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    private readonly redisCache: RedisCacheService,
    private readonly configService: ConfigService
  ) {}

  async listOutbox(status?: string) {
    const replacements: Record<string, unknown> = {};
    const where = status ? 'WHERE status = :status' : '';
    if (status) replacements.status = status;
    return this.sequelize.query(
      `SELECT id, event_type AS "eventType", aggregate_type AS "aggregateType", aggregate_id AS "aggregateId", payload, status, retry_count AS "retryCount", last_error AS "lastError", occurred_at AS "occurredAt", published_at AS "publishedAt" FROM event_outbox ${where} ORDER BY occurred_at DESC LIMIT 200`,
      { replacements, type: QueryTypes.SELECT }
    );
  }

  async listInbox() {
    return this.sequelize.query(
      `SELECT id, event_id AS "eventId", consumer_name AS "consumerName", status, processed_at AS "processedAt", last_error AS "lastError", created_at AS "createdAt" FROM event_inbox ORDER BY created_at DESC LIMIT 200`,
      { type: QueryTypes.SELECT }
    );
  }

  async dispatchPending(limit: number) {
    const events = await this.sequelize.query<{ id: string; event_type: string; aggregate_id: string; payload: Record<string, unknown> }>(
      `SELECT id, event_type, aggregate_id, payload FROM event_outbox WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= now()) ORDER BY occurred_at ASC LIMIT :limit`,
      { replacements: { limit }, type: QueryTypes.SELECT }
    );

    const results = [] as Array<Record<string, unknown>>;
    for (const event of events) {
      const result = await this.dispatchOne(event.id);
      results.push(result);
    }
    return { processed: results.length, results };
  }

  async runWorkerBatch(options: { workerName?: string; limit?: number; lockTtlSeconds?: number } = {}) {
    const workerName = options.workerName ?? 'event-outbox-worker';
    const limit = options.limit ?? this.configService.get<number>('WORKER_EVENTS_BATCH_SIZE', 25);
    const lockTtlSeconds = options.lockTtlSeconds ?? this.configService.get<number>('WORKER_LOCK_TTL_SECONDS', 45);
    const lockKey = this.redisCache.key('worker-lock', workerName);
    const lockValue = crypto.randomUUID();
    let locked = false;

    if (this.redisCache.enabled) {
      locked = await this.redisCache.setIfNotExists(lockKey, lockValue, lockTtlSeconds);
      if (!locked) {
        await this.recordWorkerRun(workerName, lockKey, 'skipped', 0, 0, { reason: 'lock_already_held' });
        return { workerName, status: 'skipped', processed: 0, failed: 0, reason: 'lock_already_held' };
      }
    }

    const startedAt = Date.now();
    try {
      const result = await this.dispatchPending(limit);
      const failed = result.results.filter((item) => item.status === 'failed').length;
      await this.recordWorkerRun(workerName, lockKey, failed > 0 ? 'failed' : 'succeeded', result.processed, failed, { durationMs: Date.now() - startedAt });
      return { workerName, status: failed > 0 ? 'failed' : 'succeeded', processed: result.processed, failed, results: result.results };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown worker error';
      await this.recordWorkerRun(workerName, lockKey, 'failed', 0, 1, { durationMs: Date.now() - startedAt, error: message });
      throw error;
    } finally {
      if (locked) await this.redisCache.releaseLock(lockKey, lockValue);
    }
  }


  async retry(id: string, reason: string) {
    const [row] = await this.sequelize.query<{ id: string }>(
      `UPDATE event_outbox SET status = 'pending', next_retry_at = null, last_error = null, updated_at = now() WHERE id = :id RETURNING id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!row) throw new NotFoundException('Event not found');
    return { id, status: 'pending', reason };
  }

  private async recordWorkerRun(workerName: string, lockKey: string, status: 'started' | 'succeeded' | 'failed' | 'skipped', processedCount: number, failedCount: number, metadata: Record<string, unknown>) {
    await this.sequelize.query(
      `
      INSERT INTO worker_runs (worker_name, lock_key, status, processed_count, failed_count, finished_at, error_message, metadata)
      VALUES (:workerName, :lockKey, :status, :processedCount, :failedCount, now(), :errorMessage, :metadata::jsonb)
      `,
      {
        replacements: {
          workerName,
          lockKey,
          status,
          processedCount,
          failedCount,
          errorMessage: typeof metadata.error === 'string' ? metadata.error : null,
          metadata: JSON.stringify(metadata)
        },
        type: QueryTypes.INSERT
      }
    ).catch(() => undefined);
  }

  private async dispatchOne(eventId: string) {
    return this.sequelize.transaction(async (transaction) => {
      const [event] = await this.sequelize.query<{ id: string; event_type: string; aggregate_id: string; payload: Record<string, unknown> }>(
        `SELECT id, event_type, aggregate_id, payload FROM event_outbox WHERE id = :eventId FOR UPDATE`,
        { replacements: { eventId }, type: QueryTypes.SELECT, transaction }
      );
      if (!event) throw new NotFoundException('Event not found');

      try {
        if (['PublicArticlePublished', 'PremiumArticlePublished'].includes(event.event_type)) {
          await this.consumeWithNotificationWorker(event, transaction);
        }

        if (['PublicArticlePublished', 'PremiumArticlePublished', 'ArticleUpdatedAfterPublication', 'ArticleUnpublished'].includes(event.event_type)) {
          await this.consumeWithSearchWorker(event, transaction);
          await this.consumeWithCacheWorker(event, transaction);
        }

        await this.sequelize.query(`UPDATE event_outbox SET status = 'published', published_at = now(), updated_at = now() WHERE id = :eventId`, {
          replacements: { eventId }, type: QueryTypes.UPDATE, transaction
        });
        return { eventId, eventType: event.event_type, status: 'published' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown event dispatch error';
        await this.sequelize.query(
          `UPDATE event_outbox SET status = 'failed', retry_count = retry_count + 1, next_retry_at = now() + interval '5 minutes', last_error = :message, updated_at = now() WHERE id = :eventId`,
          { replacements: { eventId, message }, type: QueryTypes.UPDATE, transaction }
        );
        return { eventId, eventType: event.event_type, status: 'failed', error: message };
      }
    });
  }

  private async consumeWithNotificationWorker(event: { id: string; event_type: string; aggregate_id: string; payload: Record<string, unknown> }, transaction: Transaction) {
    const consumerName = 'notification-worker';
    const inserted = await this.markInboxProcessing(event.id, consumerName, transaction);
    if (!inserted) return;

    const isPremium = event.event_type === 'PremiumArticlePublished';
    const audienceType = isPremium ? 'active_premium_users' : 'active_registered_users';
    const users = await this.sequelize.query<{ id: string }>(
      isPremium
        ? `SELECT DISTINCT u.id FROM users u INNER JOIN subscriptions s ON s.user_id = u.id WHERE u.status = 'active' AND s.status = 'active' AND s.starts_at <= now() AND s.ends_at > now()`
        : `SELECT DISTINCT u.id FROM users u WHERE u.status = 'active'`,
      { type: QueryTypes.SELECT, transaction }
    );

    const [batch] = await this.sequelize.query<{ id: string }>(
      `INSERT INTO notification_batches (source_event_id, article_id, audience_type, status, total_recipients) VALUES (:eventId, :articleId, :audienceType, 'processing', :totalRecipients) RETURNING id`,
      { replacements: { eventId: event.id, articleId: event.aggregate_id, audienceType, totalRecipients: users.length }, type: QueryTypes.SELECT, transaction }
    );

    for (const user of users) {
      await this.sequelize.query(
        `INSERT INTO notifications (batch_id, user_id, article_id, channel, title, message, status, sent_at) VALUES (:batchId, :userId, :articleId, 'in_app', :title, :message, 'sent', now())`,
        {
          replacements: {
            batchId: batch.id,
            userId: user.id,
            articleId: event.aggregate_id,
            title: isPremium ? 'Nueva nota premium' : 'Nueva noticia pública',
            message: isPremium ? 'Ya está disponible una nueva nota premium.' : 'Ya está disponible una nueva noticia pública.'
          },
          type: QueryTypes.INSERT,
          transaction
        }
      );
    }

    await this.sequelize.query(`UPDATE notification_batches SET status = 'sent', updated_at = now() WHERE id = :batchId`, { replacements: { batchId: batch.id }, type: QueryTypes.UPDATE, transaction });
    await this.markInboxConsumed(event.id, consumerName, transaction);
  }

  private async consumeWithSearchWorker(event: { id: string; event_type: string; aggregate_id: string; payload: Record<string, unknown> }, transaction: Transaction) {
    const consumerName = 'search-index-worker';
    const inserted = await this.markInboxProcessing(event.id, consumerName, transaction);
    if (!inserted) return;
    await this.sequelize.query(
      `
      INSERT INTO search_index_documents (article_id, status, payload, indexed_at)
      VALUES (:articleId, 'indexed', :payload::jsonb, now())
      ON CONFLICT (article_id) DO UPDATE SET status = 'indexed', payload = EXCLUDED.payload, indexed_at = now(), updated_at = now();
      `,
      { replacements: { articleId: event.aggregate_id, payload: JSON.stringify({ sourceEventId: event.id, eventType: event.event_type, payload: event.payload }) }, type: QueryTypes.INSERT, transaction }
    );
    await this.markInboxConsumed(event.id, consumerName, transaction);
  }

  private async consumeWithCacheWorker(event: { id: string; event_type: string; aggregate_id: string }, transaction: Transaction) {
    const consumerName = 'cache-invalidation-worker';
    const inserted = await this.markInboxProcessing(event.id, consumerName, transaction);
    if (!inserted) return;
    const deletedKeys = await this.redisCache.deleteManyByPattern([
      this.redisCache.key('articles', '*'),
      this.redisCache.key('ads', '*'),
      this.redisCache.key('analytics', '*')
    ]);
    await this.sequelize.query(
      `INSERT INTO cache_invalidation_jobs (entity_name, entity_id, reason, status, processed_at) VALUES ('Article', :articleId, :reason, 'processed', now())`,
      { replacements: { articleId: event.aggregate_id, reason: `Event ${event.event_type}; redisDeletedKeys=${deletedKeys}` }, type: QueryTypes.INSERT, transaction }
    );
    await this.markInboxConsumed(event.id, consumerName, transaction);
  }

  private async markInboxProcessing(eventId: string, consumerName: string, transaction: Transaction): Promise<boolean> {
    const [row] = await this.sequelize.query<{ id: string }>(
      `INSERT INTO event_inbox (event_id, consumer_name, status) VALUES (:eventId, :consumerName, 'processing') ON CONFLICT (event_id, consumer_name) DO NOTHING RETURNING id`,
      { replacements: { eventId, consumerName }, type: QueryTypes.SELECT, transaction }
    );
    return Boolean(row);
  }

  private async markInboxConsumed(eventId: string, consumerName: string, transaction: Transaction) {
    await this.sequelize.query(
      `UPDATE event_inbox SET status = 'consumed', processed_at = now(), last_error = null WHERE event_id = :eventId AND consumer_name = :consumerName`,
      { replacements: { eventId, consumerName }, type: QueryTypes.UPDATE, transaction }
    );
  }
}
