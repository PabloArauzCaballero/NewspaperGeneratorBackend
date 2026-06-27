import bcrypt from 'bcryptjs';
import { Sequelize, QueryTypes } from 'sequelize';
import 'dotenv/config';

type DbCounts = {
  users: string;
  roles: string;
  permissions: string;
  articles: string;
  public_articles: string;
  premium_articles: string;
  outbox_events: string;
  inbox_events: string;
  ads_on_premium: string;
  active_ads: string;
  premium_subscriptions: string;
  article_views: string;
  search_documents: string;
  backup_table_exists: string;
  refresh_tokens_table_exists: string;
  login_attempts_table_exists: string;
  worker_runs_table_exists: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      process.env.DATABASE_SSL === 'true' || databaseUrl.includes('sslmode=require')
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
          }
        : {}
  });

  try {
    await sequelize.authenticate();

    const [counts] = await sequelize.query<DbCounts>(
      `
      SELECT
        (SELECT count(*) FROM users)::text AS users,
        (SELECT count(*) FROM roles)::text AS roles,
        (SELECT count(*) FROM permissions)::text AS permissions,
        (SELECT count(*) FROM articles)::text AS articles,
        (SELECT count(*) FROM articles WHERE status = 'published' AND access_type = 'public')::text AS public_articles,
        (SELECT count(*) FROM articles WHERE status = 'published' AND access_type = 'premium')::text AS premium_articles,
        (SELECT count(*) FROM event_outbox)::text AS outbox_events,
        (SELECT count(*) FROM event_inbox)::text AS inbox_events,
        (
          SELECT count(*)
          FROM advertisement_impressions ai
          INNER JOIN articles a ON a.id = ai.article_id
          WHERE a.access_type = 'premium'
        )::text AS ads_on_premium,
        (SELECT count(*) FROM advertisements WHERE status = 'active' AND starts_at <= now() AND ends_at > now())::text AS active_ads,
        (
          SELECT count(*)
          FROM subscriptions s
          INNER JOIN users u ON u.id = s.user_id
          WHERE u.email = 'premium.demo@periodico.test'
            AND s.status = 'active'
            AND s.starts_at <= now()
            AND s.ends_at > now()
        )::text AS premium_subscriptions,
        (SELECT count(*) FROM article_views)::text AS article_views,
        (SELECT count(*) FROM search_index_documents)::text AS search_documents,
        (SELECT count(*) FROM information_schema.tables WHERE table_name = 'database_backup_runs')::text AS backup_table_exists,
        (SELECT count(*) FROM information_schema.tables WHERE table_name = 'user_refresh_tokens')::text AS refresh_tokens_table_exists,
        (SELECT count(*) FROM information_schema.tables WHERE table_name = 'auth_login_attempts')::text AS login_attempts_table_exists,
        (SELECT count(*) FROM information_schema.tables WHERE table_name = 'worker_runs')::text AS worker_runs_table_exists;
      `,
      { type: QueryTypes.SELECT }
    );

    assert(counts, 'Smoke query returned no counts');
    assert(Number(counts.users) >= 6, `Expected at least 6 users, got ${counts.users}`);
    assert(Number(counts.roles) >= 5, `Expected at least 5 roles, got ${counts.roles}`);
    assert(Number(counts.permissions) >= 5, `Expected endpoint support permissions, got ${counts.permissions}`);
    assert(Number(counts.articles) >= 3, `Expected at least 3 articles, got ${counts.articles}`);
    assert(Number(counts.public_articles) >= 1, 'Expected at least 1 public published article');
    assert(Number(counts.premium_articles) >= 1, 'Expected at least 1 premium published article');
    assert(Number(counts.outbox_events) >= 3, 'Expected event outbox seed events');
    assert(Number(counts.ads_on_premium) === 0, 'Premium article has advertisement impressions, this violates business rules');
    assert(Number(counts.active_ads) >= 1, 'Expected at least 1 active ad for public contexts');
    assert(Number(counts.premium_subscriptions) >= 1, 'premium.demo@periodico.test must have an active non-expired subscription');
    assert(Number(counts.article_views) >= 1, 'Expected seeded article views');
    assert(Number(counts.search_documents) >= 1, 'Expected seeded search index documents');
    assert(Number(counts.backup_table_exists) === 1, 'Expected database_backup_runs operational table for Neon backup job');
    assert(Number(counts.refresh_tokens_table_exists) === 1, 'Expected user_refresh_tokens table for refresh token rotation');
    assert(Number(counts.login_attempts_table_exists) === 1, 'Expected auth_login_attempts table for security audit');
    assert(Number(counts.worker_runs_table_exists) === 1, 'Expected worker_runs table for event worker observability');

    const [passwordUser] = await sequelize.query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE email = 'admin.demo@periodico.test' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );
    assert(passwordUser, 'Admin demo user is missing');
    assert(await bcrypt.compare('DemoPassword2026!', passwordUser.password_hash), 'Admin demo password hash does not match expected seed credentials');

    const [premiumRule] = await sequelize.query<{ body_visible_without_subscription: string; ads_on_premium_articles: string }>(
      `
      SELECT
        (
          SELECT count(*)
          FROM articles a
          WHERE a.access_type = 'premium'
            AND a.status = 'published'
            AND NOT EXISTS (
              SELECT 1
              FROM subscriptions s
              INNER JOIN users u ON u.id = s.user_id
              WHERE u.email = 'lector.demo@periodico.test'
                AND s.status = 'active'
                AND s.starts_at <= now()
                AND s.ends_at > now()
            )
        )::text AS body_visible_without_subscription,
        (
          SELECT count(*)
          FROM advertisements ad
          INNER JOIN advertisement_placements ap ON ap.id = ad.placement_id
          WHERE ap.allowed_context <> 'public_articles'
            AND ad.status = 'active'
        )::text AS ads_on_premium_articles;
      `,
      { type: QueryTypes.SELECT }
    );
    assert(premiumRule, 'Premium rule query failed');
    assert(Number(premiumRule.body_visible_without_subscription) >= 1, 'Expected premium article to exist for paywall checks');
    assert(Number(premiumRule.ads_on_premium_articles) === 0, 'Ads must remain restricted to public contexts in current rules');

    const [notificationRule] = await sequelize.query<{ premium_notification_non_premium_recipients: string }>(
      `
      SELECT count(*)::text AS premium_notification_non_premium_recipients
      FROM notification_batches nb
      INNER JOIN notifications n ON n.batch_id = nb.id
      INNER JOIN users u ON u.id = n.user_id
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active' AND s.starts_at <= now() AND s.ends_at > now()
      WHERE nb.audience_type = 'active_premium_users'
        AND s.id IS NULL;
      `,
      { type: QueryTypes.SELECT }
    );
    assert(notificationRule, 'Notification rule query failed');
    assert(Number(notificationRule.premium_notification_non_premium_recipients) === 0, 'Premium publication notifications must not be sent to non-premium users');

    console.log('DB smoke OK:', counts);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
