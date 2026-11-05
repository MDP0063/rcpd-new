import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  aggregateAttempts,
  aggregateKey,
  buildAggregates,
  evaluateQuota,
  pickBest,
  pickLast,
  selectEffectiveAttempt
} from './examAggregate.ts';
import { attempt } from './examTestFixtures.ts';

test('ohne Versuche: Status none, nicht bestanden', () => {
  const agg = aggregateAttempts([]);
  assert.equal(agg.status, 'none');
  assert.equal(agg.passed, false);
  assert.equal(agg.effective, null);
});

test('best (Standard): bester Versuch entscheidet, last wird getrennt geführt', () => {
  const a1 = attempt('passed', 9000, { attemptNumber: 1 });
  const a2 = attempt('failed', 4000, { attemptNumber: 2 });
  const agg = aggregateAttempts([a1, a2]);
  assert.equal(agg.rule, 'best');
  assert.equal(agg.status, 'passed');
  assert.equal(agg.effective?.id, a1.id);
  assert.equal(agg.best?.id, a1.id);
  assert.equal(agg.last?.id, a2.id);
});

test('last als Parameter: letzter Versuch entscheidet', () => {
  const a1 = attempt('passed', 9000, { attemptNumber: 1 });
  const a2 = attempt('failed', 4000, { attemptNumber: 2 });
  const agg = aggregateAttempts([a1, a2], 'last');
  assert.equal(agg.status, 'failed');
  assert.equal(agg.passed, false);
  assert.equal(agg.effective?.id, a2.id);
  assert.equal(selectEffectiveAttempt([a1, a2], 'last')?.id, a2.id);
});

test('best: bestanden schlägt höheres Ergebnis ohne Bestehen; sonst höheres Ergebnis', () => {
  const failedHigh = attempt('failed', 7400, { attemptNumber: 1 });
  const passedLow = attempt('passed', 7500, { attemptNumber: 2 });
  assert.equal(pickBest([failedHigh, passedLow])?.id, passedLow.id);
  const f1 = attempt('failed', 3000, { attemptNumber: 1 });
  const f2 = attempt('failed', 5000, { attemptNumber: 2 });
  assert.equal(pickBest([f1, f2])?.id, f2.id);
});

test('pending_review zählt nicht als bestanden', () => {
  const p = attempt('pending_review', null, { attemptNumber: 1 });
  const agg = aggregateAttempts([p]);
  assert.equal(agg.status, 'pending_review');
  assert.equal(agg.passed, false);
  // ein bestandener Versuch daneben entscheidet bei "best"
  const passed = attempt('passed', 8000, { attemptNumber: 2 });
  assert.equal(aggregateAttempts([p, passed]).status, 'passed');
  // bei "last" entscheidet der neuere pending_review-Versuch
  const later = attempt('pending_review', null, { attemptNumber: 3 });
  assert.equal(aggregateAttempts([passed, later], 'last').status, 'pending_review');
});

test('durch Admin invalidierte Versuche zählen weder als bestanden noch beim Aggregat', () => {
  const inv = attempt('invalidated_by_admin', 10000, { attemptNumber: 1 });
  const agg = aggregateAttempts([inv]);
  assert.equal(agg.passed, false);
  assert.equal(agg.status, 'none');
  assert.equal(agg.countedAttempts, 0);
  const failed = attempt('failed', 2000, { attemptNumber: 2 });
  assert.equal(aggregateAttempts([inv, failed]).effective?.id, failed.id);
  assert.equal(pickBest([inv]), null);
  assert.equal(pickLast([inv]), null);
});

test('laufender Versuch: Status in_progress, wenn nichts anderes vorliegt', () => {
  const run = attempt('in_progress', null, { attemptNumber: 1 });
  const agg = aggregateAttempts([run]);
  assert.equal(agg.status, 'in_progress');
  assert.ok(agg.hasInProgress);
  assert.equal(agg.passed, false);
});

test('Aggregate trennen Nutzer, Prüfung und Lehrgang', () => {
  const list = [
    attempt('passed', 9000, { userId: 'u1', attemptCourseCode: 'A' }),
    attempt('failed', 1000, { userId: 'u1', attemptCourseCode: 'B' }),
    attempt('passed', 9000, { userId: 'u2', attemptCourseCode: 'A' }),
    attempt('failed', 1000, { userId: 'u1', examId: 'e2', attemptCourseCode: 'A' })
  ];
  const aggs = buildAggregates(list);
  assert.equal(aggs.length, 4);
  assert.notEqual(aggregateKey('u1', 'e1', 'A'), aggregateKey('u1', 'e1', 'B'));
  assert.equal(aggs.find(a => a.userId === 'u1' && a.attemptCourseCode === 'B')?.status, 'failed');
});

test('Kontingent: Übungstests unbegrenzt, Abschlussprüfung nach maxAttempts', () => {
  const attempts = [attempt('failed', 1000), attempt('failed', 1000), attempt('failed', 1000)];
  const base = { userId: 'u1', examId: 'e1', attempts };
  assert.deepEqual(evaluateQuota({ ...base, assessmentStage: 'test', maxAttempts: 3 }).allowed, true);
  const q = evaluateQuota({ ...base, assessmentStage: 'final_exam', maxAttempts: 3 });
  assert.equal(q.used, 3);
  assert.equal(q.remaining, 0);
  assert.equal(q.allowed, false);
  assert.equal(evaluateQuota({ ...base, assessmentStage: 'final_exam', maxAttempts: 4 }).allowed, true);
  assert.equal(evaluateQuota({ ...base, assessmentStage: 'final_exam', maxAttempts: null }).limited, false);
  assert.equal(evaluateQuota({ ...base, assessmentStage: 'final_exam', maxAttempts: 0 }).limited, false);
});

test('Kontingent: Zusatzversuche, invalidierte Versuche und Altzähler', () => {
  const attempts = [attempt('failed', 1000), attempt('invalidated_by_admin', null)];
  const base = { assessmentStage: 'final_exam' as const, maxAttempts: 1, userId: 'u1', examId: 'e1', attempts };
  assert.equal(evaluateQuota(base).used, 1); // invalidierter zählt nicht
  assert.equal(evaluateQuota(base).allowed, false);
  assert.equal(evaluateQuota({ ...base, extraAttempts: 1 }).allowed, true);
  assert.equal(evaluateQuota({ ...base, extraAttempts: -5 }).allowed, false); // ungültig = 0
  assert.equal(evaluateQuota({ ...base, attempts: [], legacyAttemptsConsumed: 1 }).allowed, false);
  assert.equal(evaluateQuota({ ...base, attempts: [], legacyAttemptsConsumed: Number.NaN }).allowed, true);
  // Versuche anderer Nutzer zählen nicht
  assert.equal(evaluateQuota({ ...base, attempts: [attempt('failed', 0, { userId: 'u2' })] }).used, 0);
});
