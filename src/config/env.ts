import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().min(1).default('NewspaperGeneratorBackend'),
  API_PREFIX: z.string().min(1).default('api/v1'),
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(14).default(10),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string().url().optional(),
  CACHE_PREFIX: z.string().min(1).default('newspaper'),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(86400).default(300),
  NEON_BACKUP_DATABASE_URL: z.string().url().optional(),
  BACKUP_FILE_DIR: z.string().min(1).default('./backups'),
  BACKUP_KEEP_LOCAL_FILES: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  NEON_BACKUP_DROP_TARGET_BEFORE_RESTORE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).default('true'),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(5).max(3600).default(60),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).max(1000).default(8),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().int().min(1).max(5000).default(80),
  RATE_LIMIT_READ_MAX: z.coerce.number().int().min(1).max(10000).default(300),
  WORKER_EVENTS_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(25),
  WORKER_EVENTS_INTERVAL_MS: z.coerce.number().int().min(500).max(60000).default(5000),
  WORKER_LOCK_TTL_SECONDS: z.coerce.number().int().min(5).max(300).default(45)
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function getCorsOrigins(rawOrigins: string | undefined): string[] {
  return (rawOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
