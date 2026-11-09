import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseManualReviewGrades } from '../src/lib/examReviewGrades.ts';

const questions = [
  { questionId: 'q1', pointsMilli: 2500 },
  { questionId: 'q2', pointsMilli: 1000 }
];

test('manual review accepts explicit zero and valid fractional grades', () => {
  assert.deepEqual(parseManualReviewGrades(questions, { q1: '0', q2: '0.875' }), {
    ok: true,
    grades: [
      { questionId: 'q1', pointsEarnedMilli: 0 },
      { questionId: 'q2', pointsEarnedMilli: 875 }
    ]
  });
});

test('manual review rejects an empty grade instead of silently treating it as zero', () => {
  assert.deepEqual(parseManualReviewGrades(questions, { q1: '', q2: '0.5' }), { ok: false });
});

test('manual review rejects missing precision, negative and over-limit grades', () => {
  assert.deepEqual(parseManualReviewGrades(questions, { q1: '0.0001', q2: '0.5' }), { ok: false });
  assert.deepEqual(parseManualReviewGrades(questions, { q1: '-0.1', q2: '0.5' }), { ok: false });
  assert.deepEqual(parseManualReviewGrades(questions, { q1: '2.501', q2: '0.5' }), { ok: false });
});
