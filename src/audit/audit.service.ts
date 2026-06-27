import { Inject, Injectable } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { SEQUELIZE } from '../database/database.constants';

@Injectable()
export class AuditService {
  constructor(@Inject(SEQUELIZE) private readonly sequelize: Sequelize) {}

  async list() {
    return this.sequelize.query(
      `
      SELECT al.id, al.actor_user_id AS "actorUserId", u.full_name AS "actorFullName", al.entity_name AS "entityName",
             al.entity_id AS "entityId", al.action, al.metadata, al.created_at AS "createdAt"
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_user_id
      ORDER BY al.created_at DESC
      LIMIT 300;
      `,
      { type: QueryTypes.SELECT }
    );
  }
}
