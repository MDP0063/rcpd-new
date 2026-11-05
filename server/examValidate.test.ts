import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SC, validExam } from './examTestFixtures.ts';
import {
  checkSnapshotSize,
  isHttpsUrl,
  isValidId,
  normalizeCourseCode,
  validateExamForPublication
} from './examValidate.ts';

function codes(def: unknown): string[] {
  return validateExamForPublication(def).errors.map(e => e.code);
}

test('gültige Prüfung mit allen Fragetypen besteht die Validierung', () => {
  const result = validateExamForPublication(validExam());
  assert.deepEqual(result.errors, []);
  assert.ok(result.ok);
});

test('Nicht-Objekt und fehlende Fragen werden abgelehnt', () => {
  assert.deepEqual(codes(null), ['definition_invalid']);
  assert.ok(codes(validExam({ questions: [] })).includes('questions_missing'));
  assert.ok(codes({ ...validExam(), questions: 'x' }).includes('questions_missing'));
});

test('Fragen-IDs müssen vorhanden und eindeutig sein', () => {
  const dup = validExam();
  dup.questions[1] = { ...dup.questions[1], id: dup.questions[0].id } as typeof dup.questions[1];
  assert.ok(codes(dup).includes('question_id_duplicate'));
  const empty = validExam();
  empty.questions[0] = { ...empty.questions[0], id: '' } as typeof empty.questions[0];
  assert.ok(codes(empty).includes('question_id_invalid'));
});

test('unbekannter Fragetyp wird abgelehnt', () => {
  const exam = validExam();
  (exam.questions[0] as unknown as { type: string }).type = 'essay';
  assert.ok(codes(exam).includes('question_type_unsupported'));
});

test('Punkte müssen ganze Zahlen größer 0 sein', () => {
  for (const bad of [0, -1000, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1000']) {
    const exam = validExam();
    (exam.questions[0] as unknown as { pointsMilli: unknown }).pointsMilli = bad;
    assert.ok(codes(exam).includes('points_invalid'), `Wert ${String(bad)}`);
  }
});

test('Single Choice: mindestens zwei Optionen und genau eine gültige richtige Option', () => {
  const one = validExam({ questions: [{ ...SC, options: [{ id: 'a', text: 'A' }] }] });
  assert.ok(codes(one).includes('options_count'));
  const wrong = validExam({ questions: [{ ...SC, correctOptionId: 'zzz' }] });
  assert.ok(codes(wrong).includes('correct_option_invalid'));
  const dupOption = validExam({
    questions: [{ ...SC, options: [{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }], correctOptionId: 'a' }]
  });
  assert.ok(codes(dupOption).includes('option_id_duplicate'));
});

test('Multiple Choice: mindestens eine richtige, gültige und eindeutige Option', () => {
  const base = validExam().questions[1] as unknown as Record<string, unknown>;
  const none = validExam();
  none.questions[1] = { ...base, correctOptionIds: [] } as never;
  assert.ok(codes(none).includes('correct_options_missing'));
  const unknown = validExam();
  unknown.questions[1] = { ...base, correctOptionIds: ['a', 'zzz'] } as never;
  assert.ok(codes(unknown).includes('correct_options_invalid'));
  const dup = validExam();
  dup.questions[1] = { ...base, correctOptionIds: ['a', 'a'] } as never;
  assert.ok(codes(dup).includes('correct_options_invalid'));
});

test('Wahr/Falsch braucht einen echten Boolean als Lösungsschlüssel', () => {
  const exam = validExam();
  (exam.questions[2] as unknown as { correctBoolean: unknown }).correctBoolean = 'true';
  assert.ok(codes(exam).includes('correct_boolean_invalid'));
});

test('Matching: mindestens zwei Paare, eindeutige Paar- und Ziel-IDs', () => {
  const base = validExam().questions[3] as unknown as { matchingPairs: Array<Record<string, string>> };
  const single = validExam();
  single.questions[3] = { ...base, matchingPairs: [base.matchingPairs[0]] } as never;
  assert.ok(codes(single).includes('pairs_count'));

  const dupTarget = validExam();
  dupTarget.questions[3] = {
    ...base,
    matchingPairs: [base.matchingPairs[0], { ...base.matchingPairs[1], targetId: 't1' }]
  } as never;
  assert.ok(codes(dupTarget).includes('target_id_duplicate'));

  const dupPair = validExam();
  dupPair.questions[3] = {
    ...base,
    matchingPairs: [base.matchingPairs[0], { ...base.matchingPairs[1], id: 'p1' }]
  } as never;
  assert.ok(codes(dupPair).includes('pair_id_duplicate'));

  const noText = validExam();
  noText.questions[3] = { ...base, matchingPairs: [base.matchingPairs[0], { ...base.matchingPairs[1], targetText: ' ' }] } as never;
  assert.ok(codes(noText).includes('pair_text_invalid'));
});

test('Freitext braucht eine Rubrik; maximale Antwortlänge ist begrenzt', () => {
  const base = validExam().questions[4] as unknown as Record<string, unknown>;
  const noRubric = validExam();
  noRubric.questions[4] = { ...base, gradingRubric: '  ' } as never;
  assert.ok(codes(noRubric).includes('rubric_missing'));
  const tooLong = validExam();
  tooLong.questions[4] = { ...base, maxAnswerLength: 4001 } as never;
  assert.ok(codes(tooLong).includes('max_answer_length_invalid'));
});

test('Bild-URLs müssen gültige HTTPS-URLs sein', () => {
  assert.ok(isHttpsUrl('https://example.org/bild.png'));
  for (const bad of ['http://example.org/a.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://u:p@example.org/a', 'nicht-url', '']) {
    assert.ok(!isHttpsUrl(bad), bad);
  }
  const exam = validExam();
  (exam.questions[0] as unknown as { imageUrl: string }).imageUrl = 'http://example.org/a.png';
  assert.ok(codes(exam).includes('image_url_invalid'));
  const ok = validExam();
  (ok.questions[0] as unknown as { imageUrl: string }).imageUrl = 'https://example.org/a.png';
  assert.ok(validateExamForPublication(ok).ok);
});

test('Parameter: Zeitlimit, Bestehensgrenze und Versuchslimit', () => {
  assert.ok(validateExamForPublication(validExam({ timeLimitMinutes: 0 })).ok); // unbegrenzt
  for (const t of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 24 * 60 + 1]) {
    assert.ok(codes(validExam({ timeLimitMinutes: t })).includes('time_limit_invalid'), String(t));
  }
  for (const p of [-1, 10001, 75.5, Number.NaN]) {
    assert.ok(codes(validExam({ passingScoreBasisPoints: p })).includes('passing_score_invalid'), String(p));
  }
  assert.ok(validateExamForPublication(validExam({ passingScoreBasisPoints: 0 })).ok);
  assert.ok(validateExamForPublication(validExam({ passingScoreBasisPoints: 10000 })).ok);
  for (const m of [-1, 1.5, Number.NaN]) {
    assert.ok(codes(validExam({ maxAttempts: m })).includes('max_attempts_invalid'), String(m));
  }
  for (const m of [null, undefined, 0, 3]) {
    assert.ok(validateExamForPublication(validExam({ maxAttempts: m })).ok, String(m));
  }
});

