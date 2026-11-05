import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createMatchingShuffleOrders,
  evaluateExamAnswers,
  parseAttemptAnswers,
  projectQuestionsForAttempt
} from './examRunner.ts';
import type { ExamQuestion } from './examTypes.ts';

const questions: ExamQuestion[] = [
  {
    id: 'single', type: 'single_choice', question: 'Single?', pointsMilli: 1000,
    options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'b',
    explanation: 'Nur im Übungstest nach Abgabe sichtbar.'
  },
  {
    id: 'multi', type: 'multiple_choice', question: 'Multi?', pointsMilli: 2000,
    options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }],
    correctOptionIds: ['a', 'b']
  },
  { id: 'boolean', type: 'true_false', question: 'Wahr?', pointsMilli: 1000, correctBoolean: true },
  {
    id: 'matching', type: 'matching', question: 'Verbinde.', pointsMilli: 2000,
    matchingPairs: [
      { id: 'p1', prompt: 'Links 1', targetId: 't1', targetText: 'Rechts 1' },
      { id: 'p2', prompt: 'Links 2', targetId: 't2', targetText: 'Rechts 2' }
    ]
  },
  {
    id: 'text', type: 'free_text', question: 'Erkläre.', pointsMilli: 3000,
    gradingRubric: 'Manuelle Rubrik', maxAnswerLength: 100
  }
];

test('Prüflingsprojektion entfernt Lösungsschlüssel, Erklärungen und Freitext-Rubriken', () => {
  const orders = createMatchingShuffleOrders(questions, upper => upper - 1);
  const projected = projectQuestionsForAttempt(questions, orders);
  const serialized = JSON.stringify(projected);
  for (const secret of ['correctOptionId', 'correctOptionIds', 'correctBoolean', 'gradingRubric', 'explanation', 'targetId']) {
    assert.equal(serialized.includes(secret), false, secret);
  }
  const matching = projected.find(question => question.type === 'matching');
  assert.equal(matching?.type, 'matching');
  if (matching?.type === 'matching') {
    assert.deepEqual(matching.targets.map(target => target.id), ['t1', 't2']);
    assert.deepEqual(matching.pairs.map(pair => pair.id), ['p1', 'p2']);
  }
});

test('Matching-Zielreihenfolge wird pro Versuch gespeichert und streng validiert', () => {
  const matching = questions.filter(question => question.type === 'matching');
  const orders = createMatchingShuffleOrders(matching, upper => upper - 1);
  assert.deepEqual(orders.matching, ['t1', 't2']);
  assert.throws(() => projectQuestionsForAttempt(matching, { matching: ['t1', 't1'] }), /EXAM_MATCHING_SHUFFLE_INVALID/);
  assert.throws(() => projectQuestionsForAttempt(matching, {}), /EXAM_MATCHING_SHUFFLE_INVALID/);
  assert.throws(() => createMatchingShuffleOrders(matching, () => 99), /EXAM_MATCHING_SHUFFLE_INVALID/);
});

