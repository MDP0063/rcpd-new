import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { startExamAttempt } from './examAttemptService.ts';
import { saveExamAttemptAnswers } from './examAutosaveService.ts';
import { submitExamAttempt } from './examSubmitService.ts';
import { claimExamReview, markExamReviewDisconnected, recordExamReviewActivity, releaseExamReviewClaim, saveExamReviewDraft, transferExamReviewClaim, reassignExamReviewClaim, listPendingExamReviewNotifications, markExamReviewNotificationDelivered, correctCompletedExamReview, getReleasedPassingFinalExam, gradeExamAttempt, listCompletedManualReviews, listExamReviews, listOwnExamResults, listPendingExamResultReleases, releaseExamResult } from './examReviewService.ts';

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
    const queue = await listExamReviews(repository, ['PC-101'], 'grader');
    assert.equal(queue.length, 1);
    assert.equal(queue[0].questions[0].answer, 'Meine Antwort');
    assert.equal(queue[0].questions[0].gradingRubric, 'Intern');
    assert.deepEqual(await listExamReviews(repository, ['LAW-01'], 'grader'), []);
    const claim = await claimExamReview(repository, 'review-exam', 'review-attempt', 'grader', 'Prüfer', '2026-11-05T12:02:30.000Z');
    assert.equal(claim.reviewerUid, 'grader');
    const savedDraft = await saveExamReviewDraft(repository, 'review-exam', 'review-attempt', 'grader', 'text', 400, '2026-11-05T12:02:35.000Z');
    assert.equal(savedDraft.revision, 1);
    assert.equal(savedDraft.draftGrades.text, 400);
    const persistedDraftAttempt = await repository.get<any>('exam_attempts', 'review-attempt');
    assert.equal(persistedDraftAttempt?.reviewClaim?.reviewerUid, 'grader', 'saving a draft must preserve the active claim');
    await assert.rejects(saveExamReviewDraft(repository, 'review-exam', 'review-attempt', 'other-grader', 'text', 500, '2026-11-05T12:02:40.000Z'), /EXAM_REVIEW_CLAIM_NOT_OWNED/);
    const hiddenQueue = await listExamReviews(repository, ['PC-101'], 'other-grader', '2026-11-05T12:02:40.000Z');
    assert.equal(hiddenQueue.length, 1);
    assert.deepEqual(hiddenQueue[0].questions, [], 'other reviewers must not receive claimed answer content');
    assert.equal(hiddenQueue[0].reviewClaim?.reviewerName, 'Prüfer');
    assert.deepEqual(hiddenQueue[0].draftGrades, {}, 'draft points must not be exposed to other reviewers');
    await assert.rejects(claimExamReview(repository, 'review-exam', 'review-attempt', 'other-grader', 'Anderer Prüfer', '2026-11-05T12:02:41.000Z'), /EXAM_REVIEW_CLAIMED/);
    await assert.rejects(releaseExamReviewClaim(repository, 'review-exam', 'review-attempt', 'other-grader', '2026-11-05T12:02:40.000Z'), /EXAM_REVIEW_CLAIM_NOT_OWNED/);
    const transferredClaim = await transferExamReviewClaim(
      repository, 'review-exam', 'review-attempt', 'grader', 'other-grader', 'Anderer Prüfer',
      'Fachliche Zuständigkeit', '2026-11-05T12:02:42.000Z'
    );
    assert.equal(transferredClaim.reviewerUid, 'other-grader');
    const oldOwnerQueue = await listExamReviews(repository, ['PC-101'], 'grader', '2026-11-05T12:02:43.000Z');
    assert.deepEqual(oldOwnerQueue[0].questions, [], 'the previous owner loses answer access immediately after transfer');
    const newOwnerQueue = await listExamReviews(repository, ['PC-101'], 'other-grader', '2026-11-05T12:02:43.000Z');
    assert.equal(newOwnerQueue[0].questions[0].answer, 'Meine Antwort');
    assert.equal(newOwnerQueue[0].draftGrades.text, 400, 'saved drafts remain available after transfer');
    const reassignedClaim = await reassignExamReviewClaim(
      repository, 'review-exam', 'review-attempt', 'supervisor', 'grader', 'Prüfer',
      'Dienstliche Neuverteilung', '2026-11-05T12:02:44.000Z'
    );
    assert.equal(reassignedClaim.reviewerUid, 'grader');
    const claimHistory = (await repository.get<any>('exam_attempts', 'review-attempt'))?.reviewClaimHistory;
    assert.equal(claimHistory?.at(-2)?.action, 'transferred');
    assert.equal(claimHistory?.at(-1)?.action, 'reassigned');
    const pendingNotifications = await listPendingExamReviewNotifications(repository, ['review-attempt']);
    assert.equal(pendingNotifications.filter(item => item.event.action === 'transferred').length, 2);
    assert.equal(pendingNotifications.filter(item => item.event.action === 'reassigned').length, 2);
    const previousOwnerTransferNotification = pendingNotifications.find(item =>
      item.event.action === 'transferred' && item.recipientUid === 'grader'
    );
    assert.ok(previousOwnerTransferNotification);
    await markExamReviewNotificationDelivered(
      repository, previousOwnerTransferNotification!.attemptId,
      previousOwnerTransferNotification!.eventIndex, previousOwnerTransferNotification!.recipientUid,
      '2026-11-05T12:02:44.500Z'
    );
    assert.equal(
      (await listPendingExamReviewNotifications(repository, ['review-attempt'])).some(item =>
        item.event.action === 'transferred' && item.recipientUid === 'grader'
      ), false, 'notification delivery markers are persisted idempotently'
    );
    await recordExamReviewActivity(repository, 'review-exam', 'review-attempt', 'grader', '2026-11-05T12:02:45.000Z');
    const warningQueue = await listExamReviews(repository, ['PC-101'], 'grader', '2026-11-05T12:32:45.000Z');
    assert.ok(warningQueue[0].reviewClaim?.warningStartedAtIso, '30 minutes of inactivity starts the warning phase');
    assert.equal((await repository.get<any>('exam_attempts', 'review-attempt'))?.reviewClaimHistory?.at(-1)?.action, 'warning_started');
    assert.equal((await listPendingExamReviewNotifications(repository, ['review-attempt'])).some(item => item.event.action === 'warning_started' && item.recipientUid === 'grader'), true);
    await claimExamReview(repository, 'review-exam', 'review-attempt', 'grader', 'Prüfer', '2026-11-05T12:32:46.000Z');
    const unchangedWarningClaim = await repository.get<any>('exam_attempts', 'review-attempt');
    assert.equal(unchangedWarningClaim?.reviewClaim?.warningStartedAtIso, '2026-11-05T12:32:45.000Z',
      'repeating claim must not clear an inactivity warning');
    assert.equal(unchangedWarningClaim?.reviewClaim?.lastActivityAtIso, '2026-11-05T12:02:45.000Z',
      'repeating claim must not count as actual work');
    await recordExamReviewActivity(repository, 'review-exam', 'review-attempt', 'grader', '2026-11-05T12:33:00.000Z');
    const resumedClaim = await repository.get<any>('exam_attempts', 'review-attempt');
    assert.equal(resumedClaim?.reviewClaim?.warningStartedAtIso, undefined, 'actual work resets the warning');
    await markExamReviewDisconnected(repository, 'review-exam', 'review-attempt', 'grader', '2026-11-05T12:34:00.000Z');
    const disconnectedQueue = await listExamReviews(repository, ['PC-101'], 'grader', '2026-11-05T12:34:30.000Z');
    assert.equal(disconnectedQueue[0].isClaimOwner, false);
    assert.equal(disconnectedQueue[0].canClaim, true);
    assert.equal(disconnectedQueue[0].reviewClaim?.isDisconnected, true);
    assert.deepEqual(disconnectedQueue[0].questions, [], 'disconnected owner must not keep edit access before reclaim');
    await assert.rejects(recordExamReviewActivity(repository, 'review-exam', 'review-attempt', 'grader', '2026-11-05T12:35:00.000Z'), /EXAM_REVIEW_CLAIM_RECLAIM_REQUIRED/);
    await assert.rejects(saveExamReviewDraft(repository, 'review-exam', 'review-attempt', 'grader', 'text', 600, '2026-11-05T12:35:00.000Z'), /EXAM_REVIEW_CLAIM_RECLAIM_REQUIRED/);
    await claimExamReview(repository, 'review-exam', 'review-attempt', 'grader', 'Prüfer', '2026-11-05T12:35:30.000Z');
    const reclaimedAttempt = await repository.get<any>('exam_attempts', 'review-attempt');
    assert.equal(reclaimedAttempt?.reviewClaimHistory?.at(-1)?.action, 'reclaimed');
    const reclaimedQueue = await listExamReviews(repository, ['PC-101'], 'grader', '2026-11-05T12:35:40.000Z');
    assert.equal(reclaimedQueue[0].draftGrades.text, 400, 'saved draft survives disconnect and explicit reclaim');
    await markExamReviewDisconnected(repository, 'review-exam', 'review-attempt', 'grader', '2026-11-05T12:36:00.000Z');
    const afterDisconnect = await listExamReviews(repository, ['PC-101'], 'other-grader', '2026-11-05T13:06:00.000Z');
    assert.equal(afterDisconnect[0].reviewClaim, null, 'disconnect releases the claim after at most 30 minutes');
    const disconnectReleaseEvent = (await listPendingExamReviewNotifications(repository, ['review-attempt']))
      .find(item => item.event.action === 'auto_released' && item.event.reason === 'disconnect');
    assert.ok(disconnectReleaseEvent, 'disconnect auto-release creates a one-time notification event');
    await claimExamReview(repository, 'review-exam', 'review-attempt', 'grader', 'Prüfer', '2026-11-05T13:06:30.000Z');
    await assert.rejects(gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [], '2026-11-05T13:07:00.000Z'), /EXAM_MANUAL_GRADES_INCOMPLETE/);
    await assert.rejects(gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 1001 }], '2026-11-05T13:07:00.000Z'), /EXAM_MANUAL_GRADES_INVALID/);
    await assert.rejects(
      gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 500 }], '2026-11-05T13:47:00.000Z'),
      /EXAM_REVIEW_CLAIM_NOT_OWNED/,
      'a claim past the inactivity grace period cannot be used to submit a grade'
    );
    const expiredClaimAttempt = await repository.get<any>('exam_attempts', 'review-attempt');
    assert.equal(expiredClaimAttempt?.reviewClaim, null);
    assert.equal(expiredClaimAttempt?.reviewClaimHistory?.at(-1)?.action, 'auto_released');
    assert.equal(expiredClaimAttempt?.reviewClaimHistory?.at(-1)?.reason, 'inactivity');
    assert.equal((await listPendingExamReviewNotifications(repository, ['review-attempt']))
      .some(item => item.event.action === 'auto_released' && item.event.reason === 'inactivity'), true);
    await claimExamReview(repository, 'review-exam', 'review-attempt', 'grader', 'Prüfer', '2026-11-05T13:47:30.000Z');

    const attemptBeforeSelfReview = await repository.get('exam_attempts', 'review-attempt');
    await assert.rejects(
      gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'student-1', [{ questionId: 'text', pointsEarnedMilli: 1000 }], '2026-11-05T13:47:45.000Z'),
      /EXAM_SELF_REVIEW_FORBIDDEN/
    );
    assert.deepEqual(await repository.get('exam_attempts', 'review-attempt'), attemptBeforeSelfReview);
    assert.equal((await repository.get('exam_attempts', 'review-attempt'))?.status, 'pending_review');

    const submission = await gradeExamAttempt(repository, 'review-exam', 'review-attempt', 'grader', [{ questionId: 'text', pointsEarnedMilli: 500 }], '2026-11-05T13:48:00.000Z');
    assert.equal(submission.status, 'passed');
    assert.equal(submission.finalScoreBasisPoints, 7500);
    assert.equal(submission.manuallyEarnedPointsMilli, 500);
    assert.deepEqual((await repository.get<any>('exam_attempts', 'review-attempt'))?.reviewDraft, {}, 'final grading clears the saved draft');
    const completedAttemptNotification = (await listPendingExamReviewNotifications(repository, ['review-attempt']))
      .find(item => item.event.action === 'auto_released' && item.event.reason === 'inactivity');
    assert.ok(completedAttemptNotification);
    await markExamReviewNotificationDelivered(
      repository, completedAttemptNotification!.attemptId, completedAttemptNotification!.eventIndex,
      completedAttemptNotification!.recipientUid, '2026-11-05T13:48:01.000Z'
    );
    assert.equal(
      (await listPendingExamReviewNotifications(repository, ['review-attempt']))
        .some(item => item.event.action === 'auto_released' && item.event.reason === 'inactivity'),
      false, 'notification delivery markers remain writable after the attempt is graded'
    );
    assert.equal((await listExamReviews(repository, ['PC-101'], 'grader')).length, 0);
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


