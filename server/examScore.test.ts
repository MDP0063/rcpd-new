import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scoreAutoQuestion, scoreExam } from './examScore.ts';
import { ALL_CORRECT_AUTO, ALL_QUESTIONS, AUTO_QUESTIONS, FT, MATCH, MC, SC, TF } from './examTestFixtures.ts';
import type { MatchingQuestion, MultipleChoiceQuestion } from './examTypes.ts';

test('Single Choice und Wahr/Falsch: volle oder keine Punkte', () => {
  assert.equal(scoreAutoQuestion(SC, 'b'), 1000);
  assert.equal(scoreAutoQuestion(SC, 'a'), 0);
  assert.equal(scoreAutoQuestion(SC, undefined), 0);
  assert.equal(scoreAutoQuestion(SC, ['b']), 0);
  assert.equal(scoreAutoQuestion(TF, true), 1000);
  assert.equal(scoreAutoQuestion(TF, false), 0);
  assert.equal(scoreAutoQuestion(TF, 'true'), 0);
});

test('Multiple Choice: P = max(0, (R-F)/N * Pmax)', () => {
  assert.equal(scoreAutoQuestion(MC, ['a', 'c']), 2000);
  assert.equal(scoreAutoQuestion(MC, ['a']), 1000);
  assert.equal(scoreAutoQuestion(MC, ['a', 'b']), 0); // 1 richtig - 1 falsch
  assert.equal(scoreAutoQuestion(MC, ['b', 'd']), 0); // nie negativ
  assert.equal(scoreAutoQuestion(MC, ['a', 'c', 'b']), 1000);
  assert.equal(scoreAutoQuestion(MC, ['a', 'a', 'c', 'c']), 2000); // Duplikate zählen einmal
  assert.equal(scoreAutoQuestion(MC, ['a', 'fremd']), 1000); // fremde ID: kein Abzug
  assert.equal(scoreAutoQuestion(MC, []), 0);
  assert.equal(scoreAutoQuestion(MC, 'a'), 0);
});

test('Multiple Choice: kaufmännische Rundung auf Tausendstel-Punkte', () => {
  const q: MultipleChoiceQuestion = { ...MC, pointsMilli: 1000, correctOptionIds: ['a', 'b', 'c'], options: [...MC.options, { id: 'e', text: 'E' }] };
  assert.equal(scoreAutoQuestion(q, ['a']), 333);
  assert.equal(scoreAutoQuestion(q, ['a', 'b']), 667);
});

