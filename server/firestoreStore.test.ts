import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseServiceAccount } from './firestoreStore.ts';

const KEY = JSON.stringify({
  type: 'service_account',
  project_id: 'demo-projekt',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
  client_email: 'x@demo-projekt.iam.gserviceaccount.com'
});

test('Dienstkonto: JSON-Text wird gelesen', () => {
  assert.equal(parseServiceAccount(KEY).project_id, 'demo-projekt');
  assert.equal(parseServiceAccount(`  ${KEY}\n`).project_id, 'demo-projekt');
});

test('Dienstkonto: Base64 wird gelesen', () => {
  const encoded = Buffer.from(KEY).toString('base64');
  assert.equal(parseServiceAccount(encoded).project_id, 'demo-projekt');
});

test('Dienstkonto: unvollständige oder kaputte Werte werden abgelehnt', () => {
  assert.throws(() => parseServiceAccount('{"project_id":"x"}'));
  assert.throws(() => parseServiceAccount('kein-json'));
  assert.throws(() => parseServiceAccount(''));
});
