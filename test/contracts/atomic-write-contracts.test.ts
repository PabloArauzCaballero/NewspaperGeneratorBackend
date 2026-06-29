import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

describe('atomic write contracts', () => {
  it('register creates user, role assignment, audit/login event and refresh token in one transaction', () => {
    const auth = read('src/auth/auth.service.ts');
    const registerStart = auth.indexOf('async register(');
    const loginStart = auth.indexOf('async login(');
    const registerBlock = auth.slice(registerStart, loginStart);
    assert.match(registerBlock, /this\.sequelize\.transaction/);
    assert.match(registerBlock, /INSERT INTO users/);
    assert.match(registerBlock, /INSERT INTO user_roles/);
    assert.match(registerBlock, /writeOutbox\('UserRegistered'/);
    assert.match(registerBlock, /createRefreshToken\(user\.id, metadata, transaction\)/);
    assert.doesNotMatch(registerBlock, /return this\.toAuthResponse/);
  });

  it('user role and status mutations are transactional and validate target existence before audit logs', () => {
    const users = read('src/users/users.service.ts');
    for (const method of ['updateStatus', 'addRole', 'removeRole']) {
      const start = users.indexOf(`async ${method}`);
      assert.notEqual(start, -1, `${method} should exist`);
      const block = users.slice(start, users.indexOf('\n  private', start));
      assert.match(block, /this\.sequelize\.transaction/, `${method} must run inside a transaction`);
      assert.match(block, /assertUserExists/, `${method} must validate the target user before writing audit logs`);
      assert.match(block, /audit\(/, `${method} must write audit log inside the same transaction`);
    }
  });

  it('subscription mutations persist subscription, payment, audit and outbox records atomically', () => {
    const subscriptions = read('src/subscriptions/subscriptions.service.ts');
    for (const method of ['checkout', 'activateManual', 'cancel']) {
      const start = subscriptions.indexOf(`async ${method}`);
      assert.notEqual(start, -1, `${method} should exist`);
      const block = subscriptions.slice(start, subscriptions.indexOf('\n  private', start));
      assert.match(block, /this\.sequelize\.transaction/, `${method} must use a transaction`);
    }
    assert.match(subscriptions, /INSERT INTO payment_transactions/);
    assert.match(subscriptions, /writeOutbox\('SubscriptionPaymentStarted'/);
    assert.match(subscriptions, /writeOutbox\('SubscriptionCancelled'/);
  });

  it('advertisement mutations validate owner rows and category targets before replacing child rows', () => {
    const ads = read('src/ads/ads.service.ts');
    assert.match(ads, /assertPlacementExists/);
    assert.match(ads, /assertCategoriesExist/);
    assert.match(ads, /getWindowForMutation/);
    assert.match(ads, /this\.sequelize\.transaction/);
  });

  it('article mutations read their transactional result inside the same transaction and do not leak non-transactional reads', () => {
    const articles = read('src/articles/articles.service.ts');
    assert.doesNotMatch(articles, /return this\.getAdmin\(id\);/);
    assert.doesNotMatch(articles, /return this\.getAdmin\(article\.id\);/);
    assert.match(articles, /return this\.getAdmin\(id, transaction\);/);
    assert.match(articles, /return this\.getAdmin\(article\.id, transaction\);/);
  });
});



describe('batch write observability contracts', () => {
  it('database records every business write as a transaction-scoped batch', () => {
    const batchMigration = read('database/migrations/20260627000700-create-api-write-batches.js');
    assert.match(batchMigration, /CREATE TABLE IF NOT EXISTS api_write_batches/);
    assert.match(batchMigration, /CREATE TABLE IF NOT EXISTS api_write_batch_items/);
    assert.match(batchMigration, /record_api_write_batch_item/);
    assert.match(batchMigration, /txid_current\(\)/);
    assert.match(batchMigration, /event_outbox/);
    assert.match(batchMigration, /audit_logs/);
    assert.match(batchMigration, /user_refresh_tokens/);
  });

  it('DB smoke validates persisted batch headers and batch items', () => {
    const smoke = read('scripts/smoke.ts');
    assert.match(smoke, /write_batches_table_exists/);
    assert.match(smoke, /write_batch_items_table_exists/);
    assert.match(smoke, /multi_item_write_batches/);
  });
});
