import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createLegacyVerificationDoc,
  findValidVerification,
  legacyOptionId,
  legacyVerificationId,
  mapLegacyExam,
  mapLegacyProgress,
  sumLegacyAttemptsConsumed,
  validateLegacyVerification
} from './examLegacy.ts';
import type { LegacyExamInput } from './examLegacy.ts';
import { scoreExam } from './examScore.ts';
import type { LegacyProgressRecord, LegacyVerificationDoc } from './examTypes.ts';

const legacyExam = (over: Partial<LegacyExamInput> = {}): LegacyExamInput => ({
  id: 'ex1', title: 'Altprüfung', moduleCode: 'sop-01', assessmentStage: 'final_exam', passingScore: 75, minClearance: 1,
  timeLimitMinutes: 30, examFormat: 'structured_quiz',
  questionsPayload: JSON.stringify([
    { id: 'q1', question: 'Frage 1', options: ['A', 'B', 'C'], correctIndex: 2, explanation: 'Weil' },
    { id: 'q2', question: 'Frage 2', options: ['X', 'Y'], correctIndex: 0 }
  ]),
  ...over
});

test('strukturierte Altprüfung wird auf Single Choice mit stabilen Option-IDs abgebildet', () => {
  const r = mapLegacyExam(legacyExam());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.master.status, 'published');
  assert.equal(r.master.passingScoreBasisPoints, 7500);
  assert.deepEqual(r.master.assignedCourseCodes, ['SOP-01']);
  assert.equal(r.master.maxAttempts, 3);
  assert.equal(r.master.minClearance, 1);
  assert.equal(r.master.startable, true);
  const q1 = r.master.questions[0];
  assert.equal(q1.type, 'single_choice');
  if (q1.type === 'single_choice') {
    assert.equal(q1.correctOptionId, 'opt_3');
    assert.equal(q1.options[2].id, legacyOptionId(2));
    assert.equal(q1.pointsMilli, 1000);
  }
  assert.ok(r.publication?.ok);
});

test('abgebildete Altprüfung wird wie bisher bewertet (Anteil richtiger Antworten)', () => {
  const r = mapLegacyExam(legacyExam());
  assert.ok(r.ok);
  if (!r.ok) return;
  const score = scoreExam(r.master.questions, { q1: 'opt_3', q2: 'opt_2' }, r.master.passingScoreBasisPoints);
  assert.equal(score.finalScoreBasisPoints, 5000);
  assert.equal(score.status, 'failed');
});

test('Übungstest: unbegrenzte Versuche', () => {
  const r = mapLegacyExam(legacyExam({ assessmentStage: 'test' }));
  assert.ok(r.ok && r.master.maxAttempts === null);
});

