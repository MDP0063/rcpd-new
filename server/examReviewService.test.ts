import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { startExamAttempt } from './examAttemptService.ts';
import { saveExamAttemptAnswers } from './examAutosaveService.ts';
import { submitExamAttempt } from './examSubmitService.ts';
import { correctCompletedExamReview, gradeExamAttempt, listCompletedManualReviews, listExamReviews, listOwnExamResults, listPendingExamResultReleases, releaseExamResult } from './examReviewService.ts';

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
    const initialSubmission = await submitExamAttempt(repository, 'review-exam', 'review-attempt', 'student-1', Date.parse('2026-11-05T12:02:00.000Z'));
    assert.equal(initialSubmission.submission.status, 'awaiting_release');
    assert.equal(initialSubmission.submission.finalScoreBasisPoints, null);

    await assert.rejects(releaseExamResult(repository, 'review-exam', 'review-attempt', 'admin'), /EXAM_RESULT_NOT_FINAL/);
    const queue = await listExamReviews(repository, ['PC-101']);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].questions[0].answer, 'Meine Antwort');
    assert.equal(queue[0].questions[0].gradingRubric, 'Intern');
    assert.deepEqual(await listExamReviews(repository, ['LAW-01']), []);
    await assert.rejects(gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [], '2026-11-05T12:03:00.000Z'), /EXAM_MANUAL_GRADES_INCOMPLETE/);
    await assert.rejects(gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 1001 }]), /EXAM_MANUAL_GRADES_INVALID/);

    const attemptBeforeSelfReview = await repository.get('exam_attempts', 'review-attempt');
    await assert.rejects(
      gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'student-1', [{ questionId: 'text', pointsEarnedMilli: 1000 }]),
      /EXAM_SELF_REVIEW_FORBIDDEN/
    );
    assert.deepEqual(await repository.get('exam_attempts', 'review-attempt'), attemptBeforeSelfReview);
    assert.equal((await repository.get('exam_attempts', 'review-attempt'))?.status, 'pending_review');

    const submission = await gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 500 }], '2026-11-05T12:03:00.000Z');
    assert.equal(submission.status, 'passed');
    assert.equal(submission.finalScoreBasisPoints, 7500);
    assert.equal(submission.manuallyEarnedPointsMilli, 500);
    assert.equal((await listExamReviews(repository, ['PC-101'])).length, 0);
    await assert.rejects(gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 500 }]), /EXAM_REVIEW_NOT_PENDING/);
    assert.equal((await listOwnExamResults(repository, 'student-1')).length, 1);
    assert.deepEqual(await listOwnExamResults(repository, 'student-2'), []);

    const participantBeforeRelease = await listOwnExamResults(repository, 'student-1');
    assert.equal(participantBeforeRelease[0].status, 'awaiting_release');
    assert.equal(participantBeforeRelease[0].finalScoreBasisPoints, null);
    assert.deepEqual(participantBeforeRelease[0].questionResults, []);
    assert.equal((await listPendingExamResultReleases(repository)).length, 1);
    await assert.rejects(releaseExamResult(repository, 'review-exam', 'review-attempt', ''), /EXAM_RESULT_RELEASE_ACTOR_INVALID/);
    const released = await releaseExamResult(repository, 'review-exam', 'review-attempt', 'admin', '2026-11-05T12:05:00.000Z');
    assert.equal(released.status, 'passed');
    assert.equal((await listOwnExamResults(repository, 'student-1'))[0].status, 'passed');
    assert.equal((await listPendingExamResultReleases(repository)).length, 0);
    await releaseExamResult(repository, 'review-exam', 'review-attempt', 'admin', '2026-11-05T12:06:00.000Z');
    assert.equal((await repository.get<any>('exam_attempts', 'review-attempt'))?.resultReleaseHistory?.length, 1);

    const completedReviews = await listCompletedManualReviews(repository);
    assert.equal(completedReviews.length, 1);
    assert.equal(completedReviews[0].questions[0].pointsEarnedMilli, 500);
    const beforeInvalidCorrection = await repository.get('exam_attempts', 'review-attempt');
    await assert.rejects(
      correctCompletedExamReview(repository, 'review-exam', 'review-attempt', 'colonel', [{ questionId: 'text', pointsEarnedMilli: 900 }], 'too short'),
      /EXAM_REVIEW_CORRECTION_REASON_INVALID/
    );
    assert.deepEqual(await repository.get('exam_attempts', 'review-attempt'), beforeInvalidCorrection);
    await assert.rejects(
      correctCompletedExamReview(repository, 'review-exam', 'review-attempt', 'student-1', [{ questionId: 'text', pointsEarnedMilli: 900 }], 'Korrektur wegen fehlerhafter Bewertung'),
      /EXAM_SELF_REVIEW_FORBIDDEN/
    );
    const corrected = await correctCompletedExamReview(
      repository, 'review-exam', 'review-attempt', 'colonel',
      [{ questionId: 'text', pointsEarnedMilli: 900 }],
      'Ursprüngliche Punktevergabe anhand der Rubrik überprüft.',
      '2026-11-05T12:10:00.000Z'
    );
    assert.equal(corrected.status, 'passed');
    assert.equal(corrected.finalScoreBasisPoints, 9500);
    const correctedAttempt = await repository.get<{ id: string; reviewCorrections?: Array<{ reason: string; previousGrades: Array<{ pointsEarnedMilli: number }>; nextGrades: Array<{ pointsEarnedMilli: number }> }> }>('exam_attempts', 'review-attempt');
    assert.equal(correctedAttempt?.reviewCorrections?.length, 1);
    assert.equal(correctedAttempt?.reviewCorrections?.[0].reason, 'Ursprüngliche Punktevergabe anhand der Rubrik überprüft.');
    assert.equal(correctedAttempt?.reviewCorrections?.[0].previousGrades[0].pointsEarnedMilli, 500);
    assert.equal(correctedAttempt?.reviewCorrections?.[0].nextGrades[0].pointsEarnedMilli, 900);
    assert.equal((correctedAttempt as any)?.resultReleaseStatus, 'pending_rerelease');
    assert.equal((await listOwnExamResults(repository, 'student-1'))[0].status, 'awaiting_release');
    assert.equal((await listPendingExamResultReleases(repository)).length, 1);
    const rereleased = await releaseExamResult(repository, 'review-exam', 'review-attempt', 'admin', '2026-11-05T12:11:00.000Z');
    assert.equal(rereleased.status, 'passed');
    const rereleasedAttempt = await repository.get<any>('exam_attempts', 'review-attempt');
    assert.equal(rereleasedAttempt?.resultReleaseHistory?.length, 2);
    assert.equal((await listCompletedManualReviews(repository))[0].questions[0].pointsEarnedMilli, 900);

  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