test('Matching: P = K/N * Pmax, jede ID höchstens einmal', () => {
  assert.equal(scoreAutoQuestion(MATCH, ALL_CORRECT_AUTO.q4), 3000);
  assert.equal(scoreAutoQuestion(MATCH, [{ pairId: 'p1', targetId: 't1' }]), 1000);
  assert.equal(scoreAutoQuestion(MATCH, [{ pairId: 'p1', targetId: 't2' }, { pairId: 'p2', targetId: 't1' }]), 0);
  // doppelte Paar-ID zählt nur beim ersten Auftreten
  assert.equal(scoreAutoQuestion(MATCH, [{ pairId: 'p1', targetId: 't2' }, { pairId: 'p1', targetId: 't1' }]), 0);
  // doppeltes Ziel: zweites Vorkommen ohne Wirkung
  assert.equal(scoreAutoQuestion(MATCH, [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p2', targetId: 't1' }]), 1000);
  assert.equal(scoreAutoQuestion(MATCH, 'x'), 0);
  assert.equal(scoreAutoQuestion(MATCH, [null, 5, {}]), 0);
  const q: MatchingQuestion = { ...MATCH, pointsMilli: 1000 };
  assert.equal(scoreAutoQuestion(q, [{ pairId: 'p1', targetId: 't1' }]), 333);
});

test('Freitext wird nie automatisch bewertet', () => {
  assert.equal(scoreAutoQuestion(FT, 'sehr gute Antwort'), 0);
});

test('alle Antworten richtig: bestanden mit 100 %', () => {
  const r = scoreExam(AUTO_QUESTIONS, ALL_CORRECT_AUTO, 7500);
  assert.equal(r.status, 'passed');
  assert.equal(r.totalPossiblePointsMilli, 7000);
  assert.equal(r.autoEarnedPointsMilli, 7000);
  assert.equal(r.finalScoreBasisPoints, 10000);
});

test('keine Antworten: durchgefallen mit 0 Punkten', () => {
  const r = scoreExam(AUTO_QUESTIONS, {}, 7500);
  assert.equal(r.status, 'failed');
  assert.equal(r.finalScoreBasisPoints, 0);
  assert.ok(r.questionResults.every(q => !q.answered && q.earnedPointsMilli === 0));
});

test('Bestehensgrenze: exakt 75 % besteht, knapp darunter nicht', () => {
  const two = [SC, { ...TF, id: 'q3', pointsMilli: 1000 }, { ...SC, id: 'q6' }, { ...SC, id: 'q7' }];
  // 3 von 4 = 75 %
  assert.equal(scoreExam(two, { q1: 'b', q3: true, q6: 'b' }, 7500).status, 'passed');
  assert.equal(scoreExam(two, { q1: 'b', q3: true }, 7500).status, 'failed');
  // 74,95 %: 1499 von 2000
  const q1 = { ...SC, id: 'x1', pointsMilli: 1499 };
  const q2 = { ...SC, id: 'x2', pointsMilli: 501 };
  const r = scoreExam([q1, q2], { x1: 'b' }, 7500);
  assert.equal(r.status, 'failed');
  assert.equal(r.finalScoreBasisPoints, 7495);
});

test('Freitext offen: pending_review ohne Endergebnis', () => {
  const r = scoreExam(ALL_QUESTIONS, { ...ALL_CORRECT_AUTO, q5: 'Antwort' }, 7500);
  assert.equal(r.status, 'pending_review');
  assert.equal(r.finalScoreBasisPoints, null);
  assert.deepEqual(r.openManualQuestionIds, ['q5']);
  assert.equal(r.preliminaryScoreBasisPoints, 6364); // 7000 von 11000
});

test('Freitext leer: 0 Punkte, keine Korrektur nötig', () => {
  const r = scoreExam(ALL_QUESTIONS, { ...ALL_CORRECT_AUTO, q5: '   ' }, 5000);
  assert.notEqual(r.status, 'pending_review');
  assert.equal(r.status, 'passed'); // 7000/11000 = 63,6 % >= 50 %
});

test('Freitext manuell bewertet: Endergebnis und Status', () => {
  const answers = { ...ALL_CORRECT_AUTO, q5: 'Antwort' };
  const full = scoreExam(ALL_QUESTIONS, answers, 7500, { q5: 4000 });
  assert.equal(full.status, 'passed');
  assert.equal(full.finalScoreBasisPoints, 10000);
  const none = scoreExam(ALL_QUESTIONS, answers, 7500, { q5: 0 });
  assert.equal(none.status, 'failed'); // 7000/11000 < 75 %
  assert.equal(none.finalScoreBasisPoints, 6364);
});

test('ungültige manuelle Noten und fehlerhafte Prüfungen lösen Fehler aus', () => {
  const answers = { q5: 'x' };
  assert.throws(() => scoreExam([FT], answers, 7500, { q5: 4001 }), RangeError);
  assert.throws(() => scoreExam([FT], answers, 7500, { q5: -1 }), RangeError);
  assert.throws(() => scoreExam([FT], answers, 7500, { q5: 1.5 }), RangeError);
  assert.throws(() => scoreExam([], {}, 7500), RangeError);
  assert.throws(() => scoreExam([{ ...SC, pointsMilli: 0 }], {}, 7500), RangeError);
});

test('fremde Antwort-Schlüssel und Prototype-Namen beeinflussen die Bewertung nicht', () => {
  const answers = JSON.parse('{"q1":"b","fremd":"b","__proto__":"b"}');
  const r = scoreExam([SC], answers, 7500);
  assert.equal(r.autoEarnedPointsMilli, 1000);
});

test('große gültige Punktzahlen: Teilpunkte und Prozent exakt', () => {
  const big = 4_000_000_000_000_001; // ungerade, Produkt mit Anzahl > 2^53
  const mc: MultipleChoiceQuestion = { ...MC, pointsMilli: big, correctOptionIds: ['a', 'b', 'c'], options: [...MC.options, { id: 'e', text: 'E' }] };
  const ref = (k: bigint, n: bigint) => Number((2n * k * BigInt(big) + n) / (2n * n));
  assert.equal(scoreAutoQuestion(mc, ['a', 'b']), ref(2n, 3n));
  assert.equal(scoreAutoQuestion(mc, ['a', 'b', 'c']), big);
  const m: MatchingQuestion = { ...MATCH, pointsMilli: big };
  assert.equal(scoreAutoQuestion(m, [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p2', targetId: 't2' }]), ref(2n, 3n));
  const r = scoreExam([m], { q4: [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p2', targetId: 't2' }] }, 6667);
  assert.equal(r.finalScoreBasisPoints, 6667);
  assert.equal(r.status, 'failed'); // 66,666...% liegt exakt unter 66,67 %, auch wenn die Anzeige 6667 lautet
  assert.equal(scoreExam([m], { q4: [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p2', targetId: 't2' }] }, 6666).status, 'passed');
});

test('Gesamtpunktzahl über dem sicheren Bereich wird abgelehnt', () => {
  const a = { ...SC, id: 'x1', pointsMilli: Number.MAX_SAFE_INTEGER };
  const b = { ...SC, id: 'x2', pointsMilli: 1 };
  assert.throws(() => scoreExam([a, b], {}, 7500), RangeError);
});
