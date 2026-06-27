'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(80) NOT NULL UNIQUE,
        description varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name varchar(180) NOT NULL,
        email varchar(220) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_status_check CHECK (status IN ('active', 'pending_verification', 'suspended', 'blocked', 'deleted'))
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, role_id)
      );

      CREATE TABLE IF NOT EXISTS subscription_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        description text,
        price numeric(12,2) NOT NULL DEFAULT 0,
        currency varchar(12) NOT NULL DEFAULT 'BOB',
        duration_days integer NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT subscription_plans_duration_check CHECK (duration_days > 0),
        CONSTRAINT subscription_plans_price_check CHECK (price >= 0)
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        status varchar(40) NOT NULL,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        cancelled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment', 'payment_failed')),
        CONSTRAINT subscriptions_dates_check CHECK (ends_at > starts_at)
      );

      CREATE TABLE IF NOT EXISTS payment_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        provider varchar(80) NOT NULL,
        external_reference varchar(160) UNIQUE,
        amount numeric(12,2) NOT NULL,
        currency varchar(12) NOT NULL DEFAULT 'BOB',
        status varchar(40) NOT NULL,
        paid_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT payment_transactions_status_check CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
        CONSTRAINT payment_transactions_amount_check CHECK (amount >= 0)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        slug varchar(140) NOT NULL UNIQUE,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS articles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        title varchar(220) NOT NULL,
        slug varchar(240) NOT NULL UNIQUE,
        summary text NOT NULL,
        body text NOT NULL,
        audio_transcript text,
        article_type varchar(40) NOT NULL DEFAULT 'news',
        access_type varchar(40) NOT NULL DEFAULT 'public',
        status varchar(40) NOT NULL DEFAULT 'draft',
        comments_enabled boolean NOT NULL DEFAULT true,
        reactions_enabled boolean NOT NULL DEFAULT true,
        published_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT articles_article_type_check CHECK (article_type IN ('news', 'opinion', 'interview', 'report', 'analysis')),
        CONSTRAINT articles_access_type_check CHECK (access_type IN ('public', 'premium', 'internal_only')),
        CONSTRAINT articles_status_check CHECK (status IN ('draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'unpublished', 'archived')),
        CONSTRAINT articles_published_at_check CHECK ((status = 'published' AND published_at IS NOT NULL) OR status <> 'published')
      );

      CREATE TABLE IF NOT EXISTS article_revisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        edited_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title_snapshot varchar(220) NOT NULL,
        body_snapshot text NOT NULL,
        change_reason text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(80) NOT NULL,
        slug varchar(100) NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS article_tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE (article_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS media_assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        uploaded_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        media_type varchar(40) NOT NULL,
        url text NOT NULL,
        caption varchar(220),
        alt_text varchar(220),
        mime_type varchar(120) NOT NULL,
        size_bytes bigint NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT media_assets_type_check CHECK (media_type IN ('image', 'video', 'audio', 'document')),
        CONSTRAINT media_assets_size_check CHECK (size_bytes >= 0)
      );

      CREATE TABLE IF NOT EXISTS article_media (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        media_asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
        display_order integer NOT NULL DEFAULT 0,
        is_cover boolean NOT NULL DEFAULT false,
        UNIQUE (article_id, media_asset_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
        content text NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'pending_moderation',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT comments_status_check CHECK (status IN ('pending_moderation', 'approved', 'rejected', 'hidden')),
        CONSTRAINT comments_content_not_blank CHECK (length(trim(content)) > 0)
      );

      CREATE TABLE IF NOT EXISTS reactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction_type varchar(40) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT reactions_type_check CHECK (reaction_type IN ('like', 'love', 'interesting', 'concerned')),
        UNIQUE (article_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS comment_moderation_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        moderator_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        previous_status varchar(40) NOT NULL,
        new_status varchar(40) NOT NULL,
        reason text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS advertisement_placements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(80) NOT NULL UNIQUE,
        name varchar(120) NOT NULL,
        description text,
        allowed_context varchar(40) NOT NULL DEFAULT 'public_articles',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT advertisement_placements_context_check CHECK (allowed_context IN ('public_articles', 'home', 'category_listing'))
      );

      CREATE TABLE IF NOT EXISTS advertisements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        placement_id uuid NOT NULL REFERENCES advertisement_placements(id) ON DELETE RESTRICT,
        title varchar(160) NOT NULL,
        image_url text NOT NULL,
        target_url text NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'draft',
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT advertisements_status_check CHECK (status IN ('draft', 'active', 'paused', 'ended', 'rejected')),
        CONSTRAINT advertisements_dates_check CHECK (ends_at > starts_at),
        CONSTRAINT advertisements_no_popup CHECK (position('popup' IN lower(title)) = 0)
      );

      CREATE TABLE IF NOT EXISTS advertisement_category_targets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        advertisement_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE (advertisement_id, category_id)
      );

      CREATE TABLE IF NOT EXISTS advertisement_impressions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        advertisement_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        rendered_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS event_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type varchar(120) NOT NULL,
        aggregate_type varchar(120) NOT NULL,
        aggregate_id uuid NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        status varchar(40) NOT NULL DEFAULT 'pending',
        correlation_id uuid NOT NULL,
        causation_id uuid NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        published_at timestamptz,
        retry_count integer NOT NULL DEFAULT 0,
        next_retry_at timestamptz,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT event_outbox_status_check CHECK (status IN ('pending', 'published', 'failed', 'consumed')),
        CONSTRAINT event_outbox_retry_check CHECK (retry_count >= 0)
      );

      CREATE TABLE IF NOT EXISTS event_inbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES event_outbox(id) ON DELETE CASCADE,
        consumer_name varchar(120) NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'consumed',
        processed_at timestamptz,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (event_id, consumer_name),
        CONSTRAINT event_inbox_status_check CHECK (status IN ('processing', 'consumed', 'failed', 'ignored'))
      );

      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
        channel varchar(40) NOT NULL DEFAULT 'in_app',
        premium_only boolean NOT NULL DEFAULT false,
        enabled boolean NOT NULL DEFAULT true,
        public_news_alerts_enabled boolean NOT NULL DEFAULT true,
        premium_alerts_enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT user_notification_preferences_channel_check CHECK (channel IN ('in_app', 'email', 'push')),
        UNIQUE (user_id, category_id, channel)
      );

      CREATE TABLE IF NOT EXISTS notification_batches (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_event_id uuid NOT NULL REFERENCES event_outbox(id) ON DELETE CASCADE,
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        audience_type varchar(80) NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'pending',
        total_recipients integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notification_batches_audience_check CHECK (audience_type IN ('active_registered_users', 'active_premium_users')),
        CONSTRAINT notification_batches_status_check CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
        CONSTRAINT notification_batches_total_check CHECK (total_recipients >= 0)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id uuid NOT NULL REFERENCES notification_batches(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        channel varchar(40) NOT NULL DEFAULT 'in_app',
        title varchar(180) NOT NULL,
        message text NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'queued',
        sent_at timestamptz,
        read_at timestamptz,
        failure_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notifications_channel_check CHECK (channel IN ('in_app', 'email', 'push')),
        CONSTRAINT notifications_status_check CHECK (status IN ('queued', 'sent', 'failed', 'read'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        entity_name varchar(120) NOT NULL,
        entity_id uuid,
        action varchar(120) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status, published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_articles_access_type ON articles(access_type);
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_active_user ON subscriptions(user_id, status, ends_at);
      CREATE INDEX IF NOT EXISTS idx_event_outbox_pending ON event_outbox(status, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ads_active_window ON advertisements(status, starts_at, ends_at);

      CREATE OR REPLACE FUNCTION prevent_premium_ad_impressions()
      RETURNS trigger AS $$
      DECLARE
        article_access varchar(40);
      BEGIN
        SELECT access_type INTO article_access FROM articles WHERE id = NEW.article_id;
        IF article_access = 'premium' THEN
          RAISE EXCEPTION 'Premium articles cannot create advertisement impressions';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_prevent_premium_ad_impressions ON advertisement_impressions;
      CREATE TRIGGER trg_prevent_premium_ad_impressions
      BEFORE INSERT OR UPDATE ON advertisement_impressions
      FOR EACH ROW
      EXECUTE FUNCTION prevent_premium_ad_impressions();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_prevent_premium_ad_impressions ON advertisement_impressions;
      DROP FUNCTION IF EXISTS prevent_premium_ad_impressions();
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS notification_batches;
      DROP TABLE IF EXISTS user_notification_preferences;
      DROP TABLE IF EXISTS event_inbox;
      DROP TABLE IF EXISTS event_outbox;
      DROP TABLE IF EXISTS advertisement_impressions;
      DROP TABLE IF EXISTS advertisement_category_targets;
      DROP TABLE IF EXISTS advertisements;
      DROP TABLE IF EXISTS advertisement_placements;
      DROP TABLE IF EXISTS comment_moderation_logs;
      DROP TABLE IF EXISTS reactions;
      DROP TABLE IF EXISTS comments;
      DROP TABLE IF EXISTS article_media;
      DROP TABLE IF EXISTS media_assets;
      DROP TABLE IF EXISTS article_tags;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS article_revisions;
      DROP TABLE IF EXISTS articles;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS payment_transactions;
      DROP TABLE IF EXISTS subscriptions;
      DROP TABLE IF EXISTS subscription_plans;
      DROP TABLE IF EXISTS user_roles;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS roles;
    `);
  }
};
