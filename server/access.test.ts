import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canReadModule, refreshAccountPresence, shouldRefreshPresence } from './access.ts';

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


test('Anwesenheits-Heartbeat aktualisiert Hauptkonto und öffentliches Profil gemeinsam', () => {
  const account = {
    isOnline: false,
    lastSeenIso: '2026-01-01T00:00:00.000Z',
    publicProfile: { isOnline: false, lastSeenIso: '2026-01-01T00:00:00.000Z' }
  };
  const now = Date.parse('2026-01-01T00:01:00.000Z');

  assert.equal(refreshAccountPresence(account, now), true);
  assert.equal(account.isOnline, true);
  assert.equal(account.lastSeenIso, new Date(now).toISOString());
  assert.equal(account.publicProfile.isOnline, true);
  assert.equal(account.publicProfile.lastSeenIso, new Date(now).toISOString());

  assert.equal(refreshAccountPresence(account, now + 5_000), false);
  assert.equal(account.lastSeenIso, new Date(now).toISOString());
});

test('Anwesenheits-Heartbeat gleicht inkonsistente Profilfelder auch bei frischem Zeitstempel ab', () => {
  const now = Date.parse('2026-01-01T00:01:00.000Z');
  const account = {
    isOnline: true,
    lastSeenIso: new Date(now - 5_000).toISOString(),
    publicProfile: { isOnline: false, lastSeenIso: new Date(now - 20_000).toISOString() }
  };

  assert.equal(refreshAccountPresence(account, now), true);
  assert.equal(account.publicProfile.isOnline, true);
  assert.equal(account.publicProfile.lastSeenIso, account.lastSeenIso);
  assert.equal(account.lastSeenIso, new Date(now).toISOString());
});
