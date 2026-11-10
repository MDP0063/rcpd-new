import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessDirectMessage,
  isPendingPortalRequest,
  isReviewableApplicationStatus,
  parsePortalDatabaseText,
  validateApplicationSubmission
} from './portalLegacyGuards.ts';

test('corrupt JSON portal databases fail closed', () => {
  assert.throws(() => parsePortalDatabaseText('{broken'), /PORTAL_DATABASE_JSON_INVALID/);
});

test('empty or structurally invalid portal databases are not treated as initial databases', () => {
  assert.throws(() => parsePortalDatabaseText(JSON.stringify({ accounts: [] })), /PORTAL_DATABASE_STATE_INVALID/);
  assert.throws(() => parsePortalDatabaseText(JSON.stringify({ modules: [] })), /PORTAL_DATABASE_STATE_INVALID/);
});

test('valid portal database text is returned without changing its records', () => {
  const data = { accounts: [{ uid: 'usr_1' }], messages: [{ id: 'msg_1' }] };
  assert.deepEqual(parsePortalDatabaseText(JSON.stringify(data)), data);
});

test('a direct message is accessible only to its participants or an ALL broadcast', () => {
  const message = { senderUid: 'sender', recipientUid: 'recipient' };
  assert.equal(canAccessDirectMessage(message, 'sender'), true);
  assert.equal(canAccessDirectMessage(message, 'recipient'), true);
  assert.equal(canAccessDirectMessage(message, 'outsider'), false);
  assert.equal(canAccessDirectMessage({ ...message, recipientUid: 'ALL' }, 'outsider'), true);
});

test('only pending requests accept a decision', () => {
  assert.equal(isPendingPortalRequest('pending'), true);
  assert.equal(isPendingPortalRequest('approved'), false);
  assert.equal(isPendingPortalRequest('rejected'), false);
  assert.equal(isPendingPortalRequest(undefined), false);
});

test('only non-terminal applications can be reviewed again', () => {
  for (const status of ['pending', 'under_review', 'interview_scheduled']) {
    assert.equal(isReviewableApplicationStatus(status), true);
  }
  assert.equal(isReviewableApplicationStatus('accepted'), false);
  assert.equal(isReviewableApplicationStatus('rejected'), false);
});

test('whitelist form fields are validated and bounded', () => {
  const input = {
    characterName: 'Alex Miller',
    dateOfBirth: '1998-05-14',
    discordTag: 'alex.miller',
    priorExperience: 'Mehrjährige RP-Erfahrung',
    scenarioResponse: 'Ich sichere zuerst den Bereich und fordere Unterstützung an.',
    penalCodeAck: true
  };
  assert.equal(validateApplicationSubmission(input), null);
  assert.match(validateApplicationSubmission({ ...input, characterName: 'X' }) || '', /zu kurz/);
  assert.match(validateApplicationSubmission({ ...input, priorExperience: 'x'.repeat(8001) }) || '', /zu lang/);
  assert.match(validateApplicationSubmission({ ...input, dateOfBirth: '2026-02-31' }) || '', /gültiges Datum/);
  // The existing UI permits an unchecked acknowledgment; preserve that behavior.
  assert.equal(validateApplicationSubmission({ ...input, penalCodeAck: false }), null);
  assert.match(validateApplicationSubmission({ ...input, penalCodeAck: 'true' }) || '', /ungültig/);
  assert.match(validateApplicationSubmission({ ...input, discordTag: undefined }) || '', /Discord-Kennung/);
});
