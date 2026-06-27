import { Inject, Injectable } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { RedisCacheService } from '../cache/redis-cache.service';
import { SEQUELIZE } from '../database/database.constants';

@Injectable()
export class HealthService {
  constructor(
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    private readonly redisCache: RedisCacheService
  ) {}

  live() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() };
  }

  async ready() {
    const startedAt = Date.now();
    const [result] = await this.sequelize.query<{ ok: number }>('SELECT 1 AS ok', { type: QueryTypes.SELECT });
    const redis = await this.redisCache.ping();
    return {
      status: result?.ok === 1 && redis.status !== 'error' ? 'ok' : 'degraded',
      database: result?.ok === 1 ? 'ok' : 'unknown',
      redis,
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString()
    };
  }

  async check() {
    return this.ready();
  }
}
