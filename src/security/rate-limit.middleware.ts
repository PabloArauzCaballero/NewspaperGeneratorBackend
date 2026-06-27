import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { RedisCacheService } from '../cache/redis-cache.service';

type MemoryBucket = { count: number; expiresAt: number };

type RateLimitProfile = {
  name: string;
  windowSeconds: number;
  max: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();

function getIp(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function profileFor(request: Request, configService: ConfigService): RateLimitProfile | null {
  if (request.method === 'OPTIONS') return null;
  if (request.path.includes('/docs') || request.path.endsWith('/health') || request.path.endsWith('/health/live')) return null;

  const loginMax = configService.get<number>('RATE_LIMIT_AUTH_MAX', 8);
  const writeMax = configService.get<number>('RATE_LIMIT_WRITE_MAX', 80);
  const readMax = configService.get<number>('RATE_LIMIT_READ_MAX', 300);
  const windowSeconds = configService.get<number>('RATE_LIMIT_WINDOW_SECONDS', 60);

  if (request.path.endsWith('/auth/login') || request.path.endsWith('/auth/register') || request.path.endsWith('/auth/refresh')) {
    return { name: 'auth', windowSeconds, max: loginMax };
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return { name: 'write', windowSeconds, max: writeMax };
  }
  return { name: 'read', windowSeconds, max: readMax };
}

function incrementMemory(key: string, windowSeconds: number): number {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    memoryBuckets.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return 1;
  }
  current.count += 1;
  return current.count;
}

export function createRateLimitMiddleware(configService: ConfigService, redisCache: RedisCacheService) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    if (configService.get<string>('RATE_LIMIT_ENABLED', 'true') !== 'true') {
      next();
      return;
    }

    const profile = profileFor(request, configService);
    if (!profile) {
      next();
      return;
    }

    const identity = hash(`${getIp(request)}:${request.headers['user-agent'] ?? 'unknown'}`);
    const key = redisCache.key('rate-limit', profile.name, identity);
    const count = await redisCache.increment(key, profile.windowSeconds, () => incrementMemory(key, profile.windowSeconds));

    response.setHeader('X-RateLimit-Limit', String(profile.max));
    response.setHeader('X-RateLimit-Remaining', String(Math.max(profile.max - count, 0)));
    response.setHeader('X-RateLimit-Window-Seconds', String(profile.windowSeconds));

    if (count > profile.max) {
      response.status(429).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Retry after the current window.',
        requestId: response.getHeader('x-request-id') ?? null,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
}
