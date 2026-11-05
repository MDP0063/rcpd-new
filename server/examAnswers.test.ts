import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAnswerMap, validateAnswerValue } from './examAnswers.ts';
import { ALL_CORRECT_AUTO, ALL_QUESTIONS, FT, MATCH, MC, SC, TF } from './examTestFixtures.ts';

test('korrekte Antworten aller Fragetypen werden akzeptiert', () => {
  const result = parseAnswerMap(ALL_QUESTIONS, { ...ALL_CORRECT_AUTO, q5: 'Freitext' });
  assert.ok(result.ok);
  if (result.ok) assert.equal(result.answers.q5, 'Freitext');
});

test('leere Antwort-Map und fehlende Antworten sind erlaubt (unbeantwortet)', () => {
  const result = parseAnswerMap(ALL_QUESTIONS, {});
  assert.ok(result.ok);
  assert.equal(validateAnswerValue(SC, undefined), null);
});

test('Antwort-Map muss ein einfaches Objekt sein', () => {
  for (const bad of [null, [], 'x', 5, undefined]) {
    const r = parseAnswerMap(ALL_QUESTIONS, bad);
    assert.ok(!r.ok, String(bad));
  }
});

test('unbekannte Fragen-IDs werden abgelehnt', () => {
  const r = parseAnswerMap(ALL_QUESTIONS, { q1: 'b', zzz: 'x' });
  assert.ok(!r.ok);
  if (!r.ok) assert.ok(r.errors.some(e => e.code === 'answer_unknown_question' && e.questionId === 'zzz'));
});

test('Single Choice: nur bekannte Options-IDs als String', () => {
  assert.equal(validateAnswerValue(SC, 'a'), null);
  assert.equal(validateAnswerValue(SC, null), null); // null = Antwort zurückgesetzt
  for (const bad of ['zzz', 1, true, ['a'], {}]) {
    assert.notEqual(validateAnswerValue(SC, bad), null, JSON.stringify(bad));
  }
});

test('Multiple Choice: Array eindeutiger, bekannter IDs', () => {
  assert.equal(validateAnswerValue(MC, ['a', 'b']), null);
  assert.equal(validateAnswerValue(MC, []), null);
  for (const bad of [['a', 'a'], ['zzz'], 'a', [1], null]) {
    assert.notEqual(validateAnswerValue(MC, bad), null, JSON.stringify(bad));
  }
});

test('Wahr/Falsch: nur echte Booleans', () => {
  assert.equal(validateAnswerValue(TF, false), null);
  assert.equal(validateAnswerValue(TF, null), null); // zurückgesetzt
  for (const bad of ['true', 1, 0]) assert.notEqual(validateAnswerValue(TF, bad), null);
});

test('Matching: eindeutige Paare und Ziele, nur bekannte IDs', () => {
  assert.equal(validateAnswerValue(MATCH, [{ pairId: 'p1', targetId: 't2' }]), null);
  const bad: unknown[] = [
    [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p1', targetId: 't2' }],
    [{ pairId: 'p1', targetId: 't1' }, { pairId: 'p2', targetId: 't1' }],
    [{ pairId: 'zzz', targetId: 't1' }],
    [{ pairId: 'p1', targetId: 'zzz' }],
    [{ pairId: 'p1' }],
    ['p1'],
    'p1'
  ];
  for (const b of bad) assert.notEqual(validateAnswerValue(MATCH, b), null, JSON.stringify(b));
});

test('Matching: Antworten werden kanonisiert (Zusatzfelder entfernt)', () => {
  const r = parseAnswerMap([MATCH], { q4: [{ pairId: 'p1', targetId: 't1', correct: true }] });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.answers.q4, [{ pairId: 'p1', targetId: 't1' }]);
});

test('Freitext: Typ, Länge und Steuerzeichen', () => {
  assert.equal(validateAnswerValue(FT, 'Text\nmit Zeilenumbruch'), null);
  assert.notEqual(validateAnswerValue(FT, 5), null);
  assert.notEqual(validateAnswerValue(FT, 'x'.repeat(501)), null); // maxAnswerLength 500
  assert.notEqual(validateAnswerValue(FT, 'a\u0000b'), null);
});

test('Prototype-Schlüssel in der Antwort-Map führen nicht zu Treffern', () => {
  const raw = JSON.parse('{"__proto__": "x", "q1": "b"}');
  const r = parseAnswerMap([SC], raw);
  assert.ok(!r.ok);
});
