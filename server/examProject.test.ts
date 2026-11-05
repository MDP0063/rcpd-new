import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createMatchingShuffle,
  projectAnswersForParticipant,
  projectExamForParticipant,
  projectQuestionForParticipant,
  projectResultForParticipant,
  shuffled
} from './examProject.ts';
import { scoreExam } from './examScore.ts';
import { ALL_CORRECT_AUTO, ALL_QUESTIONS, MATCH, SECRET_EXPLANATION, SECRET_RUBRIC } from './examTestFixtures.ts';

const shuffle = () => createMatchingShuffle(ALL_QUESTIONS);

test('Fragenprojektion enthält keine Lösungsschlüssel, Rubriken oder Erklärungen', () => {
  const json = JSON.stringify(projectExamForParticipant(ALL_QUESTIONS, shuffle()));
  for (const forbidden of [
    'correctOptionId', 'correctOptionIds', 'correctBoolean', 'gradingRubric', 'explanation',
    'legacyCorrectIndex', 'targetId":"t1","prompt', SECRET_EXPLANATION, SECRET_RUBRIC
  ]) {
    assert.ok(!json.includes(forbidden), `Leck: ${forbidden}`);
  }
});

test('Projektion enthält die für das Beantworten nötigen Felder', () => {
  const [sc, mc, tf, match, ft] = projectExamForParticipant(ALL_QUESTIONS, shuffle());
  assert.deepEqual(sc.options?.map(o => o.id), ['a', 'b', 'c']);
  assert.equal(mc.options?.length, 4);
  assert.equal(tf.type, 'true_false');
  assert.equal(match.matching?.pairs.length, 3);
  assert.equal(match.matching?.targets.length, 3);
  assert.equal(ft.maxAnswerLength, 500);
});

test('Matching-Projektion verrät die Zuordnung nicht über Struktur oder Reihenfolge', () => {
  const projected = projectQuestionForParticipant(MATCH, { q4: ['t3', 't1', 't2'] });
  const json = JSON.stringify(projected);
  assert.ok(!json.includes('"targetId"'));
  assert.deepEqual(projected.matching?.targets.map(t => t.id), ['t3', 't1', 't2']);
  assert.deepEqual(projected.matching?.pairs.map(p => p.id), ['p1', 'p2', 'p3']);
});

test('Matching ohne gültige Permutation wird abgelehnt', () => {
  assert.throws(() => projectQuestionForParticipant(MATCH, {}));
  assert.throws(() => projectQuestionForParticipant(MATCH, { q4: ['t1', 't2'] }));
  assert.throws(() => projectQuestionForParticipant(MATCH, { q4: ['t1', 't1', 't2'] }));
  assert.throws(() => projectQuestionForParticipant(MATCH, { q4: ['t1', 't2', 'zzz'] }));
});

test('Mischen: Permutation, deterministisch mit injizierter Zufallsquelle', () => {
  const items = ['a', 'b', 'c', 'd'];
  assert.deepEqual(shuffled(items, () => 0).sort(), items);
  assert.deepEqual(shuffled(items, () => 0), shuffled(items, () => 0));
  assert.deepEqual(items, ['a', 'b', 'c', 'd']); // Eingabe unverändert
  const s = createMatchingShuffle(ALL_QUESTIONS);
  assert.deepEqual(Object.keys(s), ['q4']);
  assert.deepEqual([...s.q4].sort(), ['t1', 't2', 't3']);
});

test('gespeicherte Antworten werden gefiltert und bereinigt', () => {
  const out = projectAnswersForParticipant(ALL_QUESTIONS, {
    q1: 'b', q2: ['a', 'a'], q3: 'x', fremd: 1, q4: [{ pairId: 'p1', targetId: 't1', geheim: 1 }]
  });
  assert.deepEqual(out, { q1: 'b', q4: [{ pairId: 'p1', targetId: 't1' }] });
  assert.deepEqual(projectAnswersForParticipant(ALL_QUESTIONS, null), {});
});

test('Ergebnis Abschlussprüfung: keine Aufschlüsselung, keine Erklärungen', () => {
  const score = scoreExam(ALL_QUESTIONS, { ...ALL_CORRECT_AUTO, q5: '' }, 5000);
  const result = projectResultForParticipant({ assessmentStage: 'final_exam', questions: ALL_QUESTIONS, score });
  assert.equal(result.questions, undefined);
  const json = JSON.stringify(result);
  assert.ok(!json.includes(SECRET_EXPLANATION));
  assert.ok(!json.includes(SECRET_RUBRIC));
  assert.equal(result.status, 'passed');
  assert.equal(result.displayPercent, 64);
});

test('Ergebnis Übungstest: Aufschlüsselung mit Erklärung, aber ohne Schlüssel', () => {
  const score = scoreExam(ALL_QUESTIONS, { q1: 'a' }, 5000);
  const result = projectResultForParticipant({ assessmentStage: 'test', questions: ALL_QUESTIONS, score });
  assert.equal(result.questions?.length, 5);
  assert.equal(result.questions?.[0].explanation, SECRET_EXPLANATION);
  const json = JSON.stringify(result);
  for (const forbidden of ['correctOptionId', 'correctBoolean', 'gradingRubric', SECRET_RUBRIC]) {
    assert.ok(!json.includes(forbidden), forbidden);
  }
});

test('Ergebnis bei pending_review enthält kein Endergebnis', () => {
  const score = scoreExam(ALL_QUESTIONS, { ...ALL_CORRECT_AUTO, q5: 'Antwort' }, 7500);
  const result = projectResultForParticipant({ assessmentStage: 'final_exam', questions: ALL_QUESTIONS, score });
  assert.equal(result.status, 'pending_review');
  assert.equal(result.finalScoreBasisPoints, null);
  assert.equal(result.displayPercent, null);
});
