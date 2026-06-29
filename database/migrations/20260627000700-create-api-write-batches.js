'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS api_write_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id bigint NOT NULL UNIQUE,
        batch_source varchar(80) NOT NULL DEFAULT 'database_trigger',
        batch_type varchar(120) NOT NULL DEFAULT 'implicit_transaction',
        status varchar(40) NOT NULL DEFAULT 'succeeded',
        actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        endpoint varchar(220),
        http_method varchar(20),
        aggregate_type varchar(120),
        aggregate_id uuid,
        affected_tables jsonb NOT NULL DEFAULT '[]'::jsonb,
        item_count integer NOT NULL DEFAULT 0,
        started_at timestamptz NOT NULL DEFAULT now(),
        finished_at timestamptz NOT NULL DEFAULT now(),
        duration_ms integer,
        error_message text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT api_write_batches_status_check CHECK (status IN ('started', 'succeeded', 'failed', 'rolled_back')),
        CONSTRAINT api_write_batches_item_count_check CHECK (item_count >= 0),
        CONSTRAINT api_write_batches_duration_check CHECK (duration_ms IS NULL OR duration_ms >= 0)
      );

      CREATE TABLE IF NOT EXISTS api_write_batch_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id uuid NOT NULL REFERENCES api_write_batches(id) ON DELETE CASCADE,
        transaction_id bigint NOT NULL,
        table_name varchar(120) NOT NULL,
        action varchar(16) NOT NULL,
        record_id uuid,
        ordinal integer NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT api_write_batch_items_action_check CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
        CONSTRAINT api_write_batch_items_ordinal_check CHECK (ordinal > 0)
      );

      CREATE INDEX IF NOT EXISTS idx_api_write_batches_started ON api_write_batches(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_api_write_batches_source ON api_write_batches(batch_source, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_api_write_batches_type ON api_write_batches(batch_type, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_api_write_batch_items_batch ON api_write_batch_items(batch_id, ordinal);
      CREATE INDEX IF NOT EXISTS idx_api_write_batch_items_table ON api_write_batch_items(table_name, action, created_at DESC);

      CREATE OR REPLACE FUNCTION ensure_api_write_batch()
      RETURNS uuid AS $$
      DECLARE
        v_transaction_id bigint := txid_current();
        v_batch_id uuid;
      BEGIN
        INSERT INTO api_write_batches (transaction_id, batch_source, batch_type, status, started_at, finished_at, metadata)
        VALUES (v_transaction_id, 'database_trigger', 'implicit_transaction', 'succeeded', now(), now(), jsonb_build_object('txid', v_transaction_id))
        ON CONFLICT (transaction_id)
        DO UPDATE SET finished_at = now()
        RETURNING id INTO v_batch_id;

        RETURN v_batch_id;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION record_api_write_batch_item()
      RETURNS trigger AS $$
      DECLARE
        v_batch_id uuid;
        v_record_id uuid;
        v_next_ordinal integer;
        v_transaction_id bigint := txid_current();
      BEGIN
        v_batch_id := ensure_api_write_batch();

        IF TG_OP = 'DELETE' THEN
          v_record_id := OLD.id;
        ELSE
          v_record_id := NEW.id;
        END IF;

        SELECT COALESCE(MAX(ordinal), 0) + 1
        INTO v_next_ordinal
        FROM api_write_batch_items
        WHERE batch_id = v_batch_id;

        INSERT INTO api_write_batch_items (batch_id, transaction_id, table_name, action, record_id, ordinal, metadata)
        VALUES (
          v_batch_id,
          v_transaction_id,
          TG_TABLE_NAME,
          TG_OP,
          v_record_id,
          v_next_ordinal,
          jsonb_build_object('schema', TG_TABLE_SCHEMA, 'trigger', TG_NAME)
        );

        UPDATE api_write_batches
        SET
          item_count = item_count + 1,
          finished_at = now(),
          affected_tables = (
            SELECT COALESCE(jsonb_agg(table_name ORDER BY table_name), '[]'::jsonb)
            FROM (
              SELECT DISTINCT table_name
              FROM api_write_batch_items
              WHERE batch_id = v_batch_id
            ) AS distinct_tables
          )
        WHERE id = v_batch_id;

        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DO $$
      DECLARE
        v_table text;
        v_tables text[] := ARRAY[
          'roles',
          'permissions',
          'role_permissions',
          'users',
          'user_roles',
          'subscription_plans',
          'subscriptions',
          'payment_transactions',
          'categories',
          'tags',
          'articles',
          'article_revisions',
          'article_tags',
          'media_assets',
          'article_media',
          'comments',
          'reactions',
          'comment_moderation_logs',
          'advertisements',
          'advertisement_category_targets',
          'advertisement_impressions',
          'event_outbox',
          'event_inbox',
          'payment_webhook_events',
          'user_notification_preferences',
          'notification_batches',
          'notifications',
          'audit_logs',
          'article_views',
          'search_index_documents',
          'cache_invalidation_jobs',
          'database_backup_runs',
          'user_refresh_tokens',
          'password_reset_tokens',
          'auth_login_attempts',
          'worker_runs'
        ];
      BEGIN
        FOREACH v_table IN ARRAY v_tables LOOP
          IF to_regclass(v_table) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_api_write_batch_%I ON %I', v_table, v_table);
            EXECUTE format(
              'CREATE TRIGGER trg_api_write_batch_%I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION record_api_write_batch_item()',
              v_table,
              v_table
            );
          END IF;
        END LOOP;
      END $$;

      WITH baseline_batch AS (
        INSERT INTO api_write_batches (
          transaction_id,
          batch_source,
          batch_type,
          status,
          endpoint,
          http_method,
          aggregate_type,
          affected_tables,
          item_count,
          metadata
        )
        VALUES (
          txid_current(),
          'migration',
          'schema_installation',
          'succeeded',
          'database/migrations/20260627000700-create-api-write-batches.js',
          'MIGRATION',
          'ApiWriteBatch',
          '["api_write_batches", "api_write_batch_items"]'::jsonb,
          2,
          jsonb_build_object('purpose', 'baseline batch record so existing seeded databases can validate batch observability immediately')
        )
        ON CONFLICT (transaction_id) DO UPDATE SET
          batch_source = EXCLUDED.batch_source,
          batch_type = EXCLUDED.batch_type,
          endpoint = EXCLUDED.endpoint,
          http_method = EXCLUDED.http_method,
          aggregate_type = EXCLUDED.aggregate_type,
          affected_tables = EXCLUDED.affected_tables,
          item_count = GREATEST(api_write_batches.item_count, EXCLUDED.item_count),
          metadata = api_write_batches.metadata || EXCLUDED.metadata
        RETURNING id
      )
      INSERT INTO api_write_batch_items (batch_id, transaction_id, table_name, action, record_id, ordinal, metadata)
      SELECT id, txid_current(), 'api_write_batches', 'INSERT', id, 1, jsonb_build_object('source', 'migration_baseline')
      FROM baseline_batch
      UNION ALL
      SELECT id, txid_current(), 'api_write_batch_items', 'INSERT', id, 2, jsonb_build_object('source', 'migration_baseline')
      FROM baseline_batch;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        v_table text;
        v_tables text[] := ARRAY[
          'roles',
          'permissions',
          'role_permissions',
          'users',
          'user_roles',
          'subscription_plans',
          'subscriptions',
          'payment_transactions',
          'categories',
          'tags',
          'articles',
          'article_revisions',
          'article_tags',
          'media_assets',
          'article_media',
          'comments',
          'reactions',
          'comment_moderation_logs',
          'advertisements',
          'advertisement_category_targets',
          'advertisement_impressions',
          'event_outbox',
          'event_inbox',
          'payment_webhook_events',
          'user_notification_preferences',
          'notification_batches',
          'notifications',
          'audit_logs',
          'article_views',
          'search_index_documents',
          'cache_invalidation_jobs',
          'database_backup_runs',
          'user_refresh_tokens',
          'password_reset_tokens',
          'auth_login_attempts',
          'worker_runs'
        ];
      BEGIN
        FOREACH v_table IN ARRAY v_tables LOOP
          IF to_regclass(v_table) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_api_write_batch_%I ON %I', v_table, v_table);
          END IF;
        END LOOP;
      END $$;

      DROP FUNCTION IF EXISTS record_api_write_batch_item();
      DROP FUNCTION IF EXISTS ensure_api_write_batch();
      DROP TABLE IF EXISTS api_write_batch_items;
      DROP TABLE IF EXISTS api_write_batches;
    `);
  }
};
