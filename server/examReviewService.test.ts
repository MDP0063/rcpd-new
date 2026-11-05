import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { startExamAttempt } from './examAttemptService.ts';
import { saveExamAttemptAnswers } from './examAutosaveService.ts';
import { submitExamAttempt } from './examSubmitService.ts';
import { gradeExamAttempt, listExamReviews, listOwnExamResults } from './examReviewService.ts';

test('Freitextprüfung kann sicher manuell bewertet und nur dem eigenen Prüfling als Ergebnis gezeigt werden', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-exam-review-'));
  try {
    const repository = createJsonExamRepository(directory);
    await repository.create('exam_masters', 'review-exam', {
      id: 'review-exam', status: 'published', startable: true, minClearance: 0,
      assignedCourseCodes: ['PC-101'], currentPublishedVersionId: 'review-exam__v1'
    });
    await repository.create('exam_versions', 'review-exam__v1', {
      id: 'review-exam__v1', examId: 'review-exam', versionNumber: 1, title: 'Review',
      assessmentStage: 'test', minClearance: 0, timeLimitMinutes: 30, passingScoreBasisPoints: 5000,
      questionsSnapshot: [
        { id: 'choice', type: 'single_choice', question: 'Auswahl', pointsMilli: 1000, options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'b' },
        { id: 'text', type: 'free_text', question: 'Erkläre', pointsMilli: 1000, gradingRubric: 'Intern' }
      ]
    });
    await startExamAttempt(repository, 'review-exam', { uid: 'student-1', displayName: 'Student', clearanceLevel: 0 }, 'PC-101', Date.parse('2026-11-05T12:00:00.000Z'), () => 'review-attempt');
    await saveExamAttemptAnswers(repository, 'review-exam', 'review-attempt', 'student-1', 1, { choice: 'b', text: 'Meine Antwort' }, Date.parse('2026-11-05T12:01:00.000Z'));
    await submitExamAttempt(repository, 'review-exam', 'review-attempt', 'student-1', Date.parse('2026-11-05T12:02:00.000Z'));

    const queue = await listExamReviews(repository, ['PC-101']);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].questions[0].answer, 'Meine Antwort');
    assert.equal(queue[0].questions[0].gradingRubric, 'Intern');
    assert.deepEqual(await listExamReviews(repository, ['LAW-01']), []);
    await assert.rejects(gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [], '2026-11-05T12:03:00.000Z'), /EXAM_MANUAL_GRADES_INCOMPLETE/);
    await assert.rejects(gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 1001 }]), /EXAM_MANUAL_GRADES_INVALID/);

    const submission = await gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 500 }], '2026-11-05T12:03:00.000Z');
    assert.equal(submission.status, 'passed');
    assert.equal(submission.finalScoreBasisPoints, 7500);
    assert.equal(submission.manuallyEarnedPointsMilli, 500);
    assert.equal((await listExamReviews(repository, ['PC-101'])).length, 0);
    await assert.rejects(gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 500 }]), /EXAM_REVIEW_NOT_PENDING/);
    assert.equal((await listOwnExamResults(repository, 'student-1')).length, 1);
    assert.deepEqual(await listOwnExamResults(repository, 'student-2'), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
