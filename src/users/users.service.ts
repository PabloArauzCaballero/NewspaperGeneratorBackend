import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize, Transaction } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';
import { UpdateUserStatusDto } from './users.schemas';

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: Date;
  roles: string[] | null;
  is_premium: boolean;
  subscription_ends_at: Date | null;
};

@Injectable()
export class UsersService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async listUsers() {
    const rows = await this.sequelize.query<UserRow>(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.status,
        u.created_at,
        COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) AS roles,
        EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id AND s.status = 'active' AND s.starts_at <= now() AND s.ends_at > now()
        ) AS is_premium,
        (
          SELECT max(s.ends_at) FROM subscriptions s
          WHERE s.user_id = u.id AND s.status = 'active' AND s.starts_at <= now() AND s.ends_at > now()
        ) AS subscription_ends_at
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.created_at DESC;
      `,
      { type: QueryTypes.SELECT }
    );

    return rows.map((row) => this.toPayload(row));
  }

  async getUser(id: string, transaction?: Transaction) {
    const [row] = await this.sequelize.query<UserRow>(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.status,
        u.created_at,
        COALESCE(array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) AS roles,
        EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = u.id AND s.status = 'active' AND s.starts_at <= now() AND s.ends_at > now()
        ) AS is_premium,
        (
          SELECT max(s.ends_at) FROM subscriptions s
          WHERE s.user_id = u.id AND s.status = 'active' AND s.starts_at <= now() AND s.ends_at > now()
        ) AS subscription_ends_at
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = :id
      GROUP BY u.id
      LIMIT 1;
      `,
      { replacements: { id }, type: QueryTypes.SELECT, transaction }
    );
    if (!row) throw new NotFoundException('User not found');
    return this.toPayload(row);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, actorUserId: string) {
    return this.sequelize.transaction(async (transaction) => {
      await this.assertUserExists(id, transaction);
      const [row] = await this.sequelize.query<{ id: string }>(
        `UPDATE users SET status = :status, updated_at = now() WHERE id = :id RETURNING id`,
        { replacements: { id, status: dto.status }, type: QueryTypes.SELECT, transaction }
      );
      if (!row) throw new NotFoundException('User not found');
      await this.audit(actorUserId, id, 'user.status_updated', { status: dto.status }, transaction);
      return this.getUser(id, transaction);
    });
  }

  async addRole(userId: string, roleName: string, actorUserId: string) {
    return this.sequelize.transaction(async (transaction) => {
      if (roleName === 'admin') {
        const isActorAdmin = await this.userHasRole(actorUserId, 'admin', transaction);
        if (!isActorAdmin) throw new ForbiddenException('Only admins can grant admin role');
      }

      await this.assertUserExists(userId, transaction);
      const [role] = await this.sequelize.query<{ id: string }>('SELECT id FROM roles WHERE name = :roleName LIMIT 1', {
        replacements: { roleName },
        type: QueryTypes.SELECT,
        transaction
      });
      if (!role) throw new NotFoundException('Role not found');

      await this.sequelize.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (:userId, :roleId) ON CONFLICT (user_id, role_id) DO NOTHING`,
        { replacements: { userId, roleId: role.id }, type: QueryTypes.INSERT, transaction }
      );
      await this.audit(actorUserId, userId, 'user.role_added', { roleName }, transaction);
      return this.getUser(userId, transaction);
    });
  }

  async removeRole(userId: string, roleName: string, actorUserId: string) {
    return this.sequelize.transaction(async (transaction) => {
      await this.assertUserExists(userId, transaction);
      const [role] = await this.sequelize.query<{ id: string }>('SELECT id FROM roles WHERE name = :roleName LIMIT 1', {
        replacements: { roleName },
        type: QueryTypes.SELECT,
        transaction
      });
      if (!role) throw new NotFoundException('Role not found');

      await this.sequelize.query('DELETE FROM user_roles WHERE user_id = :userId AND role_id = :roleId', {
        replacements: { userId, roleId: role.id },
        type: QueryTypes.DELETE,
        transaction
      });
      await this.audit(actorUserId, userId, 'user.role_removed', { roleName }, transaction);
      return this.getUser(userId, transaction);
    });
  }

  private async assertUserExists(userId: string, transaction?: Transaction): Promise<void> {
    const [row] = await this.sequelize.query<{ id: string }>(`SELECT id FROM users WHERE id = :userId LIMIT 1`, {
      replacements: { userId },
      type: QueryTypes.SELECT,
      transaction
    });
    if (!row) throw new NotFoundException('User not found');
  }

  private async userHasRole(userId: string, roleName: string, transaction?: Transaction): Promise<boolean> {
    const [row] = await this.sequelize.query<{ id: string }>(
      `
      SELECT r.id
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = :userId AND r.name = :roleName
      LIMIT 1;
      `,
      { replacements: { userId, roleName }, type: QueryTypes.SELECT, transaction }
    );
    return Boolean(row);
  }

  private async audit(actorUserId: string, entityId: string, action: string, metadata: Record<string, unknown>, transaction?: Transaction) {
    await this.sequelize.query(
      `INSERT INTO audit_logs (actor_user_id, entity_name, entity_id, action, metadata) VALUES (:actorUserId, 'User', :entityId, :action, :metadata::jsonb)`,
      { replacements: { actorUserId, entityId, action, metadata: JSON.stringify(metadata) }, type: QueryTypes.INSERT, transaction }
    );
  }

  private toPayload(row: UserRow) {
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      status: row.status,
      roles: row.roles ?? [],
      isPremium: row.is_premium,
      subscriptionEndsAt: row.subscription_ends_at,
      createdAt: row.created_at
    };
  }
}
