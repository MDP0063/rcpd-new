import assert from 'node:assert/strict';
import test from 'node:test';
import { sortCompletedManualReviewAttempts } from './examReviewService.ts';
import type { ExamAttemptRecord } from './examAttemptService.ts';

test('completed manual reviews are sorted by actual review completion time, not submission time', () => {
  const attempts = [
    { id: 'submitted-later-reviewed-earlier', submittedAtIso: '2026-11-11T12:00:00.000Z', reviewedAtIso: '2026-11-11T12:10:00.000Z' },
    { id: 'submitted-earlier-reviewed-later', submittedAtIso: '2026-11-11T11:00:00.000Z', reviewedAtIso: '2026-11-11T12:30:00.000Z' },
    { id: 'reviewed-first', submittedAtIso: '2026-11-11T10:00:00.000Z', reviewedAtIso: '2026-11-11T11:30:00.000Z' }
  ];

  assert.deepEqual(
    sortCompletedManualReviewAttempts(attempts as unknown as ExamAttemptRecord[]).map(attempt => attempt.id),
    ['submitted-earlier-reviewed-later', 'submitted-later-reviewed-earlier', 'reviewed-first']
  );
  assert.deepEqual(
    attempts.map(attempt => attempt.id),
    ['submitted-later-reviewed-earlier', 'submitted-earlier-reviewed-later', 'reviewed-first'],
    'sorting must not mutate the repository result array'
  );
});
