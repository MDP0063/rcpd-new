import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AttemptLimiter,
  createSessionToken,
  consumeRecoveryEmailQuota,
  extractBearerToken,
  findIdentityMismatch,
  hashPassword,
  hasActiveRecoveryToken,
  hashRecoveryToken,
  parseAllowedOrigins,
  readSessionUid,
  safeEqual,
  validateNewPassword,
  verifyPassword,
  verifySessionToken
} from './auth.ts';

const SECRET = 'test-secret-test-secret-test-secret';

test('Passwort: Hash ist nicht der Klartext und lässt sich prüfen', () => {
  const hash = hashPassword('geheim-1234');
  assert.ok(!hash.includes('geheim-1234'));
  assert.ok(verifyPassword('geheim-1234', hash));
  assert.ok(!verifyPassword('geheim-12345', hash));
});

test('Passwort: gleiche Eingabe ergibt unterschiedliche Hashes (Salt)', () => {
  assert.notEqual(hashPassword('abcdefgh'), hashPassword('abcdefgh'));
});

test('Passwort: kaputte oder fehlende Hashes werden abgelehnt', () => {
  assert.ok(!verifyPassword('x', undefined));
  assert.ok(!verifyPassword('x', ''));
  assert.ok(!verifyPassword('x', 'plaintext'));
  assert.ok(!verifyPassword('x', 'scrypt$1$2$3$a'));
});

test('Passwort: Mindestlänge wird erzwungen', () => {
  assert.notEqual(validateNewPassword('1234'), null);
  assert.equal(validateNewPassword('12345678'), null);
  assert.notEqual(validateNewPassword(12345678), null);
  assert.notEqual(validateNewPassword('x'.repeat(201)), null);
});

test('Token: gültiges Token liefert die UID', () => {
  const token = createSessionToken('usr_1', SECRET, 1000, 5000);
  assert.equal(verifySessionToken(token, SECRET, 2000), 'usr_1');
  assert.equal(verifySessionToken(token, SECRET, 2000, 0), 'usr_1');
  assert.equal(verifySessionToken(token, SECRET, 2000, 1), null);
  assert.equal(readSessionUid(token), 'usr_1');
});

test('Token: persistenter Logout-Widerruf durch erhöhte Session-Version', () => {
  const token = createSessionToken('usr_1', SECRET, 1000, 5000, 4);
  assert.equal(verifySessionToken(token, SECRET, 2000, 4), 'usr_1');
  // Logout erhöht sessionVersion im persistenten Konto; alle älteren Tokens werden ungültig.
  assert.equal(verifySessionToken(token, SECRET, 2000, 5), null);
});

test('Token: abgelaufen, manipuliert oder falsches Geheimnis wird abgelehnt', () => {
  const token = createSessionToken('usr_1', SECRET, 1000, 5000);
  assert.equal(verifySessionToken(token, SECRET, 6000), null);
  assert.equal(verifySessionToken(token, 'anderes-geheimnis', 2000), null);

  const [body, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ uid: 'usr_admin_1', exp: 99999999999 })).toString(
    'base64url'
  );
  assert.equal(verifySessionToken(`${forged}.${sig}`, SECRET, 2000), null);
  assert.equal(verifySessionToken(`${body}.`, SECRET, 2000), null);
  assert.equal(verifySessionToken('', SECRET, 2000), null);
  assert.equal(verifySessionToken(undefined, SECRET, 2000), null);
  assert.equal(verifySessionToken('nur-ein-teil', SECRET, 2000), null);
});

test('Ein noch gültiger Recovery-Link darf nicht durch neue Anfragen ersetzt werden', () => {
  const now = Date.parse('2026-11-04T10:00:00.000Z');
  assert.equal(hasActiveRecoveryToken(new Date(now + 1).toISOString(), now), true);
  assert.equal(hasActiveRecoveryToken(new Date(now).toISOString(), now), false);
  assert.equal(hasActiveRecoveryToken(new Date(now - 1).toISOString(), now), false);
  assert.equal(hasActiveRecoveryToken('ungültig', now), false);
  assert.equal(hasActiveRecoveryToken(null, now), false);
});

test('Recovery-Mail-Kontingent begrenzt global auf drei Sendungen pro Stunde', () => {
  const start = Date.parse('2026-11-04T10:00:00.000Z');
  let quota = consumeRecoveryEmailQuota(undefined, start);
  assert.equal(quota.allowed, true);
  assert.equal(quota.state.count, 1);

  quota = consumeRecoveryEmailQuota(quota.state, start + 1);
  assert.equal(quota.allowed, true);
  quota = consumeRecoveryEmailQuota(quota.state, start + 2);
  assert.equal(quota.allowed, true);
  quota = consumeRecoveryEmailQuota(quota.state, start + 3);
  assert.equal(quota.allowed, false);
  assert.equal(quota.state.count, 3);

  const nextWindow = consumeRecoveryEmailQuota(quota.state, start + 60 * 60 * 1000);
  assert.equal(nextWindow.allowed, true);
  assert.equal(nextWindow.state.count, 1);
});

