'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(120) NOT NULL UNIQUE,
        module varchar(80) NOT NULL,
        description varchar(255),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider varchar(80) NOT NULL,
        external_event_id varchar(180) NOT NULL,
        event_type varchar(120) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        status varchar(40) NOT NULL DEFAULT 'received',
        processed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT payment_webhook_events_status_check CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
        UNIQUE (provider, external_event_id)
      );

      CREATE TABLE IF NOT EXISTS article_views (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        visitor_hash varchar(160),
        user_agent text,
        ip_address inet,
        viewed_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS search_index_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        status varchar(40) NOT NULL DEFAULT 'pending',
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        indexed_at timestamptz,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT search_index_status_check CHECK (status IN ('pending', 'indexed', 'failed', 'disabled')),
        UNIQUE (article_id)
      );

      CREATE TABLE IF NOT EXISTS cache_invalidation_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_name varchar(120) NOT NULL,
        entity_id uuid,
        reason text NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'pending',
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz,
        CONSTRAINT cache_invalidation_status_check CHECK (status IN ('pending', 'processed', 'failed', 'ignored'))
      );

      CREATE INDEX IF NOT EXISTS idx_article_views_article ON article_views(article_id, viewed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_provider_event ON payment_webhook_events(provider, external_event_id);
      CREATE INDEX IF NOT EXISTS idx_search_index_documents_status ON search_index_documents(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_cache_invalidation_jobs_status ON cache_invalidation_jobs(status, created_at DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS cache_invalidation_jobs;
      DROP TABLE IF EXISTS search_index_documents;
      DROP TABLE IF EXISTS article_views;
      DROP TABLE IF EXISTS payment_webhook_events;
      DROP TABLE IF EXISTS role_permissions;
      DROP TABLE IF EXISTS permissions;
    `);
  }
};
