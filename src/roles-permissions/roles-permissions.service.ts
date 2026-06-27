import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';
import { CreatePermissionDto } from './roles-permissions.schemas';

@Injectable()
export class RolesPermissionsService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async listRoles() {
    const rows = await this.sequelize.query<{ id: string; name: string; description: string | null; permissions: string[] | null }>(
      `
      SELECT r.id, r.name, r.description,
             COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), ARRAY[]::text[]) AS permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id
      ORDER BY r.name ASC;
      `,
      { type: QueryTypes.SELECT }
    );
    return rows.map((row) => ({ id: row.id, name: row.name, description: row.description, permissions: row.permissions ?? [] }));
  }

  async listPermissions() {
    return this.sequelize.query(
      `SELECT id, code, module, description, created_at AS "createdAt" FROM permissions ORDER BY module ASC, code ASC`,
      { type: QueryTypes.SELECT }
    );
  }

  async createPermission(dto: CreatePermissionDto) {
    try {
      const [row] = await this.sequelize.query(
        `
        INSERT INTO permissions (code, module, description)
        VALUES (:code, :module, :description)
        RETURNING id, code, module, description, created_at AS "createdAt";
        `,
        { replacements: { code: dto.code, module: dto.module, description: dto.description ?? null }, type: QueryTypes.SELECT }
      );
      return row;
    } catch (error) {
      throw new ConflictException('Permission already exists');
    }
  }

  async assignPermission(roleName: string, permissionCode: string) {
    const [role] = await this.sequelize.query<{ id: string }>('SELECT id FROM roles WHERE name = :roleName LIMIT 1', {
      replacements: { roleName },
      type: QueryTypes.SELECT
    });
    if (!role) throw new NotFoundException('Role not found');

    const [permission] = await this.sequelize.query<{ id: string }>('SELECT id FROM permissions WHERE code = :permissionCode LIMIT 1', {
      replacements: { permissionCode },
      type: QueryTypes.SELECT
    });
    if (!permission) throw new NotFoundException('Permission not found');

    await this.sequelize.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES (:roleId, :permissionId) ON CONFLICT (role_id, permission_id) DO NOTHING`,
      { replacements: { roleId: role.id, permissionId: permission.id }, type: QueryTypes.INSERT }
    );
    return this.listRoles();
  }

  async removePermission(roleName: string, permissionCode: string) {
    await this.sequelize.query(
      `
      DELETE FROM role_permissions rp
      USING roles r, permissions p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND r.name = :roleName
        AND p.code = :permissionCode;
      `,
      { replacements: { roleName, permissionCode }, type: QueryTypes.DELETE }
    );
    return this.listRoles();
  }
}