test('Recovery-Mail-Kontingent verwirft ungültige oder zukünftige Zeitfenster', () => {
  const now = Date.parse('2026-11-04T10:00:00.000Z');
  const invalid = consumeRecoveryEmailQuota({ windowStartedAt: 'kaputt', count: 3 }, now);
  assert.equal(invalid.allowed, true);
  assert.equal(invalid.state.count, 1);
  const future = consumeRecoveryEmailQuota({
    windowStartedAt: new Date(now + 1000).toISOString(),
    count: 3
  }, now);
  assert.equal(future.allowed, true);
  assert.equal(future.state.count, 1);
});

test('Wiederherstellungstoken wird nur als SHA-256-Hash abgelegt', () => {
  const token = 'ein-einmaliger-geheimer-token';
  const hash = hashRecoveryToken(token);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(hashRecoveryToken(token), hash);
});

test('Bearer-Header wird gelesen', () => {
  assert.equal(extractBearerToken('Bearer abc.def'), 'abc.def');
  assert.equal(extractBearerToken('bearer abc'), 'abc');
  assert.equal(extractBearerToken('Basic abc'), null);
  assert.equal(extractBearerToken(undefined), null);
});

test('Identität: fremde UID in Query oder Body fällt auf', () => {
  assert.equal(findIdentityMismatch('usr_2', { uid: 'usr_2' }, { adminUid: 'usr_2' }), null);
  assert.equal(findIdentityMismatch('usr_2', { uid: 'usr_admin_1' }), 'uid');
  assert.equal(findIdentityMismatch('usr_2', {}, { adminUid: 'usr_admin_1' }), 'adminUid');
  assert.equal(findIdentityMismatch('usr_2', { actorUid: ['usr_2'] }), 'actorUid');
  assert.equal(findIdentityMismatch('usr_2', undefined, null), null);
  // Bewerbungen und Anträge nennen den Absender ebenfalls im Body
  assert.equal(findIdentityMismatch('usr_2', undefined, { applicantUid: 'usr_9' }), 'applicantUid');
  assert.equal(findIdentityMismatch('usr_2', undefined, { requesterUid: 'usr_9' }), 'requesterUid');
  assert.equal(findIdentityMismatch('usr_2', undefined, { applicantUid: 'usr_2' }), null);
  // Zielfelder anderer Nutzer sind keine Identitätsfelder
  assert.equal(findIdentityMismatch('usr_2', { targetUserUid: 'usr_9' }), null);
});

test('Begrenzung: sperrt nach zu vielen Fehlversuchen und gibt später wieder frei', () => {
  const limiter = new AttemptLimiter(3, 1000);
  assert.equal(limiter.retryAfterMs('k', 0), 0);
  limiter.recordFailure('k', 0);
  limiter.recordFailure('k', 100);
  assert.equal(limiter.retryAfterMs('k', 200), 0);
  limiter.recordFailure('k', 200);
  assert.equal(limiter.retryAfterMs('k', 300), 700);
  assert.equal(limiter.retryAfterMs('anderer-schluessel', 300), 0);
  assert.equal(limiter.retryAfterMs('k', 1001), 0);
  limiter.recordFailure('k', 1100);
  limiter.reset('k');
  assert.equal(limiter.retryAfterMs('k', 1100), 0);
});

test('AttemptLimiter bereinigt abgelaufene Schlüssel und begrenzt die gespeicherten Schlüssel', () => {
  const limiter = new AttemptLimiter(1, 10_000, 2);
  limiter.recordFailure('active', 9_000);
  limiter.recordFailure('stale', 0);

  // Nach 64 Operationen werden fremde, längst abgelaufene Schlüssel global bereinigt.
  for (let i = 0; i < 64; i++) limiter.retryAfterMs(`probe-${i}`, 11_000);
  limiter.recordFailure('new', 11_000);

  assert.equal(limiter.retryAfterMs('active', 11_000), 8_000);
  assert.equal(limiter.retryAfterMs('new', 11_000), 10_000);
  assert.equal(limiter.retryAfterMs('stale', 11_000), 0);
});

test('AttemptLimiter hält bei Schlüssel-Flut die zuletzt verwendeten Limits', () => {
  const limiter = new AttemptLimiter(1, 10_000, 2);
  limiter.recordFailure('older', 0);
  limiter.recordFailure('recent', 0);
  limiter.retryAfterMs('older', 1); // macht older zum zuletzt verwendeten Schlüssel
  limiter.recordFailure('new', 2);

  assert.equal(limiter.retryAfterMs('older', 2), 9_998);
  assert.equal(limiter.retryAfterMs('new', 2), 10_000);
  assert.equal(limiter.retryAfterMs('recent', 2), 0);
});

test('safeEqual und Origin-Liste', () => {
  assert.ok(safeEqual('abc', 'abc'));
  assert.ok(!safeEqual('abc', 'abd'));
  assert.ok(!safeEqual('abc', 'abcd'));
  assert.deepEqual(parseAllowedOrigins('https://a.de/, https://b.de ,'), [
    'https://a.de',
    'https://b.de'
  ]);
  assert.deepEqual(parseAllowedOrigins(undefined), []);
});