test('Parameter: Voraussetzungen und Lehrgangscodes', () => {
  const okPre = validExam({ prerequisites: [{ examId: 'e1', mode: 'passed', minScoreBasisPoints: 8000 }] });
  assert.ok(validateExamForPublication(okPre).ok);
  assert.ok(codes(validExam({ prerequisites: [{ examId: 'e1', mode: 'completed', minScoreBasisPoints: 100 }] })).includes('prerequisite_min_invalid'));
  assert.ok(codes(validExam({ prerequisites: [{ examId: 'e1', mode: 'maybe' as never }] })).includes('prerequisite_invalid'));
  assert.ok(codes(validExam({ prerequisites: [{ examId: 'e1', mode: 'passed' }, { examId: 'e1', mode: 'completed' }] })).includes('prerequisite_duplicate'));

  assert.ok(validateExamForPublication(validExam({ assignedCourseCodes: [] })).ok);
  assert.ok(codes(validExam({ assignedCourseCodes: ['*'] })).includes('course_code_invalid'));
  assert.ok(codes(validExam({ assignedCourseCodes: ['SOP-01', 'sop-01'] })).includes('course_code_invalid'));
  assert.equal(normalizeCourseCode(' sop-01 '), 'SOP-01');
  assert.equal(normalizeCourseCode('a/b'), null);
});

test('IDs: keine Pfadzeichen, Steuerzeichen oder Prototype-Namen', () => {
  assert.ok(isValidId('q_1'));
  for (const bad of ['', ' q', 'a/b', 'a\nb', '__proto__', 'x'.repeat(101), 5, null]) {
    assert.ok(!isValidId(bad), String(bad));
  }
});

test('Snapshot-Größe wird nach UTF-8-Bytes geprüft', () => {
  assert.ok(checkSnapshotSize({ a: 'x' }).ok);
  const umlauts = { text: 'ä'.repeat(300_000) }; // 2 Bytes je Zeichen: über 500.000 Bytes, unter 500.000 Zeichen
  const result = checkSnapshotSize(umlauts);
  assert.ok(!result.ok);
  assert.ok(result.bytes > 500_000);
  assert.ok(!checkSnapshotSize({ a: 'xxxxxxxxxx' }, 10).ok);
});
