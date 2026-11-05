import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluatePrerequisites } from './examPrerequisites.ts';
import { attempt } from './examTestFixtures.ts';
import type { LegacyProgressRecord, LegacyVerificationDoc } from './examTypes.ts';

const ctx = (over = {}) => ({ userId: 'u1', attemptCourseCode: 'SOP-01', attempts: [], legacyProgress: [], legacyVerifications: [], ...over });
const passedPre = [{ examId: 'e1', mode: 'passed' as const }];

const legacyPassed: LegacyProgressRecord = {
  id: 'lp1', userId: 'u1', targetId: 'e1', targetType: 'final_exam', status: 'passed', scorePercent: 90, attempts: 1
};
const verification: LegacyVerificationDoc = {
  id: 'legacy_verification__lp1', legacyProgressId: 'lp1', userId: 'u1', examId: 'e1',
  verifiedStatus: 'passed', verifiedByUid: 'admin1', verifiedAtIso: '2026-01-01T00:00:00.000Z', reason: 'Prüfprotokoll gesehen'
};

test('keine Voraussetzungen: immer erfüllt', () => {
  assert.ok(evaluatePrerequisites(undefined, ctx()).met);
  assert.ok(evaluatePrerequisites([], ctx()).met);
});

test('bestandener Versuch erfüllt "passed"; fehlender Versuch nicht', () => {
  assert.ok(evaluatePrerequisites(passedPre, ctx({ attempts: [attempt('passed', 8000)] })).met);
  assert.ok(!evaluatePrerequisites(passedPre, ctx()).met);
  assert.ok(!evaluatePrerequisites(passedPre, ctx({ attempts: [attempt('failed', 2000)] })).met);
});

test('pending_review und invalidierte Versuche erfüllen "passed" nicht', () => {
  assert.ok(!evaluatePrerequisites(passedPre, ctx({ attempts: [attempt('pending_review', null)] })).met);
  assert.ok(!evaluatePrerequisites(passedPre, ctx({ attempts: [attempt('invalidated_by_admin', 10000)] })).met);
});

test('"completed": abgegeben genügt, auch bei pending_review; invalidiert nicht', () => {
  const pre = [{ examId: 'e1', mode: 'completed' as const }];
  assert.ok(evaluatePrerequisites(pre, ctx({ attempts: [attempt('failed', 100)] })).met);
  assert.ok(evaluatePrerequisites(pre, ctx({ attempts: [attempt('pending_review', null)] })).met);
  assert.ok(!evaluatePrerequisites(pre, ctx({ attempts: [attempt('in_progress', null)] })).met);
  assert.ok(!evaluatePrerequisites(pre, ctx({ attempts: [attempt('invalidated_by_admin', null)] })).met);
});

test('Mindestergebnis wird gegen den maßgeblichen Versuch geprüft', () => {
  const pre = [{ examId: 'e1', mode: 'passed' as const, minScoreBasisPoints: 9000 }];
  assert.ok(!evaluatePrerequisites(pre, ctx({ attempts: [attempt('passed', 8000)] })).met);
  assert.ok(evaluatePrerequisites(pre, ctx({ attempts: [attempt('passed', 9000)] })).met);
});

test('Versuche anderer Nutzer, Prüfungen oder Lehrgänge zählen nicht', () => {
  const others = [attempt('passed', 9000, { userId: 'u2' }), attempt('passed', 9000, { examId: 'e9' }), attempt('passed', 9000, { attemptCourseCode: 'SOP-02' })];
  assert.ok(!evaluatePrerequisites(passedPre, ctx({ attempts: others })).met);
});

test('best/last-Regel wirkt auf Voraussetzungen', () => {
  const attempts = [attempt('passed', 9000, { attemptNumber: 1 }), attempt('failed', 1000, { attemptNumber: 2 })];
  assert.ok(evaluatePrerequisites(passedPre, ctx({ attempts })).met);
  assert.ok(!evaluatePrerequisites(passedPre, ctx({ attempts, rule: 'last' })).met);
});

test('altes "passed" ohne Verifikation erfüllt "passed" nicht, wird aber gekennzeichnet', () => {
  const r = evaluatePrerequisites(passedPre, ctx({ legacyProgress: [legacyPassed] }));
  assert.ok(!r.met);
  assert.ok(r.checks[0].legacyPassedUnverified);
});

test('altes "passed" mit gültiger Admin-Verifikation erfüllt "passed"', () => {
  const r = evaluatePrerequisites(passedPre, ctx({ legacyProgress: [legacyPassed], legacyVerifications: [verification] }));
  assert.ok(r.met);
  assert.equal(r.checks[0].source, 'legacy');
});

test('Verifikation für anderen Nutzer oder Nachweis zählt nicht', () => {
  for (const v of [{ ...verification, userId: 'u2' }, { ...verification, legacyProgressId: 'lpX' }, { ...verification, reason: '' }]) {
    assert.ok(!evaluatePrerequisites(passedPre, ctx({ legacyProgress: [legacyPassed], legacyVerifications: [v] })).met);
  }
});

test('altes "passed" erfüllt "completed" auch ohne Verifikation', () => {
  const pre = [{ examId: 'e1', mode: 'completed' as const }];
  assert.ok(evaluatePrerequisites(pre, ctx({ legacyProgress: [legacyPassed] })).met);
});

test('manuelle Freischaltung gilt nur für den freigeschalteten Nutzer', () => {
  assert.ok(evaluatePrerequisites(passedPre, ctx({ manualUnlockUserUids: ['u1'] })).met);
  assert.ok(!evaluatePrerequisites(passedPre, ctx({ manualUnlockUserUids: ['u2'] })).met);
});

test('mehrere Voraussetzungen müssen alle erfüllt sein', () => {
  const pre = [{ examId: 'e1', mode: 'passed' as const }, { examId: 'e2', mode: 'passed' as const }];
  const r = evaluatePrerequisites(pre, ctx({ attempts: [attempt('passed', 9000)] }));
  assert.ok(!r.met);
  assert.deepEqual(r.checks.map(c => c.met), [true, false]);
});

test('Legacy-Nachweise gelten nur im gleichen Lehrgang; fehlender Lehrgangscode bleibt global', () => {
  const pre = [{ examId: 'e1', mode: 'completed' as const }];
  const same = { ...legacyPassed, courseCode: 'sop-01' };
  const other = { ...legacyPassed, courseCode: 'SOP-02' };
  assert.ok(evaluatePrerequisites(pre, ctx({ legacyProgress: [same] })).met);
  assert.ok(!evaluatePrerequisites(pre, ctx({ legacyProgress: [other] })).met);
  assert.ok(evaluatePrerequisites(pre, ctx({ legacyProgress: [legacyPassed] })).met);
});
