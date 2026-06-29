import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { RedisCacheService } from '../cache/redis-cache.service';
import { SEQUELIZE } from '../database/database.constants';
import { InvalidateCacheDto } from './cache-invalidation.schemas';

@Injectable()
export class CacheInvalidationService {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    private readonly redisCache: RedisCacheService
  ) {}

  async listJobs() {
    return this.sequelize.query(
      `SELECT id, entity_name AS "entityName", entity_id AS "entityId", reason, status, created_by_user_id AS "createdByUserId", created_at AS "createdAt", processed_at AS "processedAt" FROM cache_invalidation_jobs ORDER BY created_at DESC LIMIT 200`,
      { type: QueryTypes.SELECT }
    );
  }

  async invalidateArticle(articleId: string, dto: InvalidateCacheDto, userId: string) {
    const [article] = await this.sequelize.query<{ id: string }>(`SELECT id FROM articles WHERE id = :articleId LIMIT 1`, {
      replacements: { articleId }, type: QueryTypes.SELECT
    });
    if (!article) throw new NotFoundException('Article not found');

    const deletedKeys = await this.redisCache.deleteManyByPattern([
      this.redisCache.key('articles', '*'),
      this.redisCache.key('ads', '*'),
      this.redisCache.key('analytics', '*')
    ]);
    const [row] = await this.sequelize.query(
      `INSERT INTO cache_invalidation_jobs (entity_name, entity_id, reason, status, created_by_user_id, processed_at) VALUES ('Article', :articleId, :reason, 'processed', :userId, now()) RETURNING id, entity_name AS "entityName", entity_id AS "entityId", reason, status, processed_at AS "processedAt"`,
      { replacements: { articleId, reason: `${dto.reason} | redisDeletedKeys=${deletedKeys}`, userId }, type: QueryTypes.SELECT }
    );
    return { ...row, redis: { enabled: this.redisCache.enabled, deletedKeys } };
  }
}
