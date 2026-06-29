import { Inject, Injectable } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';
import { LoginAttemptsQueryDto, WorkerRunsQueryDto } from './security.schemas';

@Injectable()
export class SecurityAdminService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async listLoginAttempts(query: LoginAttemptsQueryDto) {
    const filters = ['1 = 1'];
    const replacements: Record<string, unknown> = { limit: query.limit, offset: query.offset };
    if (query.email) { filters.push('email = :email'); replacements.email = query.email; }
    if (query.success) { filters.push('success = :success'); replacements.success = query.success === 'true'; }
    return this.sequelize.query(
      `
      SELECT id, email, user_id AS "userId", success, failure_reason AS "failureReason", ip_address AS "ipAddress", user_agent AS "userAgent", created_at AS "createdAt"
      FROM auth_login_attempts
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT :limit OFFSET :offset;
      `,
      { replacements, type: QueryTypes.SELECT }
    );
  }

  async listRefreshTokens(userId: string) {
    return this.sequelize.query(
      `
      SELECT id, user_id AS "userId", expires_at AS "expiresAt", revoked_at AS "revokedAt", created_by_ip AS "createdByIp", last_used_at AS "lastUsedAt", created_at AS "createdAt"
      FROM user_refresh_tokens
      WHERE user_id = :userId
      ORDER BY created_at DESC
      LIMIT 100;
      `,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
  }

  async revokeRefreshTokens(userId: string, actorUserId: string) {
    return this.sequelize.transaction(async (transaction) => {
      const [user] = await this.sequelize.query<{ id: string }>(`SELECT id FROM users WHERE id = :userId LIMIT 1`, {
        replacements: { userId }, type: QueryTypes.SELECT, transaction
      });
      if (!user) return { userId, revoked: 0 };

      const [, affected] = await this.sequelize.query(
        `UPDATE user_refresh_tokens SET revoked_at = now() WHERE user_id = :userId AND revoked_at IS NULL`,
        { replacements: { userId }, type: QueryTypes.UPDATE, transaction }
      );
      await this.sequelize.query(
        `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, metadata) VALUES (:actorUserId, 'User', :userId, 'auth.refresh_tokens_revoked', jsonb_build_object('affected', :affected))`,
        { replacements: { actorUserId, userId, affected: Number(affected) || 0 }, type: QueryTypes.INSERT, transaction }
      );
      return { userId, revoked: Number(affected) || 0 };
    });
  }

  async listWorkerRuns(query: WorkerRunsQueryDto) {
    const filters = ['1 = 1'];
    const replacements: Record<string, unknown> = { limit: query.limit, offset: query.offset };
    if (query.workerName) { filters.push('worker_name = :workerName'); replacements.workerName = query.workerName; }
    if (query.status) { filters.push('status = :status'); replacements.status = query.status; }
    return this.sequelize.query(
      `
      SELECT id, worker_name AS "workerName", lock_key AS "lockKey", status, processed_count AS "processedCount", failed_count AS "failedCount", started_at AS "startedAt", finished_at AS "finishedAt", error_message AS "errorMessage", metadata
      FROM worker_runs
      WHERE ${filters.join(' AND ')}
      ORDER BY started_at DESC
      LIMIT :limit OFFSET :offset;
      `,
      { replacements, type: QueryTypes.SELECT }
    );
  }
}
