import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canReadModule, shouldRefreshPresence } from './access.ts';

test('Handbuch: gleicher oder höherer Rang darf lesen, niedrigerer nicht', () => {
  assert.ok(canReadModule(1, 3));
  assert.ok(canReadModule(3, 3));
  assert.ok(!canReadModule(4, 3));
  assert.ok(!canReadModule(undefined, 3));
  assert.ok(!canReadModule(1, undefined));
});

test('Anwesenheit: nur bei veraltetem Eintrag oder Offline schreiben', () => {
  const now = Date.parse('2026-01-01T00:01:00Z');
  assert.ok(!shouldRefreshPresence(true, '2026-01-01T00:00:50Z', now));
  assert.ok(shouldRefreshPresence(true, '2026-01-01T00:00:40Z', now));
  assert.ok(shouldRefreshPresence(false, '2026-01-01T00:00:59Z', now));
  assert.ok(shouldRefreshPresence(true, 'kaputt', now));
  assert.ok(shouldRefreshPresence(undefined, undefined, now));
});
