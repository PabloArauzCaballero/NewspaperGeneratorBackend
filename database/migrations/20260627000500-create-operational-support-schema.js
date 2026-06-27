'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS database_backup_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_label varchar(120) NOT NULL DEFAULT 'primary',
        target_label varchar(120) NOT NULL DEFAULT 'neon_backup',
        mode varchar(40) NOT NULL DEFAULT 'pg_dump_custom_restore',
        status varchar(40) NOT NULL DEFAULT 'started',
        dump_file_path text,
        dump_size_bytes bigint,
        checksum_sha256 varchar(64),
        started_at timestamptz NOT NULL DEFAULT now(),
        finished_at timestamptz,
        duration_ms integer,
        error_message text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT database_backup_runs_status_check CHECK (status IN ('started', 'succeeded', 'failed')),
        CONSTRAINT database_backup_runs_dump_size_check CHECK (dump_size_bytes IS NULL OR dump_size_bytes >= 0),
        CONSTRAINT database_backup_runs_duration_check CHECK (duration_ms IS NULL OR duration_ms >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_database_backup_runs_started_at ON database_backup_runs(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_database_backup_runs_status ON database_backup_runs(status, started_at DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS database_backup_runs;
    `);
  }
};
