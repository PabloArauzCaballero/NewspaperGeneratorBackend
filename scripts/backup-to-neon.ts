import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Sequelize, QueryTypes } from 'sequelize';
import 'dotenv/config';

const execFileAsync = promisify(execFile);

type BackupRun = {
  id: string;
  startedAt: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertDifferentDatabases(sourceUrl: string, targetUrl: string) {
  const source = new URL(sourceUrl);
  const target = new URL(targetUrl);
  const sameHost = source.hostname === target.hostname;
  const sameDatabase = source.pathname === target.pathname;
  const sameUser = source.username === target.username;
  if (sourceUrl === targetUrl || (sameHost && sameDatabase && sameUser)) {
    throw new Error('Refusing to back up into the same database. DATABASE_URL and NEON_BACKUP_DATABASE_URL must be different projects/databases.');
  }
}

function sequelizeFor(databaseUrl: string): Sequelize {
  return new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: databaseUrl.includes('sslmode=require') || process.env.DATABASE_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : undefined
    }
  });
}

async function maybeStartRun(source: Sequelize): Promise<BackupRun | null> {
  try {
    const [row] = await source.query<{ id: string }>(
      `INSERT INTO database_backup_runs (source_label, target_label, status, mode) VALUES ('primary', 'neon_backup', 'started', 'pg_dump_custom_restore') RETURNING id`,
      { type: QueryTypes.SELECT }
    );
    return { id: row.id, startedAt: Date.now() };
  } catch {
    return null;
  }
}

async function maybeFinishRun(source: Sequelize, run: BackupRun | null, payload: { status: 'succeeded' | 'failed'; dumpFilePath?: string; dumpSizeBytes?: number; checksumSha256?: string; errorMessage?: string }) {
  if (!run) return;
  try {
    await source.query(
      `
      UPDATE database_backup_runs
      SET status = :status,
          dump_file_path = :dumpFilePath,
          dump_size_bytes = :dumpSizeBytes,
          checksum_sha256 = :checksumSha256,
          error_message = :errorMessage,
          duration_ms = :durationMs,
          finished_at = now()
      WHERE id = :id
      `,
      {
        replacements: {
          id: run.id,
          status: payload.status,
          dumpFilePath: payload.dumpFilePath ?? null,
          dumpSizeBytes: payload.dumpSizeBytes ?? null,
          checksumSha256: payload.checksumSha256 ?? null,
          errorMessage: payload.errorMessage ?? null,
          durationMs: Date.now() - run.startedAt
        },
        type: QueryTypes.UPDATE
      }
    );
  } catch {
    // Do not fail the backup just because operational logging failed.
  }
}

async function command(name: string, args: string[]) {
  const { stdout, stderr } = await execFileAsync(name, args, {
    maxBuffer: 1024 * 1024 * 32,
    env: process.env
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
}

async function checksumSha256(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  const sourceUrl = requiredEnv('DATABASE_URL');
  const targetUrl = requiredEnv('NEON_BACKUP_DATABASE_URL');
  assertDifferentDatabases(sourceUrl, targetUrl);

  const pgDumpBin = process.env.NEON_BACKUP_PG_DUMP_BIN || 'pg_dump';
  const pgRestoreBin = process.env.NEON_BACKUP_PG_RESTORE_BIN || 'pg_restore';
  const psqlBin = process.env.NEON_BACKUP_PSQL_BIN || 'psql';
  const backupDir = path.resolve(process.env.BACKUP_FILE_DIR || './backups');
  const keepLocalFile = process.env.BACKUP_KEEP_LOCAL_FILES === 'true';
  const dropTargetBeforeRestore = process.env.NEON_BACKUP_DROP_TARGET_BEFORE_RESTORE === 'true';

  await fs.mkdir(backupDir, { recursive: true });
  const dumpFilePath = path.join(backupDir, `newspaper-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
  const source = sequelizeFor(sourceUrl);
  const target = sequelizeFor(targetUrl);
  let run: BackupRun | null = null;

  try {
    await source.authenticate();
    await target.authenticate();
    run = await maybeStartRun(source);

    await command(pgDumpBin, [
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--verbose',
      '--file',
      dumpFilePath,
      sourceUrl
    ]);

    if (dropTargetBeforeRestore) {
      await command(psqlBin, [targetUrl, '-v', 'ON_ERROR_STOP=1', '-c', 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;']);
    }

    await command(pgRestoreBin, [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--verbose',
      '--dbname',
      targetUrl,
      dumpFilePath
    ]);

    const stats = await fs.stat(dumpFilePath);
    const checksum = await checksumSha256(dumpFilePath);
    const [targetCheck] = await target.query<{ users: string; articles: string; outbox_events: string }>(
      `SELECT (SELECT count(*) FROM users)::text AS users, (SELECT count(*) FROM articles)::text AS articles, (SELECT count(*) FROM event_outbox)::text AS outbox_events`,
      { type: QueryTypes.SELECT }
    );

    await maybeFinishRun(source, run, {
      status: 'succeeded',
      dumpFilePath,
      dumpSizeBytes: stats.size,
      checksumSha256: checksum
    });

    if (!keepLocalFile) {
      await fs.rm(dumpFilePath, { force: true });
    }

    console.log('Neon backup OK', {
      targetCounts: targetCheck,
      dumpSizeBytes: stats.size,
      checksumSha256: checksum,
      localFileKept: keepLocalFile ? dumpFilePath : false,
      host: os.hostname()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backup error';
    await maybeFinishRun(source, run, { status: 'failed', dumpFilePath, errorMessage: message });
    throw error;
  } finally {
    await source.close().catch(() => undefined);
    await target.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
