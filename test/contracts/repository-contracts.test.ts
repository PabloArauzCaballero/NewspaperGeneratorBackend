import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('repository delivery contracts', () => {
  it('postman collection includes core business and error-flow endpoints', () => {
    const collection = JSON.parse(fs.readFileSync(path.join(root, 'postman/NewspaperGeneratorBackend.postman_collection.json'), 'utf8'));
    const raw = JSON.stringify(collection);
    for (const fragment of [
      '/auth/login',
      '/auth/me',
      '/articles/',
      '/premium/articles/',
      '/ads/slots',
      '/admin/events/dispatch-pending',
      '/admin/cache-invalidation/articles/',
      '/admin/security/login-attempts',
      '/admin/security/worker-runs'
    ]) {
      assert.ok(raw.includes(fragment), `Missing Postman fragment ${fragment}`);
    }
  });

  it('migrations define production-hardening tables and avoid duplicated event_inbox last_error declarations', () => {
    const migrationsDir = path.join(root, 'database/migrations');
    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.js')).sort();
    assert.ok(files.some((file) => file.includes('production-hardening-auth-worker')), 'Missing production hardening migration');
    const coreMigration = fs.readFileSync(path.join(migrationsDir, '20260627000100-create-newspaper-core-schema.js'), 'utf8');
    const eventInboxBlock = coreMigration.match(/CREATE TABLE IF NOT EXISTS event_inbox \([\s\S]*?\);/)?.[0] ?? '';
    const lastErrorMatches = eventInboxBlock.match(/last_error text/g) ?? [];
    assert.equal(lastErrorMatches.length, 1, 'event_inbox must define last_error exactly once');
    const hardening = fs.readFileSync(path.join(migrationsDir, '20260627000600-production-hardening-auth-worker.js'), 'utf8');
    assert.ok(hardening.includes('user_refresh_tokens'));
    assert.ok(hardening.includes('auth_login_attempts'));
    assert.ok(hardening.includes('worker_runs'));
  });

  it('package exposes a single command that proves quality end to end', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['test:all'].includes('typecheck'));
    assert.ok(pkg.scripts['test:all'].includes('build'));
    assert.ok(pkg.scripts['test:all'].includes('test:smoke:db'));
    assert.ok(pkg.scripts['test:all'].includes('test:smoke:http'));
    assert.ok(pkg.scripts['start:worker:events']);
  });
});
