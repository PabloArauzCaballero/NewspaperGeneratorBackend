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

  async listWriteBatches() {
    return this.sequelize.query(
      `
      SELECT
        wb.id,
        wb.transaction_id AS "transactionId",
        wb.batch_source AS "batchSource",
        wb.batch_type AS "batchType",
        wb.status,
        wb.endpoint,
        wb.http_method AS "httpMethod",
        wb.aggregate_type AS "aggregateType",
        wb.aggregate_id AS "aggregateId",
        wb.affected_tables AS "affectedTables",
        wb.item_count AS "itemCount",
        wb.started_at AS "startedAt",
        wb.finished_at AS "finishedAt",
        wb.metadata,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', wbi.id,
              'tableName', wbi.table_name,
              'action', wbi.action,
              'recordId', wbi.record_id,
              'ordinal', wbi.ordinal,
              'createdAt', wbi.created_at
            ) ORDER BY wbi.ordinal
          ) FILTER (WHERE wbi.id IS NOT NULL),
          '[]'::jsonb
        ) AS items
      FROM api_write_batches wb
      LEFT JOIN api_write_batch_items wbi ON wbi.batch_id = wb.id
      GROUP BY wb.id
      ORDER BY wb.started_at DESC
      LIMIT 150;
      `,
      { type: QueryTypes.SELECT }
    );
  }

}
