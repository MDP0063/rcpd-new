import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AttemptLimiter,
  createSessionToken,
  extractBearerToken,
  findIdentityMismatch,
  hashPassword,
  parseAllowedOrigins,
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