test('Antworten werden typisiert validiert; unbekannte, doppelte und fremde IDs werden abgelehnt', () => {
  assert.deepEqual(
    parseAttemptAnswers({ single: 'b', multi: ['a', 'b'], boolean: false, matching: [{ pairId: 'p1', targetId: 't2' }], text: 'Antwort' }, questions),
    { single: 'b', multi: ['a', 'b'], boolean: false, matching: [{ pairId: 'p1', targetId: 't2' }], text: 'Antwort' }
  );
  assert.throws(() => parseAttemptAnswers({ unknown: 'x' }, questions), /EXAM_ANSWER_QUESTION_UNKNOWN/);
  assert.throws(() => parseAttemptAnswers({ multi: ['a', 'a'] }, questions), /EXAM_ANSWER_INVALID/);
  assert.throws(() => parseAttemptAnswers({ matching: [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p2', targetId: 't1' }] }, questions), /EXAM_ANSWER_INVALID/);
  assert.throws(() => parseAttemptAnswers({ single: 'not-an-option' }, questions), /EXAM_ANSWER_INVALID/);
  assert.throws(() => parseAttemptAnswers({ text: 'x'.repeat(101) }, questions), /EXAM_ANSWER_INVALID/);
  assert.throws(() => parseAttemptAnswers(['not', 'an', 'object'], questions), /EXAM_ANSWERS_INVALID/);
});

test('Single Choice, True/False und Matching werden ausschließlich serverseitig bewertet', () => {
  const selected = parseAttemptAnswers({
    single: 'b',
    multi: ['a', 'b'],
    boolean: true,
    matching: [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p2', targetId: 't2' }],
    text: 'Antwort'
  }, questions);
  const result = evaluateExamAnswers(questions, selected, 7500);
  assert.equal(result.status, 'pending_review');
  assert.equal(result.automaticallyEarnedPointsMilli, 6000);
  assert.equal(result.totalPossiblePointsMilli, 9000);
  assert.equal(result.preliminaryScoreBasisPoints, 6667);
  assert.equal(result.finalScoreBasisPoints, null);
  assert.equal(result.requiresManualReview, true);
});

test('Multiple Choice verwendet die spezifizierte Teilpunktformel und zieht falsche Auswahl ab', () => {
  const multi = questions.filter(question => question.type === 'multiple_choice');
  const answer = parseAttemptAnswers({ multi: ['a', 'c'] }, multi);
  const result = evaluateExamAnswers(multi, answer, 5000);
  // (1 richtig - 1 falsch) / 2 richtige Optionen = 0 Punkte.
  assert.equal(result.automaticallyEarnedPointsMilli, 0);
  assert.equal(result.status, 'failed');
});

test('Multiple Choice rundet Teilpunkte deterministisch auf Tausendstel-Punkte', () => {
  const multi = questions.filter(question => question.type === 'multiple_choice');
  const answer = parseAttemptAnswers({ multi: ['a'] }, multi);
  const result = evaluateExamAnswers(multi, answer, 5000);
  assert.equal(result.automaticallyEarnedPointsMilli, 1000);
});

test('Freitext hält gemischte Prüfungen bis zur manuellen Korrektur auf pending_review', () => {
  const mixed = questions.filter(question => question.type === 'single_choice' || question.type === 'free_text');
  const answers = parseAttemptAnswers({ single: 'b', text: 'Textantwort' }, mixed);
  const result = evaluateExamAnswers(mixed, answers, 7500);
  assert.equal(result.status, 'pending_review');
  assert.equal(result.automaticallyEarnedPointsMilli, 1000);
  assert.equal(result.finalScoreBasisPoints, null);
  assert.equal(result.requiresManualReview, true);
});

test('Eine reine automatisch bewertete Prüfung erhält einen endgültigen Bestehensstatus', () => {
  const objective = questions.filter(question => question.type !== 'free_text');
  const answers = parseAttemptAnswers({
    single: 'b', multi: ['a', 'b'], boolean: true,
    matching: [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p2', targetId: 't2' }]
  }, objective);
  const result = evaluateExamAnswers(objective, answers, 7500);
  assert.equal(result.status, 'passed');
  assert.equal(result.finalScoreBasisPoints, 10000);
  assert.equal(result.requiresManualReview, false);
});

test('Leerer Freitext benötigt keine manuelle Prüfung, beantworteter Freitext schon', () => {
  const text = questions.filter(question => question.type === 'free_text');
  const blank = evaluateExamAnswers(text, parseAttemptAnswers({}, text), 5000);
  assert.equal(blank.status, 'failed');
  assert.equal(blank.requiresManualReview, false);
  assert.notEqual(blank.finalScoreBasisPoints, null);
  assert.equal(evaluateExamAnswers(text, parseAttemptAnswers({ text: '  ' }, text), 5000).requiresManualReview, false);
  assert.equal(evaluateExamAnswers(text, parseAttemptAnswers({ text: 'Antwort' }, text), 5000).status, 'pending_review');
});

test('Fehlerhafte Bestehensgrenzen und unsichere Gesamtpunktzahlen werden abgelehnt', () => {
  const objective = questions.filter(question => question.type !== 'free_text');
  const answers = parseAttemptAnswers({}, objective);
  assert.throws(() => evaluateExamAnswers(objective, answers, -1), /EXAM_GRADING_INPUT_INVALID/);
});
