'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz;
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_failed_login_attempts_check') THEN
          ALTER TABLE users ADD CONSTRAINT users_failed_login_attempts_check CHECK (failed_login_attempts >= 0) NOT VALID;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS user_refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(128) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        replaced_by_token_id uuid REFERENCES user_refresh_tokens(id) ON DELETE SET NULL,
        created_by_ip varchar(120),
        user_agent text,
        last_used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT user_refresh_tokens_expiry_check CHECK (expires_at > created_at)
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(128) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        requested_by_ip varchar(120),
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT password_reset_tokens_expiry_check CHECK (expires_at > created_at)
      );

      CREATE TABLE IF NOT EXISTS auth_login_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(220) NOT NULL,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        success boolean NOT NULL DEFAULT false,
        failure_reason varchar(120),
        ip_address varchar(120),
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS worker_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_name varchar(120) NOT NULL,
        lock_key varchar(180) NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'started',
        processed_count integer NOT NULL DEFAULT 0,
        failed_count integer NOT NULL DEFAULT 0,
        started_at timestamptz NOT NULL DEFAULT now(),
        finished_at timestamptz,
        error_message text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT worker_runs_status_check CHECK (status IN ('started', 'succeeded', 'failed', 'skipped')),
        CONSTRAINT worker_runs_counts_check CHECK (processed_count >= 0 AND failed_count >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_user ON user_refresh_tokens(user_id, expires_at DESC);
      CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_active ON user_refresh_tokens(user_id, expires_at DESC) WHERE revoked_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id, expires_at DESC);
      CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_email_created ON auth_login_attempts(email, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_worker_runs_worker_started ON worker_runs(worker_name, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_event_outbox_retry ON event_outbox(status, next_retry_at, occurred_at);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS worker_runs;
      DROP TABLE IF EXISTS auth_login_attempts;
      DROP TABLE IF EXISTS password_reset_tokens;
      DROP TABLE IF EXISTS user_refresh_tokens;
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_failed_login_attempts_check;
      ALTER TABLE users DROP COLUMN IF EXISTS locked_until;
      ALTER TABLE users DROP COLUMN IF EXISTS failed_login_attempts;
      ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
    `);
  }
};
