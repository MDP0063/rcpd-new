import assert from 'node:assert/strict';
import test from 'node:test';
import { assertExamDocument } from './examRepositoryRules.ts';

test('workshop comments require a bounded author, exam reference, body and timestamp', () => {
  const valid = {
    id: 'comment_1',
    examId: 'exam_1',
    authorUid: 'user_1',
    authorName: 'Officer One',
    body: 'Bitte Frage 2 prüfen.',
    createdIso: '2026-11-05T12:00:00.000Z'
  };
  assert.doesNotThrow(() => assertExamDocument('exam_comments', valid.id, valid));
  assert.throws(
    () => assertExamDocument('exam_comments', valid.id, { ...valid, body: ' '.repeat(4001) }),
    /EXAM_COMMENT_INVALID/
  );
});

test('publication requests require an immutable revision reference and valid state', () => {
  const valid = {
    id: 'review_1',
    examId: 'exam_1',
    requestedByUid: 'user_1',
    requestedByName: 'Officer One',
    assessmentStage: 'test',
    requestKind: 'new',
    status: 'pending',
    submittedRevision: 2,
    submittedHash: 'a'.repeat(64),
    createdIso: '2026-11-05T12:00:00.000Z',
    updatedIso: '2026-11-05T12:00:00.000Z'
  };
  assert.doesNotThrow(() => assertExamDocument('exam_publication_requests', valid.id, valid));
  assert.throws(
    () => assertExamDocument('exam_publication_requests', valid.id, { ...valid, submittedHash: 'not-a-hash' }),
    /EXAM_PUBLICATION_REQUEST_INVALID/
  );
});
