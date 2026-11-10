import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFirestoreMigrationSource } from './firestoreMigration.ts';

test('missing legacy JSON file permits first-time Firestore initialization', () => {
  assert.equal(parseFirestoreMigrationSource(null), null);
});

test('valid legacy JSON database is accepted for Firestore migration', () => {
  const state = { version: 3, accounts: [{ uid: 'admin-1' }] };
  assert.deepEqual(parseFirestoreMigrationSource(JSON.stringify(state)), state);
});

test('malformed or structurally invalid legacy JSON blocks Firestore migration', () => {
  assert.throws(() => parseFirestoreMigrationSource('{broken'), /PORTAL_DATABASE_JSON_INVALID/);
  assert.throws(() => parseFirestoreMigrationSource('{"accounts":[]}'), /PORTAL_DATABASE_STATE_INVALID/);
  assert.throws(() => parseFirestoreMigrationSource('[]'), /PORTAL_DATABASE_STATE_INVALID/);
});
