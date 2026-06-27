import fs from 'node:fs';
import path from 'node:path';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const migrationsDir = path.join(process.cwd(), 'database/migrations');
const seedersDir = path.join(process.cwd(), 'database/seeders');
const migrations = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.js')).sort();
const seeders = fs.readdirSync(seedersDir).filter((file) => file.endsWith('.js')).sort();

assert(migrations.length >= 4, 'Expected core, endpoint support, operational support and production hardening migrations');
assert(seeders.length >= 2, 'Expected base and endpoint support seeders');

for (const file of migrations) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  assert(content.includes('async up'), `${file} is missing async up`);
  assert(content.includes('async down'), `${file} is missing async down`);
  assert(!content.includes('DROP DATABASE'), `${file} must never drop a database`);
}

const core = fs.readFileSync(path.join(migrationsDir, '20260627000100-create-newspaper-core-schema.js'), 'utf8');
const eventInbox = core.match(/CREATE TABLE IF NOT EXISTS event_inbox \([\s\S]*?\);/)?.[0] ?? '';
assert((eventInbox.match(/last_error text/g) ?? []).length === 1, 'event_inbox duplicated last_error');

const allMigrationText = migrations.map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8')).join('\n');
for (const table of ['users', 'articles', 'event_outbox', 'event_inbox', 'user_refresh_tokens', 'auth_login_attempts', 'worker_runs', 'database_backup_runs']) {
  assert(allMigrationText.includes(table), `Expected migration coverage for ${table}`);
}

console.log('DB migration validation OK');
