import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import crypto from 'node:crypto';

export type RedisHealth = {
  status: 'ok' | 'disabled' | 'error';
  latencyMs?: number;
  message?: string;
};

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis | null;
  private readonly prefix: string;
  private readonly defaultTtlSeconds: number;

  constructor(@Optional() @Inject(ConfigService) private readonly configService?: ConfigService) {
    const redisUrl = this.configService?.get<string>('REDIS_URL') ?? process.env.REDIS_URL;
    this.prefix = this.normalizePart(this.configService?.get<string>('CACHE_PREFIX', 'newspaper') ?? process.env.CACHE_PREFIX ?? 'newspaper');
    this.defaultTtlSeconds = Number(this.configService?.get<number>('CACHE_TTL_SECONDS', 300) ?? process.env.CACHE_TTL_SECONDS ?? 300);

    this.client = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: 2000,
          commandTimeout: 2500
        })
      : null;

    this.client?.on('error', (error) => {
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  key(...parts: Array<string | number | boolean | null | undefined>): string {
    const cleanParts = parts
      .filter((part) => part !== null && part !== undefined && String(part).length > 0)
      .map((part) => this.normalizePart(String(part)));
    return [this.prefix, ...cleanParts].join(':');
  }

  stableHash(value: unknown): string {
    return crypto.createHash('sha256').update(this.stableStringify(value)).digest('hex').slice(0, 24);
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.warn(`Redis get failed for ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds = this.defaultTtlSeconds): Promise<void> {
    if (!this.client || ttlSeconds <= 0) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Redis set failed for ${key}: ${(error as Error).message}`);
    }
  }

  async delete(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis delete failed for ${key}: ${(error as Error).message}`);
      return 0;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.client) return 0;
    let deleted = 0;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 250);
        cursor = nextCursor;
        if (keys.length > 0) {
          deleted += await this.client.del(...keys);
        }
      } while (cursor !== '0');
      return deleted;
    } catch (error) {
      this.logger.warn(`Redis pattern delete failed for ${pattern}: ${(error as Error).message}`);
      return deleted;
    }
  }

  async deleteManyByPattern(patterns: string[]): Promise<number> {
    let total = 0;
    for (const pattern of patterns) {
      total += await this.deleteByPattern(pattern);
    }
    return total;
  }

  async rememberJson<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.setJson(key, value, ttlSeconds);
    return value;
  }


  async increment(key: string, ttlSeconds: number, fallback?: () => number): Promise<number> {
    if (!this.client) return fallback ? fallback() : 1;
    try {
      await this.ensureConnected();
      const value = await this.client.incr(key);
      if (value === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      this.logger.warn(`Redis increment failed for ${key}: ${(error as Error).message}`);
      return fallback ? fallback() : 1;
    }
  }

  async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.ensureConnected();
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.warn(`Redis lock failed for ${key}: ${(error as Error).message}`);
      return false;
    }
  }

  async getString(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      await this.ensureConnected();
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(`Redis get string failed for ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  async releaseLock(key: string, expectedValue: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.ensureConnected();
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.client.eval(script, 1, key, expectedValue);
      return result === 1;
    } catch (error) {
      this.logger.warn(`Redis release lock failed for ${key}: ${(error as Error).message}`);
      return false;
    }
  }

  async ping(): Promise<RedisHealth> {
    if (!this.client) return { status: 'disabled', message: 'REDIS_URL is not configured' };
    const startedAt = Date.now();
    try {
      if (this.client.status === 'wait') {
        await this.client.connect();
      }
      const response = await this.client.ping();
      return response === 'PONG'
        ? { status: 'ok', latencyMs: Date.now() - startedAt }
        : { status: 'error', latencyMs: Date.now() - startedAt, message: `Unexpected Redis response: ${response}` };
    } catch (error) {
      return { status: 'error', latencyMs: Date.now() - startedAt, message: (error as Error).message };
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }


  private async ensureConnected(): Promise<void> {
    if (this.client && this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  private normalizePart(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_+/g, '_').toLowerCase();
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => `${JSON.stringify(key)}:${this.stableStringify(item)}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }
}
