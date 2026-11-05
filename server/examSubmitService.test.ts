import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as nodeTest } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { startExamAttempt } from './examAttemptService.ts';
import { saveExamAttemptAnswers } from './examAutosaveService.ts';
import { submitExamAttempt } from './examSubmitService.ts';

async function withAttempt(
  run: (repository: ReturnType<typeof createJsonExamRepository>) => Promise<void>,
  options: { timeLimitMinutes?: number; assessmentStage?: 'test' | 'final_exam'; includeFreeText?: boolean } = {}
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-exam-submit-'));
  try {
    const repository = createJsonExamRepository(directory);
    await repository.create('exam_masters', 'exam-1', {
      id: 'exam-1',
      status: 'published',
      startable: true,
      minClearance: 0,
      assignedCourseCodes: ['PC-101'],
      currentPublishedVersionId: 'exam-1__v1'
    });
    await repository.create('exam_versions', 'exam-1__v1', {
      id: 'exam-1__v1',
      examId: 'exam-1',
      versionNumber: 1,
      title: 'Submit-Test',
      assessmentStage: options.assessmentStage ?? 'test',
      minClearance: 0,
      timeLimitMinutes: options.timeLimitMinutes ?? 30,
      passingScoreBasisPoints: 7500,
      maxAttempts: null,
      questionsSnapshot: [
        {
          id: 'q1',
          type: 'single_choice',
          question: 'Frage?',
          pointsMilli: 1000,
          options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
          correctOptionId: 'b',
          explanation: 'B ist richtig.'
        },
        ...(options.includeFreeText === false ? [] : [{
          id: 'q2',
          type: 'free_text',
          question: 'Begründung?',
          pointsMilli: 1000,
          maxAnswerLength: 4000,
          gradingRubric: 'Intern'
        }])
      ]
    });
    await startExamAttempt(
      repository,
      'exam-1',
      { uid: 'user-1', displayName: 'Officer One', clearanceLevel: 0 },
      'PC-101',
      Date.parse('2026-11-05T12:00:00.000Z'),
      () => 'attempt-1'
    );
    await run(repository);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const at = (minute: number) => Date.parse('2026-11-05T12:00:00.000Z') + minute * 60_000;

nodeTest('Abgabe wertet den letzten gespeicherten Stand aus und setzt Freitext auf pending_review', async () => {
  await withAttempt(async repository => {
    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, {
      q1: 'b',
      q2: 'Manuelle Antwort'
    }, at(1));
    const result = await submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(2));
    assert.equal(result.expired, false);
    assert.equal(result.alreadySubmitted, false);
    assert.equal(result.submission.status, 'pending_review');
    assert.equal(result.submission.automaticallyEarnedPointsMilli, 1000);
    assert.equal(result.submission.finalScoreBasisPoints, null);
    assert.equal(result.submission.questionResults[0].correct, true);
    assert.equal(result.submission.questionResults[0].explanation, 'B ist richtig.');
    const stored = await repository.get('exam_attempts', 'attempt-1');
    assert.equal(stored?.submissionReason, 'submitted');
    assert.equal(stored?.submittedAtIso, new Date(at(2)).toISOString());
  });
});

nodeTest('Wiederholte Abgabe ist idempotent und verändert das gespeicherte Ergebnis nicht', async () => {
  await withAttempt(async repository => {
    const first = await submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(2));
    const second = await submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(3));
    assert.equal(second.alreadySubmitted, true);
    assert.deepEqual(second.submission, first.submission);
    assert.equal(second.submission.submittedAtIso, new Date(at(2)).toISOString());
  });
});


nodeTest('Objektive Prüfung wird nach Abgabe anhand der Bestehensgrenze final bewertet', async () => {
  await withAttempt(async repository => {
    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'b' }, at(1));
    const result = await submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(2));
    assert.equal(result.submission.status, 'passed');
    assert.equal(result.submission.finalScoreBasisPoints, 10_000);
  }, { includeFreeText: false });
});

nodeTest('Nicht bestandene objektive Prüfung erhält den endgültigen Fehlstatus', async () => {
  await withAttempt(async repository => {
    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'a' }, at(1));
    const result = await submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(2));
    assert.equal(result.submission.status, 'failed');
    assert.equal(result.submission.finalScoreBasisPoints, 0);
  }, { includeFreeText: false });
});

nodeTest('Eingang exakt zur Deadline ist eine reguläre Abgabe', async () => {
  await withAttempt(async repository => {
    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'b' }, at(1));
    const result = await submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(30));
    assert.equal(result.expired, false);
    assert.equal(result.submission.status, 'passed');
    assert.equal(result.submission.submittedAtIso, new Date(at(30)).toISOString());
  }, { includeFreeText: false });
});

nodeTest('Verspätete Abgabe finalisiert ausschließlich den letzten Autosave-Stand', async () => {
  await withAttempt(async repository => {
    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'b' }, at(1));
    const result = await submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(31));
    assert.equal(result.expired, true);
    assert.equal(result.submission.status, 'passed');
    assert.equal(result.submission.submittedAtIso, new Date(at(30)).toISOString());
    const stored = await repository.get('exam_attempts', 'attempt-1');
    assert.equal(stored?.submissionReason, 'time_expired');
    assert.equal(stored?.autoFinalizedAtIso, new Date(at(31)).toISOString());
    assert.equal((stored?.answers as Record<string, unknown>).q1, 'b');
  }, { includeFreeText: false });
});

nodeTest('Fremde Teilnehmer dürfen einen Versuch nicht abgeben', async () => {
  await withAttempt(async repository => {
    await assert.rejects(
      submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-2', at(2)),
      /EXAM_ATTEMPT_FORBIDDEN/
    );
  });
});

nodeTest('Versuche anderer Prüfungen und unbekannte Versuche werden nicht abgegeben', async () => {
  await withAttempt(async repository => {
    await assert.rejects(
      submitExamAttempt(repository, 'other-exam', 'attempt-1', 'user-1', at(2)),
      /EXAM_ATTEMPT_NOT_FOUND/
    );
    await assert.rejects(
      submitExamAttempt(repository, 'exam-1', 'missing-attempt', 'user-1', at(2)),
      /EXAM_ATTEMPT_NOT_FOUND/
    );
  });
});

nodeTest('Abgabe nach Admin-Invalidierung wird abgelehnt', async () => {
  await withAttempt(async repository => {
    await repository.runTransaction(transaction => transaction.invalidateAttempt('attempt-1', {
      adminUid: 'admin-1',
      atIso: new Date(at(1)).toISOString(),
      reason: 'Testinvalidierung'
    }));
    await assert.rejects(
      submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(2)),
      /EXAM_ATTEMPT_NOT_ACTIVE/
    );
  });
});

nodeTest('Abschlussprüfungen geben keine Richtig/Falsch-Hinweise oder Erklärungen an Teilnehmer zurück', async () => {
  await withAttempt(async repository => {
    const result = await submitExamAttempt(repository, 'exam-1', 'attempt-1', 'user-1', at(2));
    assert.deepEqual(result.submission.questionResults, []);
  }, { assessmentStage: 'final_exam' });
});