test('Academy erkennt ausschließlich aktuell freigegebene bestandene final_exam-Ergebnisse', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-academy-final-exam-'));
  try {
    const repository = createJsonExamRepository(directory);
    await repository.create('exam_masters', 'academy-final', {
      id: 'academy-final', status: 'published', startable: true, minClearance: 0,
      assignedCourseCodes: ['BASIC-01'], currentPublishedVersionId: 'academy-final__v1'
    });
    await repository.create('exam_versions', 'academy-final__v1', {
      id: 'academy-final__v1', examId: 'academy-final', versionNumber: 1, title: 'Grundausbildung Abschluss',
      assessmentStage: 'final_exam', minClearance: 0, timeLimitMinutes: 30, passingScoreBasisPoints: 9000,
      questionsSnapshot: [
        { id: 'written', type: 'free_text', question: 'Beschreibe das Vorgehen.', pointsMilli: 1000, gradingRubric: 'Intern' }
      ]
    });
    await startExamAttempt(
      repository, 'academy-final',
      { uid: 'academy-student', displayName: 'Academy Student', clearanceLevel: 0 },
      'BASIC-01', Date.parse('2026-11-10T12:00:00.000Z'), () => 'academy-final-attempt'
    );
    await saveExamAttemptAnswers(
      repository, 'academy-final', 'academy-final-attempt', 'academy-student', 1,
      { written: 'Vollständige Antwort' }, Date.parse('2026-11-10T12:01:00.000Z')
    );
    await submitExamAttempt(repository, 'academy-final', 'academy-final-attempt', 'academy-student', Date.parse('2026-11-10T12:02:00.000Z'));
    await claimExamReview(repository, 'academy-final', 'academy-final-attempt', 'academy-admin', 'Admin', '2026-11-10T12:02:30.000Z');
    await gradeExamAttempt(
      repository, 'academy-final', 'academy-final-attempt', 'academy-admin',
      [{ questionId: 'written', pointsEarnedMilli: 1000 }], '2026-11-10T12:03:00.000Z'
    );
    assert.equal(await getReleasedPassingFinalExam(repository, 'academy-student', 'academy-final', 'BASIC-01'), null);
    assert.equal(await getReleasedPassingFinalExam(repository, 'other-student', 'academy-final', 'BASIC-01'), null);
    assert.equal(await getReleasedPassingFinalExam(repository, 'academy-student', 'academy-final', 'OTHER-01'), null);

    const released = await releaseExamResult(repository, 'academy-final', 'academy-final-attempt', 'academy-admin', '2026-11-10T12:04:00.000Z');
    assert.equal(released.status, 'passed');
    const proof = await getReleasedPassingFinalExam(repository, 'academy-student', 'academy-final', 'BASIC-01');
    assert.deepEqual(proof, {
      attemptId: 'academy-final-attempt',
      releasedAtIso: '2026-11-10T12:04:00.000Z',
      finalScoreBasisPoints: 10_000
    });

    const corrected = await correctCompletedExamReview(
      repository, 'academy-final', 'academy-final-attempt', 'academy-admin',
      [{ questionId: 'written', pointsEarnedMilli: 0 }],
      'Bewertung nach erneuter Prüfung korrigiert.',
      '2026-11-10T12:05:00.000Z'
    );
    assert.equal(corrected.status, 'failed');
    assert.equal(await getReleasedPassingFinalExam(repository, 'academy-student', 'academy-final', 'BASIC-01'), null);
    await releaseExamResult(repository, 'academy-final', 'academy-final-attempt', 'academy-admin', '2026-11-10T12:06:00.000Z');
    assert.equal(await getReleasedPassingFinalExam(repository, 'academy-student', 'academy-final', 'BASIC-01'), null);

    await repository.create('exam_masters', 'academy-knowledge-test', {
      id: 'academy-knowledge-test', status: 'published', startable: true, minClearance: 0,
      assignedCourseCodes: ['BASIC-01'], currentPublishedVersionId: 'academy-knowledge-test__v1'
    });
    await repository.create('exam_versions', 'academy-knowledge-test__v1', {
      id: 'academy-knowledge-test__v1', examId: 'academy-knowledge-test', versionNumber: 1,
      title: 'Freiwilliger Wissenstest', assessmentStage: 'test', minClearance: 0,
      timeLimitMinutes: 15, passingScoreBasisPoints: 5000,
      questionsSnapshot: [{
        id: 'choice', type: 'single_choice', question: 'Welche Antwort ist richtig?', pointsMilli: 1000,
        options: [{ id: 'a', text: 'Falsch' }, { id: 'b', text: 'Richtig' }], correctOptionId: 'b'
      }]
    });
    await startExamAttempt(
      repository, 'academy-knowledge-test',
      { uid: 'academy-student', displayName: 'Academy Student', clearanceLevel: 0 },
      'BASIC-01', Date.parse('2026-11-10T13:00:00.000Z'), () => 'academy-test-attempt'
    );
    await saveExamAttemptAnswers(
      repository, 'academy-knowledge-test', 'academy-test-attempt', 'academy-student', 1,
      { choice: 'b' }, Date.parse('2026-11-10T13:01:00.000Z')
    );
    const knowledgeTestSubmission = await submitExamAttempt(
      repository, 'academy-knowledge-test', 'academy-test-attempt', 'academy-student',
      Date.parse('2026-11-10T13:02:00.000Z')
    );
    assert.equal(knowledgeTestSubmission.submission.status, 'awaiting_release');
    await releaseExamResult(repository, 'academy-knowledge-test', 'academy-test-attempt', 'academy-admin', '2026-11-10T13:03:00.000Z');
    assert.equal(await getReleasedPassingFinalExam(repository, 'academy-student', 'academy-knowledge-test', 'BASIC-01'), null,
      'a released voluntary knowledge test must never satisfy a final-exam requirement');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