test('interaktive Altprüfung bleibt Legacy und ist nicht startbar', () => {
  const r = mapLegacyExam(legacyExam({ examFormat: 'interactive_code', questionsPayload: '[]', interactiveWidgetCode: '<p>x</p>' }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.master.isLegacyFormat, true);
  assert.equal(r.master.startable, false);
  assert.equal(r.master.questions.length, 0);
  assert.equal(r.publication, null);
});

test('fehlerhafte Altdaten werden nicht migriert und nichts wird geraten', () => {
  const bad: Array<Partial<LegacyExamInput>> = [
    { questionsPayload: 'kein json' },
    { questionsPayload: '[]' },
    { questionsPayload: JSON.stringify([{ id: 'q1', question: 'F', options: ['A', 'B'], correctIndex: 5 }]) },
    { questionsPayload: JSON.stringify([{ id: 'q1', question: 'F', options: ['A'], correctIndex: 0 }]) },
    { questionsPayload: JSON.stringify([{ id: 'q1', question: 'F', options: ['A', 'B'], correctIndex: 0 }, { id: 'q1', question: 'G', options: ['A', 'B'], correctIndex: 1 }]) },
    { examFormat: 'unbekannt' },
    { assessmentStage: 'exam' },
    { assessmentStage: '' },
    { assessmentStage: undefined as never },
    { assessmentStage: 'FINAL_EXAM' },
    { passingScore: 120 },
    { minClearance: -1 },
    { timeLimitMinutes: -1 },
    { title: ' ' }
  ];
  for (const b of bad) {
    const r = mapLegacyExam(legacyExam(b));
    assert.ok(!r.ok, JSON.stringify(b).slice(0, 60));
  }
});

test('ungültiger Lehrgangscode und krumme Bestehensgrenze erzeugen Warnungen', () => {
  const r = mapLegacyExam(legacyExam({ moduleCode: 'a/b', passingScore: 66.6 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.master.assignedCourseCodes, []);
  assert.equal(r.master.passingScoreBasisPoints, 6660);
  assert.equal(r.warnings.length, 2);
});

const progress = (over: Partial<LegacyProgressRecord> = {}): LegacyProgressRecord => ({
  id: 'lp1', userId: 'u1', targetId: 'ex1', targetType: 'final_exam', status: 'passed', scorePercent: 88, attempts: 2, ...over
});
const verification = (over: Partial<LegacyVerificationDoc> = {}): LegacyVerificationDoc => ({
  id: legacyVerificationId('lp1'), legacyProgressId: 'lp1', userId: 'u1', examId: 'ex1', verifiedStatus: 'passed',
  verifiedScoreBasisPoints: 8800,
  verifiedByUid: 'admin1', verifiedAtIso: '2026-01-01T00:00:00.000Z', reason: 'Protokoll geprüft', ...over
});

test('alter Prüfungsfortschritt wird ohne erfundene Versuche abgebildet', () => {
  const e = mapLegacyProgress(progress());
  assert.ok(e);
  assert.equal(e?.scoreBasisPoints, 8800);
  assert.equal(e?.legacyAttemptsConsumed, 2);
  assert.equal(e?.completed, true);
  assert.equal(e?.verified, false);
  assert.equal(e?.satisfiesPassed, false); // nie automatisch verifiziert
  assert.equal(mapLegacyProgress(progress({ targetType: 'module' })), null);
});

test('Altzähler: ungültige Werte zählen 0; Summe nur für Nutzer und Prüfung', () => {
  assert.equal(mapLegacyProgress(progress({ attempts: -3 }))?.legacyAttemptsConsumed, 0);
  assert.equal(mapLegacyProgress(progress({ attempts: Number.NaN }))?.legacyAttemptsConsumed, 0);
  const records = [progress({ id: 'a', attempts: 2 }), progress({ id: 'b', attempts: 1 }), progress({ id: 'c', userId: 'u2', attempts: 5 })];
  assert.equal(sumLegacyAttemptsConsumed(records, 'u1', 'ex1'), 3);
});

test('Verifikation: nur mit allen Pflichtfeldern und für genau diesen Nachweis', () => {
  assert.ok(validateLegacyVerification(verification()).ok);
  for (const bad of [{ reason: ' ' }, { verifiedByUid: '' }, { verifiedAtIso: 'gestern' }, { verifiedStatus: 'failed' }]) {
    assert.ok(!validateLegacyVerification(verification(bad as never)).ok, JSON.stringify(bad));
  }
  assert.ok(!validateLegacyVerification(null).ok);
  assert.equal(findValidVerification(progress(), [verification()])?.id, 'legacy_verification__lp1');
  assert.equal(findValidVerification(progress(), [verification({ userId: 'u2' })]), null);
  assert.equal(findValidVerification(progress(), [verification({ examId: 'ex9' })]), null);
  assert.equal(findValidVerification(progress({ status: 'failed' }), [verification()]), null);
});

test('Verifikation gilt nur für den passenden Lehrgang; fehlende Codes sind nur beidseitig global', () => {
  const p = progress({ courseCode: 'SOP-01' });
  assert.ok(findValidVerification(p, [verification({ attemptCourseCode: 'sop-01' })]));
  assert.equal(findValidVerification(p, [verification({ attemptCourseCode: 'SOP-02' })]), null);
  assert.equal(findValidVerification(progress({ scorePercent: 89 }), [verification()]), null);
  assert.equal(
    findValidVerification(progress({ updatedIso: '2026-11-06T12:00:00.000Z' }), [
      verification({ legacyUpdatedIso: '2026-11-05T12:00:00.000Z' })
    ]),
    null
  );
  assert.equal(findValidVerification(p, [verification()]), null);
  assert.equal(findValidVerification(progress(), [verification({ attemptCourseCode: 'SOP-01' })]), null);
  assert.ok(findValidVerification(progress(), [verification()]));
});

test('Legacy-Verifikationsnachweis wird ausschließlich aus einem bestandenen Prüfungsdatensatz erstellt', () => {
  const record = progress({ courseCode: 'sop-01' });
  const doc = createLegacyVerificationDoc(record, 'admin-1', '2026-11-05T12:00:00.000Z', '  Prüfprotokoll geprüft  ');
  assert.equal(doc.id, legacyVerificationId(record.id));
  assert.equal(doc.userId, record.userId);
  assert.equal(doc.examId, record.targetId);
  assert.equal(doc.attemptCourseCode, 'SOP-01');
  assert.equal(doc.verifiedScoreBasisPoints, 8800);
  assert.equal(doc.verifiedByUid, 'admin-1');
  assert.equal(doc.reason, 'Prüfprotokoll geprüft');
  assert.throws(
    () => createLegacyVerificationDoc(progress({ status: 'failed' }), 'admin-1', '2026-11-05T12:00:00.000Z', 'Geprüft'),
    /EXAM_LEGACY_SOURCE_NOT_VERIFIABLE/
  );
  assert.throws(
    () => createLegacyVerificationDoc(progress({ targetType: 'module' }), 'admin-1', '2026-11-05T12:00:00.000Z', 'Geprüft'),
    /EXAM_LEGACY_SOURCE_NOT_VERIFIABLE/
  );
  assert.throws(
    () => createLegacyVerificationDoc(progress({ courseCode: 'bad/code' }), 'admin-1', '2026-11-05T12:00:00.000Z', 'Geprüft'),
    /EXAM_LEGACY_COURSE_INVALID/
  );
});

test('mit Verifikation erfüllt altes "passed" die Bestehensvoraussetzung', () => {
  const e = mapLegacyProgress(progress(), [verification()]);
  assert.ok(e?.verified && e.satisfiesPassed);
});

test('Verifikations-ID ist deterministisch und pfadsicher', () => {
  assert.equal(legacyVerificationId('lp1'), legacyVerificationId('lp1'));
  assert.ok(!legacyVerificationId('a/b').includes('/'));
});

test('unbekannte Prüfungsstufe führt zu einem nachvollziehbaren Migrationsfehler', () => {
  const r = mapLegacyExam(legacyExam({ assessmentStage: 'practice' }));
  assert.ok(!r.ok);
  if (!r.ok) assert.ok(r.errors.some(e => e.includes('Prüfungsstufe')));
});

test('Legacy-Prüfungen außerhalb der neuen Veröffentlichungsgrenzen bleiben vorerst nicht startbar', () => {
  const r = mapLegacyExam(legacyExam({ timeLimitMinutes: 1500 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.master.status, 'published');
  assert.equal(r.master.startable, false);
  assert.ok(r.publication && !r.publication.ok);
});
