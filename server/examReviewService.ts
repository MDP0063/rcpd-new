import type { ExamRepository } from './examRepository.ts';
import type { ExamAttemptRecord, ExamReviewClaim, ExamReviewClaimHistoryEntry, ExamVersionRecord } from './examAttemptService.ts';
import { scoreExam } from './examScore.ts';
import { toParticipantSubmission, toPublicSubmission, toPublishedResultSnapshot, type PublicExamSubmission } from './examSubmitService.ts';
import { isValidId } from './examValidate.ts';

const HISTORY_LIMIT = 1000;

function ensureBounded<T>(items: T[]): T[] {
  if (items.length >= HISTORY_LIMIT) throw new Error('EXAM_ATTEMPT_HISTORY_LIMIT');
  return items;
}

function pendingFreeTextQuestions(attempt: ExamAttemptRecord, version: ExamVersionRecord): Array<{ questionId: string; question: string; answer: string; pointsMilli: number; gradingRubric: string }> {
  return version.questionsSnapshot.flatMap(question => {
    if (question.type !== 'free_text') return [];
    const answer = attempt.answers?.[question.id];
    if (typeof answer !== 'string' || !answer.trim()) return [];
    const graded = Array.isArray(attempt.questionGrades) && attempt.questionGrades.some((grade: any) => grade?.questionId === question.id && grade?.requiresManualReview === false);
    if (graded) return [];
    return [{ questionId: question.id, question: question.question, answer, pointsMilli: question.pointsMilli, gradingRubric: question.gradingRubric || '' }];
  });
}

const REVIEW_CLAIM_IDLE_MS = 30 * 60_000;
const REVIEW_CLAIM_WARNING_MS = 10 * 60_000;
const REVIEW_CLAIM_DISCONNECT_MS = 30 * 60_000;
const REVIEW_CLAIM_HISTORY_LIMIT = 100;

function validReviewTime(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error('EXAM_REVIEW_CLAIM_TIME_INVALID');
  return parsed;
}

function appendReviewClaimHistory(
  attempt: ExamAttemptRecord,
  entry: ExamReviewClaimHistoryEntry
): ExamReviewClaimHistoryEntry[] {
  const history = Array.isArray(attempt.reviewClaimHistory) ? attempt.reviewClaimHistory : [];
  if (history.length >= REVIEW_CLAIM_HISTORY_LIMIT) throw new Error('EXAM_REVIEW_CLAIM_HISTORY_LIMIT');
  return [...history, entry];
}

async function refreshReviewClaim(
  transaction: Parameters<Parameters<ExamRepository['runTransaction']>[0]>[0],
  attemptId: string,
  nowIso: string
): Promise<ExamAttemptRecord> {
  const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
  if (!attempt || attempt.status !== 'pending_review' || !attempt.reviewClaim) {
    if (!attempt) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    return attempt;
  }
  const now = validReviewTime(nowIso);
  const claim = attempt.reviewClaim;
  const disconnectedAt = claim.disconnectedAtIso ? validReviewTime(claim.disconnectedAtIso) : null;
  const lastActivityAt = validReviewTime(claim.lastActivityAtIso);
  const disconnectedExpired = disconnectedAt !== null && now - disconnectedAt >= REVIEW_CLAIM_DISCONNECT_MS;
  const idleExpired = disconnectedAt === null && now - lastActivityAt >= REVIEW_CLAIM_IDLE_MS + REVIEW_CLAIM_WARNING_MS;
  if (disconnectedExpired || idleExpired) {
    const next: ExamAttemptRecord = {
      ...attempt,
      reviewClaim: null,
      reviewClaimHistory: appendReviewClaimHistory(attempt, {
        action: 'auto_released', actorUid: 'system', targetUid: claim.reviewerUid,
        reason: disconnectedExpired ? 'disconnect' : 'inactivity',
        notificationRequired: true, atIso: nowIso
      })
    };
    await transaction.update('exam_attempts', attemptId, next);
    return next;
  }
  if (disconnectedAt === null && now - lastActivityAt >= REVIEW_CLAIM_IDLE_MS && !claim.warningStartedAtIso) {
    const warningStartedAtIso = new Date(lastActivityAt + REVIEW_CLAIM_IDLE_MS).toISOString();
    const nextClaim = { ...claim, warningStartedAtIso };
    const next = {
      ...attempt,
      reviewClaim: nextClaim,
      reviewClaimHistory: appendReviewClaimHistory(attempt, {
        action: 'warning_started', actorUid: 'system', targetUid: claim.reviewerUid,
        reason: 'inactivity', notificationRequired: true, atIso: warningStartedAtIso
      })
    };
    await transaction.update('exam_attempts', attemptId, next);
    return next;
  }
  return attempt;
}

export async function claimExamReview(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  reviewerName: string,
  nowIso = new Date().toISOString()
): Promise<ExamReviewClaim> {
  if (!reviewerUid.trim() || !reviewerName.trim() || reviewerName.trim().length > 120) {
    throw new Error('EXAM_REVIEW_CLAIM_ACTOR_INVALID');
  }
  validReviewTime(nowIso);
  await repository.runTransaction(transaction => refreshReviewClaim(transaction, attemptId, nowIso));
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.userId === reviewerUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    if (attempt.status !== 'pending_review') throw new Error('EXAM_REVIEW_NOT_PENDING');
    if (attempt.reviewClaim) {
      if (attempt.reviewClaim.reviewerUid !== reviewerUid) throw new Error('EXAM_REVIEW_CLAIMED');
      if (attempt.reviewClaim.disconnectedAtIso) {
        const reclaimed: ExamReviewClaim = {
          reviewerUid, reviewerName: reviewerName.trim(),
          claimedAtIso: nowIso, lastActivityAtIso: nowIso
        };
        const next: ExamAttemptRecord = {
          ...attempt, reviewClaim: reclaimed,
          reviewClaimHistory: appendReviewClaimHistory(attempt, {
            action: 'reclaimed', actorUid: reviewerUid, targetUid: reviewerUid, atIso: nowIso
          })
        };
        await transaction.update('exam_attempts', attemptId, next);
        return reclaimed;
      }
      // A repeated claim request is not real work and must not extend inactivity.
      // Active claims remain persistent across reloads; only recordExamReviewActivity
      // or a successful draft save may refresh lastActivityAtIso.
      return attempt.reviewClaim;
    }
    const claim: ExamReviewClaim = {
      reviewerUid, reviewerName: reviewerName.trim(),
      claimedAtIso: nowIso, lastActivityAtIso: nowIso
    };
    const next: ExamAttemptRecord = {
      ...attempt, reviewClaim: claim,
      reviewClaimHistory: appendReviewClaimHistory(attempt, {
        action: 'claimed', actorUid: reviewerUid, targetUid: reviewerUid, atIso: nowIso
      })
    };
    await transaction.update('exam_attempts', attemptId, next);
    return claim;
  });
}

export async function releaseExamReviewClaim(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  nowIso = new Date().toISOString()
): Promise<void> {
  validReviewTime(nowIso);
  await repository.runTransaction(transaction => refreshReviewClaim(transaction, attemptId, nowIso));
  await repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'pending_review' || !attempt.reviewClaim) throw new Error('EXAM_REVIEW_CLAIM_REQUIRED');
    if (attempt.reviewClaim.reviewerUid !== reviewerUid) throw new Error('EXAM_REVIEW_CLAIM_NOT_OWNED');
    const next = {
      ...attempt, reviewClaim: null,
      reviewClaimHistory: appendReviewClaimHistory(attempt, {
        action: 'released', actorUid: reviewerUid, targetUid: reviewerUid,
        reason: 'voluntary', atIso: nowIso
      })
    };
    await transaction.update('exam_attempts', attemptId, next);
  });
}

function normalizeReviewReason(value: string): string {
  const normalized = value.trim();
  if (normalized.length > 500) throw new Error('EXAM_REVIEW_TRANSFER_REASON_INVALID');
  return normalized || 'Keine zusätzliche Begründung angegeben.';
}

function createTransferredClaim(
  attempt: ExamAttemptRecord,
  targetUid: string,
  targetName: string,
  nowIso: string
): ExamReviewClaim {
  return {
    reviewerUid: targetUid,
    reviewerName: targetName.trim(),
    claimedAtIso: nowIso,
    lastActivityAtIso: nowIso
  };
}

export async function transferExamReviewClaim(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  actorUid: string,
  targetUid: string,
  targetName: string,
  reason: string,
  nowIso = new Date().toISOString()
): Promise<ExamReviewClaim> {
  if (!actorUid.trim() || !targetUid.trim() || !targetName.trim() || targetName.trim().length > 120 ||
      targetUid === actorUid) throw new Error('EXAM_REVIEW_TRANSFER_INVALID');
  const normalizedReason = normalizeReviewReason(reason);
  validReviewTime(nowIso);
  await repository.runTransaction(transaction => refreshReviewClaim(transaction, attemptId, nowIso));
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'pending_review' || !attempt.reviewClaim) throw new Error('EXAM_REVIEW_CLAIM_REQUIRED');
    if (attempt.userId === actorUid || attempt.userId === targetUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    if (attempt.reviewClaim.reviewerUid !== actorUid) throw new Error('EXAM_REVIEW_CLAIM_NOT_OWNED');
    if (attempt.reviewClaim.disconnectedAtIso) throw new Error('EXAM_REVIEW_CLAIM_RECLAIM_REQUIRED');
    const previousUid = attempt.reviewClaim.reviewerUid;
    const nextClaim = createTransferredClaim(attempt, targetUid, targetName, nowIso);
    const next: ExamAttemptRecord = {
      ...attempt,
      reviewClaim: nextClaim,
      reviewClaimHistory: appendReviewClaimHistory(attempt, {
        action: 'transferred', actorUid, previousUid, targetUid,
        reason: normalizedReason, notificationRequired: true, atIso: nowIso
      })
    };
    await transaction.update('exam_attempts', attemptId, next);
    return nextClaim;
  });
}

export async function reassignExamReviewClaim(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  supervisorUid: string,
  targetUid: string,
  targetName: string,
  reason: string,
  nowIso = new Date().toISOString()
): Promise<ExamReviewClaim> {
  if (!supervisorUid.trim() || !targetUid.trim() || !targetName.trim() || targetName.trim().length > 120) {
    throw new Error('EXAM_REVIEW_REASSIGN_INVALID');
  }
  const normalizedReason = normalizeReviewReason(reason);
  validReviewTime(nowIso);
  await repository.runTransaction(transaction => refreshReviewClaim(transaction, attemptId, nowIso));
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'pending_review' || !attempt.reviewClaim) throw new Error('EXAM_REVIEW_CLAIM_REQUIRED');
    if (attempt.userId === supervisorUid || attempt.userId === targetUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    const previousUid = attempt.reviewClaim.reviewerUid;
    if (previousUid === targetUid) throw new Error('EXAM_REVIEW_REASSIGN_UNCHANGED');
    const nextClaim = createTransferredClaim(attempt, targetUid, targetName, nowIso);
    const next: ExamAttemptRecord = {
      ...attempt,
      reviewClaim: nextClaim,
      reviewClaimHistory: appendReviewClaimHistory(attempt, {
        action: 'reassigned', actorUid: supervisorUid, previousUid, targetUid,
        reason: normalizedReason, notificationRequired: true, atIso: nowIso
      })
    };
    await transaction.update('exam_attempts', attemptId, next);
    return nextClaim;
  });
}

export interface ExamReviewNotificationEvent {
  attemptId: string;
  examId: string;
  examVersionId: string;
  participantName: string;
  courseCode: string;
  eventIndex: number;
  recipientUid: string;
  event: ExamReviewClaimHistoryEntry;
}

export async function listPendingExamReviewNotifications(
  repository: ExamRepository,
  attemptIds: string[]
): Promise<ExamReviewNotificationEvent[]> {
  if (!Array.isArray(attemptIds) || attemptIds.length > HISTORY_LIMIT ||
      attemptIds.some(id => typeof id !== 'string' || !id.trim())) {
    throw new Error('EXAM_REVIEW_NOTIFICATION_QUERY_INVALID');
  }
  const uniqueAttemptIds = [...new Set(attemptIds)];
  const attempts = (await Promise.all(uniqueAttemptIds.map(id =>
    repository.get<ExamAttemptRecord>('exam_attempts', id)
  ))).filter((attempt): attempt is ExamAttemptRecord => Boolean(attempt));
  const results: ExamReviewNotificationEvent[] = [];
  for (const attempt of attempts) {
    const history = Array.isArray(attempt.reviewClaimHistory) ? attempt.reviewClaimHistory : [];
    history.forEach((event, eventIndex) => {
      if (!event.notificationRequired) return;
      const recipients = event.action === 'revision_requested'
        ? (event.recipientUids || [])
        : event.action === 'transferred' || event.action === 'reassigned'
          ? [event.previousUid, event.targetUid]
          : [event.targetUid];
      for (const recipientUid of recipients) {
        if (recipientUid && !event.notificationDeliveredTo?.includes(recipientUid)) {
          results.push({
            attemptId: attempt.id, examId: attempt.examId, examVersionId: attempt.examVersionId,
            participantName: attempt.userName, courseCode: attempt.attemptCourseCode,
            eventIndex, recipientUid, event
          });
        }
      }
    });
  }
  return results;
}

export async function markExamReviewNotificationDelivered(
  repository: ExamRepository,
  attemptId: string,
  eventIndex: number,
  recipientUid: string,
  nowIso = new Date().toISOString()
): Promise<void> {
  validReviewTime(nowIso);
  await repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    const history = [...(attempt.reviewClaimHistory || [])];
    const event = history[eventIndex];
    if (!event?.notificationRequired) throw new Error('EXAM_REVIEW_NOTIFICATION_NOT_FOUND');
    const recipients = event.action === 'revision_requested'
      ? (event.recipientUids || [])
      : event.action === 'transferred' || event.action === 'reassigned'
        ? [event.previousUid, event.targetUid]
        : [event.targetUid];
    if (!recipients.includes(recipientUid)) throw new Error('EXAM_REVIEW_NOTIFICATION_RECIPIENT_INVALID');
    if (event.notificationDeliveredTo?.includes(recipientUid)) return;
    history[eventIndex] = {
      ...event,
      notificationDeliveredTo: [...(event.notificationDeliveredTo || []), recipientUid]
    };
    await transaction.update('exam_attempts', attemptId, { ...attempt, reviewClaimHistory: history });
  });
}

export async function recordExamReviewActivity(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  nowIso = new Date().toISOString()
): Promise<ExamReviewClaim> {
  validReviewTime(nowIso);
  await repository.runTransaction(transaction => refreshReviewClaim(transaction, attemptId, nowIso));
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (!attempt.reviewClaim) throw new Error('EXAM_REVIEW_CLAIM_REQUIRED');
    if (attempt.reviewClaim.reviewerUid !== reviewerUid) throw new Error('EXAM_REVIEW_CLAIM_NOT_OWNED');
    if (attempt.reviewClaim.disconnectedAtIso) throw new Error('EXAM_REVIEW_CLAIM_RECLAIM_REQUIRED');
    const { warningStartedAtIso: _warning, disconnectedAtIso: _disconnected, ...claim } = attempt.reviewClaim;
    const nextClaim = { ...claim, lastActivityAtIso: nowIso };
    await transaction.update('exam_attempts', attemptId, { ...attempt, reviewClaim: nextClaim });
    return nextClaim;
  });
}

export async function markExamReviewDisconnected(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  nowIso = new Date().toISOString()
): Promise<void> {
  validReviewTime(nowIso);
  await repository.runTransaction(transaction => refreshReviewClaim(transaction, attemptId, nowIso));
  await repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (!attempt.reviewClaim || attempt.reviewClaim.reviewerUid !== reviewerUid) return;
    await transaction.update('exam_attempts', attemptId, {
      ...attempt, reviewClaim: { ...attempt.reviewClaim, disconnectedAtIso: nowIso }
    });
  });
}

export async function saveExamReviewDraft(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  questionId: string,
  pointsEarnedMilli: number | null,
  nowIso = new Date().toISOString()
): Promise<{ draftGrades: Record<string, number>; revision: number; updatedAtIso: string | null }> {
  if (!reviewerUid.trim() || !questionId.trim() || questionId.length > 128 ||
      (pointsEarnedMilli !== null && (!Number.isSafeInteger(pointsEarnedMilli) || pointsEarnedMilli < 0))) {
    throw new Error('EXAM_REVIEW_DRAFT_INVALID');
  }
  validReviewTime(nowIso);
  await repository.runTransaction(transaction => refreshReviewClaim(transaction, attemptId, nowIso));
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'pending_review') throw new Error('EXAM_REVIEW_NOT_PENDING');
    if (attempt.userId === reviewerUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    if (!attempt.reviewClaim || attempt.reviewClaim.reviewerUid !== reviewerUid) throw new Error('EXAM_REVIEW_CLAIM_NOT_OWNED');
    if (attempt.reviewClaim.disconnectedAtIso) throw new Error('EXAM_REVIEW_CLAIM_RECLAIM_REQUIRED');
    const version = await transaction.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId || version.versionNumber !== attempt.versionNumber) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    const question = pendingFreeTextQuestions(attempt, version).find(item => item.questionId === questionId);
    if (!question || (pointsEarnedMilli !== null && pointsEarnedMilli > question.pointsMilli)) {
      throw new Error('EXAM_MANUAL_GRADES_INVALID');
    }
    const draftGrades = { ...(attempt.reviewDraft || {}) };
    if (pointsEarnedMilli === null) delete draftGrades[questionId];
    else draftGrades[questionId] = pointsEarnedMilli;
    const draftChanged = JSON.stringify(Object.entries(draftGrades).sort()) !==
      JSON.stringify(Object.entries(attempt.reviewDraft || {}).sort());
    const { warningStartedAtIso: _warning, disconnectedAtIso: _disconnected, ...claim } = attempt.reviewClaim;
    const nextClaim = { ...claim, lastActivityAtIso: nowIso };
    const revision = Number.isSafeInteger(attempt.reviewDraftRevision) ? Number(attempt.reviewDraftRevision) : 0;
    const next: ExamAttemptRecord = {
      ...attempt,
      reviewClaim: nextClaim,
      ...(draftChanged ? {
        reviewDraft: draftGrades,
        reviewDraftRevision: revision + 1,
        reviewDraftUpdatedAtIso: nowIso,
        reviewDraftUpdatedByUid: reviewerUid
      } : {})
    };
    await transaction.update('exam_attempts', attemptId, next);
    return {
      draftGrades,
      revision: draftChanged ? revision + 1 : revision,
      updatedAtIso: draftChanged ? nowIso : attempt.reviewDraftUpdatedAtIso ?? null
    };
  });
}

export interface ExamReviewItem {
  id: string;
  examId: string;
  examTitle: string;
  userName: string;
  attemptCourseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  questions: ReturnType<typeof pendingFreeTextQuestions>;
  reviewClaim: { reviewerName: string; claimedAtIso: string; warningStartedAtIso?: string; isDisconnected?: boolean } | null;
  isClaimOwner: boolean;
  canClaim: boolean;
  draftGrades: Record<string, number>;
  draftRevision: number;
  revisionRequest: {
    requestedByUid: string;
    requestedAtIso: string;
    previousReviewerUid: string | null;
    reason: string;
    feedback: Array<{ questionId: string; feedback: string }>;
  } | null;
}

function hasPendingExamReviewNotification(attempt: ExamAttemptRecord): boolean {
  const history = Array.isArray(attempt.reviewClaimHistory) ? attempt.reviewClaimHistory : [];
  return history.some(event => {
    if (!event.notificationRequired) return false;
    const recipients = event.action === 'revision_requested'
      ? (event.recipientUids || [])
      : event.action === 'transferred' || event.action === 'reassigned'
        ? [event.previousUid, event.targetUid]
        : [event.targetUid];
    return recipients.some(uid => Boolean(uid) && !event.notificationDeliveredTo?.includes(uid!));
  });
}

export async function listExamReviews(
  repository: ExamRepository,
  allowedCourseCodes: readonly string[],
  reviewerUid: string,
  nowIso = new Date().toISOString(),
  onNotificationPending?: (attemptId: string) => void
): Promise<ExamReviewItem[]> {
  const attempts = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'pending_review' }], limit: HISTORY_LIMIT
  }));
  const allowed = new Set(allowedCourseCodes.map(code => code.toUpperCase()));
  const results: ExamReviewItem[] = [];
  for (const listedAttempt of attempts) {
    if (listedAttempt.userId === reviewerUid) continue;
    if (!allowed.has('*') && !allowed.has(listedAttempt.attemptCourseCode.toUpperCase())) continue;
    const attempt = await repository.runTransaction(transaction =>
      refreshReviewClaim(transaction, listedAttempt.id, nowIso)
    );
    if (hasPendingExamReviewNotification(attempt)) onNotificationPending?.(attempt.id);
    if (attempt.status !== 'pending_review') continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    const isOwnDisconnectedClaim = attempt.reviewClaim?.reviewerUid === reviewerUid && Boolean(attempt.reviewClaim.disconnectedAtIso);
    const isClaimOwner = attempt.reviewClaim?.reviewerUid === reviewerUid && !attempt.reviewClaim.disconnectedAtIso;
    const canClaim = !attempt.reviewClaim || isOwnDisconnectedClaim;
    const questions = attempt.reviewClaim && !isClaimOwner ? [] : pendingFreeTextQuestions(attempt, version);
    const history = Array.isArray(attempt.reviewClaimHistory) ? attempt.reviewClaimHistory : [];
    const latestRevisionRequest = [...history].reverse().find(event => event.action === 'revision_requested');
    const revisionCompleted = latestRevisionRequest
      ? history.some(event => event.action === 'revision_completed' && event.revisionRequestedAtIso === latestRevisionRequest.atIso)
      : false;
    const revisionRequest = latestRevisionRequest && !revisionCompleted ? {
      requestedByUid: latestRevisionRequest.actorUid,
      requestedAtIso: latestRevisionRequest.atIso,
      previousReviewerUid: latestRevisionRequest.previousUid || null,
      reason: latestRevisionRequest.reason || '',
      feedback: latestRevisionRequest.feedback || []
    } : null;
    if (questions.length || attempt.reviewClaim) results.push({
      id: attempt.id, examId: attempt.examId, examTitle: version.title, userName: attempt.userName,
      attemptCourseCode: attempt.attemptCourseCode, submittedAtIso: String(attempt.submittedAtIso || ''),
      assessmentStage: version.assessmentStage, questions, revisionRequest,
      reviewClaim: attempt.reviewClaim ? {
        reviewerName: attempt.reviewClaim.reviewerName,
        claimedAtIso: attempt.reviewClaim.claimedAtIso,
        ...(attempt.reviewClaim.warningStartedAtIso ? { warningStartedAtIso: attempt.reviewClaim.warningStartedAtIso } : {}),
        ...(isOwnDisconnectedClaim ? { isDisconnected: true } : {})
      } : null,
      isClaimOwner, canClaim,
      draftGrades: isClaimOwner ? (attempt.reviewDraft || {}) : {},
      draftRevision: isClaimOwner && Number.isSafeInteger(attempt.reviewDraftRevision) ? Number(attempt.reviewDraftRevision) : 0
    });
  }
  return results;
}

export async function gradeExamAttempt(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  gradesInput: unknown,
  nowIso = new Date().toISOString()
): Promise<PublicExamSubmission> {
  if (!reviewerUid) throw new Error('EXAM_REVIEWER_INVALID');
  validReviewTime(nowIso);
  await repository.runTransaction(transaction => refreshReviewClaim(transaction, attemptId, nowIso));
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.userId === reviewerUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    if (attempt.status !== 'pending_review') throw new Error('EXAM_REVIEW_NOT_PENDING');
    if (!attempt.reviewClaim || attempt.reviewClaim.reviewerUid !== reviewerUid) throw new Error('EXAM_REVIEW_CLAIM_NOT_OWNED');
    if (attempt.reviewClaim.disconnectedAtIso) throw new Error('EXAM_REVIEW_CLAIM_RECLAIM_REQUIRED');
    const version = await transaction.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId || version.versionNumber !== attempt.versionNumber || !Array.isArray(version.questionsSnapshot)) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    if (!Array.isArray(gradesInput)) throw new Error('EXAM_MANUAL_GRADES_INVALID');

    const openQuestions = pendingFreeTextQuestions(attempt, version);
    const openIds = new Set(openQuestions.map(question => question.questionId));
    const grades: Record<string, number> = {};
    for (const entry of gradesInput) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(key => key !== 'questionId' && key !== 'pointsEarnedMilli')) throw new Error('EXAM_MANUAL_GRADES_INVALID');
      const { questionId, pointsEarnedMilli } = entry as Record<string, unknown>;
      const question = openQuestions.find(item => item.questionId === questionId);
      if (!question || Object.prototype.hasOwnProperty.call(grades, String(questionId)) || !Number.isSafeInteger(pointsEarnedMilli) || Number(pointsEarnedMilli) < 0 || Number(pointsEarnedMilli) > question.pointsMilli) throw new Error('EXAM_MANUAL_GRADES_INVALID');
      grades[question.questionId] = Number(pointsEarnedMilli);
    }
    if (Object.keys(grades).length !== openIds.size) throw new Error('EXAM_MANUAL_GRADES_INCOMPLETE');

    const result = scoreExam(version.questionsSnapshot, attempt.answers as any, version.passingScoreBasisPoints, grades);
    const oldGrades = new Map((Array.isArray(attempt.questionGrades) ? attempt.questionGrades as Array<Record<string, unknown>> : []).map(grade => [String(grade.questionId), grade]));
    const questionGrades = result.questionResults.map(question => ({
      questionId: question.questionId,
      pointsEarnedMilli: question.earnedPointsMilli ?? 0,
      maxPointsMilli: question.maxPointsMilli,
      requiresManualReview: question.needsManualReview,
      ...(typeof oldGrades.get(question.questionId)?.correct === 'boolean' ? { correct: oldGrades.get(question.questionId)!.correct } : {})
    }));
    const finalized: ExamAttemptRecord = {
      ...attempt,
      reviewClaim: null,
      reviewDraft: {},
      status: result.status,
      manuallyEarnedPointsMilli: result.manualEarnedPointsMilli,
      preliminaryScoreBasisPoints: result.preliminaryScoreBasisPoints,
      finalScoreBasisPoints: result.finalScoreBasisPoints,
      questionGrades,
      reviewedByUid: reviewerUid,
      reviewedAtIso: nowIso
    };
    await transaction.update('exam_attempts', attemptId, finalized);
    return toPublicSubmission(finalized, version);
  });
}


export interface CompletedManualReviewItem extends Omit<ExamReviewItem, 'reviewClaim' | 'isClaimOwner' | 'canClaim' | 'draftGrades' | 'draftRevision'> {
  status: 'passed' | 'failed';
  finalScoreBasisPoints: number | null;
  reviewedAtIso: string;
  reviewedByUid: string;
  reviewCorrections: Array<{
    reviewerUid: string; atIso: string; reason: string;
    previousReviewerUid: string; previousReviewedAtIso: string;
    previousManualPointsMilli: number; nextManualPointsMilli: number;
    previousStatus: 'passed' | 'failed'; nextStatus: 'passed' | 'failed';
    previousScoreBasisPoints: number | null; nextScoreBasisPoints: number | null;
    previousGrades: Array<{ questionId: string; pointsEarnedMilli: number }>;
    nextGrades: Array<{ questionId: string; pointsEarnedMilli: number }>;
  }>;
  questions: Array<ReturnType<typeof pendingFreeTextQuestions>[number] & { pointsEarnedMilli: number }>;
}

function completedFreeTextQuestions(attempt: ExamAttemptRecord, version: ExamVersionRecord) {
  const grades = new Map(
    (Array.isArray(attempt.questionGrades) ? attempt.questionGrades : [])
      .map((grade: any) => [String(grade?.questionId || ''), grade])
  );
  return version.questionsSnapshot.flatMap(question => {
    if (question.type !== 'free_text') return [];
    const answer = attempt.answers?.[question.id];
    const grade = grades.get(question.id) as Record<string, unknown> | undefined;
    if (typeof answer !== 'string' || !answer.trim() || !grade || grade.requiresManualReview !== false) return [];
    const pointsEarnedMilli = grade.pointsEarnedMilli;
    if (!Number.isSafeInteger(pointsEarnedMilli) || Number(pointsEarnedMilli) < 0 || Number(pointsEarnedMilli) > question.pointsMilli) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    return [{
      questionId: question.id, question: question.question, answer,
      pointsMilli: question.pointsMilli, gradingRubric: question.gradingRubric || '',
      pointsEarnedMilli: Number(pointsEarnedMilli)
    }];
  });
}

export function sortCompletedManualReviewAttempts<T extends ExamAttemptRecord>(attempts: T[]): T[] {
  return [...attempts].sort((a, b) =>
    String(b.reviewedAtIso || '').localeCompare(String(a.reviewedAtIso || ''))
  );
}

export async function listCompletedManualReviews(repository: ExamRepository): Promise<CompletedManualReviewItem[]> {
  const passed = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'passed' }], limit: HISTORY_LIMIT
  }));
  const failed = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'failed' }], limit: HISTORY_LIMIT
  }));
  const attempts = sortCompletedManualReviewAttempts([...passed, ...failed]);
  const results: CompletedManualReviewItem[] = [];
  for (const attempt of attempts) {
    if (!attempt.reviewedByUid || !attempt.reviewedAtIso) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    const questions = completedFreeTextQuestions(attempt, version);
    if (questions.length) results.push({
      id: attempt.id, examId: attempt.examId, examTitle: version.title, userName: attempt.userName,
      attemptCourseCode: attempt.attemptCourseCode, submittedAtIso: String(attempt.submittedAtIso || ''),
      assessmentStage: version.assessmentStage, status: attempt.status as 'passed' | 'failed',
      finalScoreBasisPoints: Number.isSafeInteger(attempt.finalScoreBasisPoints) ? Number(attempt.finalScoreBasisPoints) : null,
      reviewedAtIso: String(attempt.reviewedAtIso), reviewedByUid: String(attempt.reviewedByUid),
      reviewCorrections: Array.isArray(attempt.reviewCorrections) ? attempt.reviewCorrections as CompletedManualReviewItem['reviewCorrections'] : [], questions
    });
  }
  return results;
}

export interface CompletedManualReviewSummary {
  id: string;
  examId: string;
  examTitle: string;
  userName: string;
  attemptCourseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  status: 'passed' | 'failed';
  reviewedAtIso: string;
  reviewedByUid: string;
  questionSteps: Array<{ questionId: string; label: string }>;
}

/** Safe index for course-authorized reviewers: no participant answers, grading rubrics or point values. */
export async function listCompletedManualReviewSummaries(
  repository: ExamRepository,
  allowedCourseCodes: readonly string[]
): Promise<CompletedManualReviewSummary[]> {
  const allowed = new Set(allowedCourseCodes.map(code => code.trim().toUpperCase()));
  const completed = await listCompletedManualReviews(repository);
  const summaries: CompletedManualReviewSummary[] = [];
  for (const item of completed) {
    if (!allowed.has('*') && !allowed.has(item.attemptCourseCode.trim().toUpperCase())) continue;
    const attempt = await repository.get<ExamAttemptRecord>('exam_attempts', item.id);
    if (!attempt) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== item.examId) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    summaries.push({
      id: item.id, examId: item.examId, examTitle: item.examTitle, userName: item.userName,
      attemptCourseCode: item.attemptCourseCode, submittedAtIso: item.submittedAtIso,
      assessmentStage: item.assessmentStage, status: item.status, reviewedAtIso: item.reviewedAtIso,
      reviewedByUid: item.reviewedByUid,
      questionSteps: item.questions.map(question => ({
        questionId: question.questionId,
        label: `Frage ${Math.max(1, version.questionsSnapshot.findIndex(candidate => candidate.id === question.questionId) + 1)}`
      }))
    });
  }
  return summaries;
}

export async function requestExamReviewRevision(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  reasonInput: unknown,
  feedbackInput: unknown,
  notificationRecipientUids: readonly string[],
  nowIso = new Date().toISOString()
): Promise<ExamAttemptRecord> {
  const reason = typeof reasonInput === 'string' ? reasonInput.trim() : '';
  if (!reviewerUid.trim()) throw new Error('EXAM_REVIEWER_INVALID');
  if (reason.length < 10 || reason.length > 1000) throw new Error('EXAM_REVIEW_REVISION_REASON_INVALID');
  validReviewTime(nowIso);
  if (!Array.isArray(feedbackInput) || feedbackInput.length < 1 || feedbackInput.length > 50) {
    throw new Error('EXAM_REVIEW_REVISION_FEEDBACK_INVALID');
  }
  const recipients = [...new Set(notificationRecipientUids)];
  if (!recipients.length || recipients.length > 1000 ||
      recipients.some(uid => typeof uid !== 'string' || !uid.trim() || uid.length > 128)) {
    throw new Error('EXAM_REVIEW_REVISION_RECIPIENTS_INVALID');
  }
  const feedback = feedbackInput.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
        Object.keys(entry).some(key => key !== 'questionId' && key !== 'feedback')) {
      throw new Error('EXAM_REVIEW_REVISION_FEEDBACK_INVALID');
    }
    const questionId = (entry as Record<string, unknown>).questionId;
    const text = typeof (entry as Record<string, unknown>).feedback === 'string'
      ? String((entry as Record<string, unknown>).feedback).trim() : '';
    if (typeof questionId !== 'string' || !questionId.trim() || questionId.length > 128 ||
        text.length < 10 || text.length > 1000) {
      throw new Error('EXAM_REVIEW_REVISION_FEEDBACK_INVALID');
    }
    return { questionId, feedback: text };
  });
  if (new Set(feedback.map(item => item.questionId)).size !== feedback.length) {
    throw new Error('EXAM_REVIEW_REVISION_FEEDBACK_INVALID');
  }

  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.userId === reviewerUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    if (attempt.status !== 'passed' && attempt.status !== 'failed') throw new Error('EXAM_REVIEW_REVISION_NOT_COMPLETED');
    if (!attempt.reviewedByUid || !attempt.reviewedAtIso) throw new Error('EXAM_REVIEW_REVISION_NOT_COMPLETED');
    const version = await transaction.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId || version.versionNumber !== attempt.versionNumber ||
        !Array.isArray(version.questionsSnapshot)) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    const questions = completedFreeTextQuestions(attempt, version);
    if (!questions.length) throw new Error('EXAM_REVIEW_REVISION_NOT_COMPLETED');
    const questionIds = questions.map(question => question.questionId);
    if (feedback.some(item => !questionIds.includes(item.questionId))) {
      throw new Error('EXAM_REVIEW_REVISION_FEEDBACK_INVALID');
    }
    const history = Array.isArray(attempt.reviewClaimHistory) ? attempt.reviewClaimHistory : [];
    if (history.length >= REVIEW_CLAIM_HISTORY_LIMIT) throw new Error('EXAM_REVIEW_CLAIM_HISTORY_LIMIT');
    let resultReleaseStatus = attempt.resultReleaseStatus;
    let publishedResultSnapshot = attempt.publishedResultSnapshot;
    if (attempt.resultReleaseStatus === 'released') {
      publishedResultSnapshot = toPublishedResultSnapshot(toParticipantSubmission(attempt, version));
      resultReleaseStatus = 'pending_rerelease';
    } else if (attempt.resultReleaseStatus === 'pending_rerelease' && !publishedResultSnapshot) {
      throw new Error('EXAM_PUBLISHED_RESULT_SNAPSHOT_INVALID');
    }
    const questionGrades = (Array.isArray(attempt.questionGrades) ? attempt.questionGrades : []).map((grade: any) =>
      questionIds.includes(String(grade?.questionId || '')) ? { ...grade, requiresManualReview: true } : grade
    );
    const event = {
      action: 'revision_requested' as const,
      actorUid: reviewerUid,
      previousUid: attempt.reviewedByUid,
      reason,
      feedback,
      questionIds,
      recipientUids: recipients,
      notificationRequired: true as const,
      atIso: nowIso
    };
    const next: ExamAttemptRecord = {
      ...attempt,
      status: 'pending_review',
      reviewClaim: null,
      questionGrades,
      reviewClaimHistory: [...history, event],
      ...(resultReleaseStatus !== undefined ? { resultReleaseStatus } : {}),
      ...(publishedResultSnapshot ? { publishedResultSnapshot } : {})
    };
    await transaction.update('exam_attempts', attemptId, next);
    return next;
  });
}

/** Corrections are appended to reviewCorrections; the original review completion identity/time remains stable for history ordering. */
export async function correctCompletedExamReview(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  gradesInput: unknown,
  reasonInput: unknown,
  nowIso = new Date().toISOString()
): Promise<PublicExamSubmission> {
  if (!reviewerUid) throw new Error('EXAM_REVIEWER_INVALID');
  const reason = typeof reasonInput === 'string' ? reasonInput.trim() : '';
  if (reason.length < 10 || reason.length > 1000) throw new Error('EXAM_REVIEW_CORRECTION_REASON_INVALID');
  if (Number.isNaN(Date.parse(nowIso))) throw new Error('EXAM_REVIEW_CORRECTION_TIME_INVALID');

  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.userId === reviewerUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    if (attempt.status !== 'passed' && attempt.status !== 'failed') throw new Error('EXAM_REVIEW_CORRECTION_NOT_COMPLETED');
    if (!attempt.reviewedByUid || !attempt.reviewedAtIso) throw new Error('EXAM_REVIEW_CORRECTION_NOT_COMPLETED');
    const version = await transaction.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId || version.versionNumber !== attempt.versionNumber || !Array.isArray(version.questionsSnapshot)) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    if (!Array.isArray(gradesInput)) throw new Error('EXAM_MANUAL_GRADES_INVALID');

    const questions = completedFreeTextQuestions(attempt, version);
    if (!questions.length) throw new Error('EXAM_REVIEW_CORRECTION_NOT_COMPLETED');
    const grades: Record<string, number> = {};
    for (const entry of gradesInput) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
          Object.keys(entry).some(key => key !== 'questionId' && key !== 'pointsEarnedMilli')) {
        throw new Error('EXAM_MANUAL_GRADES_INVALID');
      }
      const { questionId, pointsEarnedMilli } = entry as Record<string, unknown>;
      const question = questions.find(item => item.questionId === questionId);
      if (!question || Object.prototype.hasOwnProperty.call(grades, String(questionId)) ||
          !Number.isSafeInteger(pointsEarnedMilli) || Number(pointsEarnedMilli) < 0 ||
          Number(pointsEarnedMilli) > question.pointsMilli) {
        throw new Error('EXAM_MANUAL_GRADES_INVALID');
      }
      grades[question.questionId] = Number(pointsEarnedMilli);
    }
    if (Object.keys(grades).length !== questions.length) throw new Error('EXAM_MANUAL_GRADES_INCOMPLETE');

    const result = scoreExam(version.questionsSnapshot, attempt.answers as any, version.passingScoreBasisPoints, grades);
    const oldGrades = new Map((Array.isArray(attempt.questionGrades) ? attempt.questionGrades as Array<Record<string, unknown>> : []).map(grade => [String(grade.questionId), grade]));
    const questionGrades = result.questionResults.map(question => ({
      questionId: question.questionId,
      pointsEarnedMilli: question.earnedPointsMilli ?? 0,
      maxPointsMilli: question.maxPointsMilli,
      requiresManualReview: question.needsManualReview,
      ...(typeof oldGrades.get(question.questionId)?.correct === 'boolean' ? { correct: oldGrades.get(question.questionId)!.correct } : {})
    }));
    const previousCorrectionHistory = Array.isArray(attempt.reviewCorrections) ? attempt.reviewCorrections : [];
    if (previousCorrectionHistory.length >= 100) throw new Error('EXAM_REVIEW_CORRECTION_LIMIT');
    const correction = {
      reviewerUid, atIso: nowIso, reason,
      previousReviewerUid: attempt.reviewedByUid,
      previousReviewedAtIso: attempt.reviewedAtIso,
      previousManualPointsMilli: attempt.manuallyEarnedPointsMilli,
      nextManualPointsMilli: result.manualEarnedPointsMilli,
      previousStatus: attempt.status,
      nextStatus: result.status,
      previousScoreBasisPoints: attempt.finalScoreBasisPoints ?? null,
      nextScoreBasisPoints: result.finalScoreBasisPoints,
      previousGrades: questions.map(question => ({ questionId: question.questionId, pointsEarnedMilli: question.pointsEarnedMilli })),
      nextGrades: questions.map(question => ({ questionId: question.questionId, pointsEarnedMilli: grades[question.questionId] }))
    };
    const corrected: ExamAttemptRecord = {
      ...attempt,
      status: result.status,
      manuallyEarnedPointsMilli: result.manualEarnedPointsMilli,
      preliminaryScoreBasisPoints: result.preliminaryScoreBasisPoints,
      finalScoreBasisPoints: result.finalScoreBasisPoints,
      questionGrades,
      reviewCorrections: [...previousCorrectionHistory, correction],
      ...(attempt.resultReleaseStatus === 'released' ? {
        resultReleaseStatus: 'pending_rerelease' as const,
        publishedResultSnapshot: toPublishedResultSnapshot(toPublicSubmission(attempt, version))
      } : {})
    };
    await transaction.update('exam_attempts', attemptId, corrected);
    return toPublicSubmission(corrected, version);
  });
}

export interface ReleasedFinalExamProof {
  attemptId: string;
  releasedAtIso: string;
  finalScoreBasisPoints: number;
}

/**
 * Resolve an Academy assessment requirement against the live exam repository.
 * No Academy evidence is persisted: a later review correction or re-release is
 * reflected on the next read because the current attempt state is authoritative.
 */
export async function getReleasedPassingFinalExam(
  repository: ExamRepository,
  uid: string,
  examId: string,
  courseCode: string
): Promise<ReleasedFinalExamProof | null> {
  if (!uid.trim() || !isValidId(examId) || !courseCode.trim()) return null;
  const attempts = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [
      { field: 'userId', value: uid },
      { field: 'examId', value: examId }
    ],
    limit: HISTORY_LIMIT
  }));
  const matching = attempts.filter(attempt =>
    typeof attempt.attemptCourseCode === 'string' &&
    attempt.attemptCourseCode.trim().toUpperCase() === courseCode.trim().toUpperCase() &&
    attempt.status === 'passed' &&
    attempt.assessmentStage === 'final_exam' &&
    attempt.resultReleaseStatus === 'released' &&
    Number.isSafeInteger(attempt.finalScoreBasisPoints) &&
    Array.isArray(attempt.resultReleaseHistory) &&
    attempt.resultReleaseHistory.length > 0
  );
  const proofs: ReleasedFinalExamProof[] = [];
  for (const attempt of matching) {
    if (typeof attempt.examVersionId !== 'string' || !isValidId(attempt.examVersionId)) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId ||
        version.versionNumber !== attempt.versionNumber ||
        version.assessmentStage !== 'final_exam') continue;
    const lastRelease = attempt.resultReleaseHistory![attempt.resultReleaseHistory!.length - 1];
    if (lastRelease.status !== 'passed' ||
        lastRelease.finalScoreBasisPoints !== attempt.finalScoreBasisPoints ||
        typeof lastRelease.releasedByUid !== 'string' || !lastRelease.releasedByUid.trim() ||
        typeof lastRelease.releasedAtIso !== 'string' ||
        !Number.isFinite(Date.parse(lastRelease.releasedAtIso)) ||
        !Number.isSafeInteger(version.passingScoreBasisPoints) ||
        Number(attempt.finalScoreBasisPoints) < version.passingScoreBasisPoints ||
        Number(attempt.finalScoreBasisPoints) > 10_000) continue;
    proofs.push({
      attemptId: attempt.id,
      releasedAtIso: lastRelease.releasedAtIso,
      finalScoreBasisPoints: Number(attempt.finalScoreBasisPoints)
    });
  }
  return proofs.sort((left, right) => right.releasedAtIso.localeCompare(left.releasedAtIso))[0] ?? null;
}

export interface ExamParticipantReviewHistoryItem {
  id: string;
  examId: string;
  examTitle: string;
  courseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  status: 'pending_review' | 'passed' | 'failed' | 'invalidated_by_admin';
  responsibleReviewerUid: string | null;
  responsibleReviewerName: string | null;
  reviewedAtIso: string | null;
  detailed: boolean;
  claimHistory?: ExamReviewClaimHistoryEntry[];
  reviewCorrections?: Array<Record<string, unknown>>;
  questions?: Array<{
    questionId: string;
    question: string;
    answer: string;
    pointsMilli: number;
    gradingRubric: string;
    pointsEarnedMilli?: number;
  }>;
}

/**
 * Builds the examiner-facing participant record. Course scope is supplied by the
 * authenticated HTTP layer; this function further limits confidential review
 * details to supervisors and reviewers who actually participated in the attempt.
 */
export async function listExamParticipantReviewHistory(
  repository: ExamRepository,
  participantUid: string,
  allowedCourseCodes: readonly string[],
  reviewerUid: string,
  isSupervisor: boolean
): Promise<ExamParticipantReviewHistoryItem[]> {
  if (!participantUid.trim() || !reviewerUid.trim()) throw new Error('EXAM_PARTICIPANT_HISTORY_ACTOR_INVALID');
  const attempts = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'userId', value: participantUid }], limit: HISTORY_LIMIT
  }));
  const allowed = new Set(allowedCourseCodes.map(code => code.trim().toUpperCase()));
  const results: ExamParticipantReviewHistoryItem[] = [];
  for (const attempt of attempts) {
    if (!['pending_review', 'passed', 'failed', 'invalidated_by_admin'].includes(attempt.status)) continue;
    if (!allowed.has('*') && !allowed.has(String(attempt.attemptCourseCode || '').toUpperCase())) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    const claimHistory = Array.isArray(attempt.reviewClaimHistory) ? attempt.reviewClaimHistory : [];
    const wasInvolved = attempt.reviewedByUid === reviewerUid ||
      attempt.reviewClaim?.reviewerUid === reviewerUid ||
      claimHistory.some(event =>
        event.actorUid === reviewerUid || event.targetUid === reviewerUid || event.previousUid === reviewerUid
      );
    const detailed = isSupervisor || wasInvolved;
    const questions = attempt.status === 'pending_review'
      ? pendingFreeTextQuestions(attempt, version)
      : completedFreeTextQuestions(attempt, version).map(question => ({
          ...question,
          pointsEarnedMilli: question.pointsEarnedMilli
        }));
    results.push({
      id: attempt.id,
      examId: attempt.examId,
      examTitle: version.title,
      courseCode: attempt.attemptCourseCode,
      submittedAtIso: String(attempt.submittedAtIso || ''),
      assessmentStage: version.assessmentStage,
      status: attempt.status as ExamParticipantReviewHistoryItem['status'],
      responsibleReviewerUid: attempt.reviewClaim?.reviewerUid || (typeof attempt.reviewedByUid === 'string' ? attempt.reviewedByUid : null),
      responsibleReviewerName: attempt.reviewClaim?.reviewerName || null,
      reviewedAtIso: attempt.reviewedAtIso ? String(attempt.reviewedAtIso) : null,
      detailed,
      ...(detailed ? {
        claimHistory: claimHistory.map(event => ({ ...event })),
        reviewCorrections: Array.isArray((attempt as any).reviewCorrections) ? (attempt as any).reviewCorrections : [],
        questions
      } : {})
    });
  }
  return results.sort((left, right) =>
    String(right.reviewedAtIso || right.submittedAtIso).localeCompare(String(left.reviewedAtIso || left.submittedAtIso)) || right.id.localeCompare(left.id)
  );
}

export async function listOwnExamResults(repository: ExamRepository, uid: string): Promise<PublicExamSubmission[]> {
  const attempts = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'userId', value: uid }], limit: HISTORY_LIMIT
  }));
  const results: PublicExamSubmission[] = [];
  for (const attempt of attempts) {
    if (!['passed', 'failed', 'pending_review'].includes(attempt.status)) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    results.push(toParticipantSubmission(attempt, version));
  }
  return results.sort((left, right) => right.submittedAtIso.localeCompare(left.submittedAtIso));
}


export interface ExamResultReleaseQueueItem {
  id: string;
  examId: string;
  examTitle: string;
  userName: string;
  attemptCourseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  status: 'passed' | 'failed';
  finalScoreBasisPoints: number | null;
  resultReleaseStatus: 'unreleased' | 'pending_rerelease';
  resultReleaseHistory: Array<{ releasedByUid: string; releasedAtIso: string; status: 'passed' | 'failed'; finalScoreBasisPoints: number | null }>;
}

export async function listPendingExamResultReleases(repository: ExamRepository): Promise<ExamResultReleaseQueueItem[]> {
  const passed = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'passed' }], limit: HISTORY_LIMIT
  }));
  const failed = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'failed' }], limit: HISTORY_LIMIT
  }));
  if (passed.length + failed.length >= HISTORY_LIMIT) throw new Error('EXAM_ATTEMPT_HISTORY_LIMIT');
  const attempts = [...passed, ...failed];
  const results: ExamResultReleaseQueueItem[] = [];
  for (const attempt of attempts) {
    if (attempt.status !== 'passed' && attempt.status !== 'failed') continue;
    if (attempt.resultReleaseStatus === 'released') continue;
    if (typeof attempt.examVersionId !== 'string' || !isValidId(attempt.examVersionId)) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    // Historische oder beschädigte Versuche ohne exakt passende unveränderliche Version
    // dürfen nicht zur Freigabe angeboten werden.
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) continue;
    results.push({
      id: attempt.id, examId: attempt.examId, examTitle: version.title, userName: attempt.userName,
      attemptCourseCode: attempt.attemptCourseCode, submittedAtIso: String(attempt.submittedAtIso || ''),
      assessmentStage: version.assessmentStage, status: attempt.status,
      finalScoreBasisPoints: Number.isSafeInteger(attempt.finalScoreBasisPoints) ? Number(attempt.finalScoreBasisPoints) : null,
      resultReleaseStatus: attempt.resultReleaseStatus === 'pending_rerelease' ? 'pending_rerelease' : 'unreleased',
      resultReleaseHistory: Array.isArray(attempt.resultReleaseHistory) ? attempt.resultReleaseHistory : []
    });
  }
  return results.sort((a, b) => a.submittedAtIso.localeCompare(b.submittedAtIso));
}

export async function releaseExamResult(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  releasedByUid: string,
  releasedAtIso = new Date().toISOString()
): Promise<PublicExamSubmission> {
  if (!releasedByUid) throw new Error('EXAM_RESULT_RELEASE_ACTOR_INVALID');
  if (!Number.isFinite(Date.parse(releasedAtIso))) throw new Error('EXAM_RESULT_RELEASE_TIME_INVALID');
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'passed' && attempt.status !== 'failed') throw new Error('EXAM_RESULT_NOT_FINAL');
    const version = await transaction.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId || version.versionNumber !== attempt.versionNumber) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    if (attempt.resultReleaseStatus === 'released') return toPublicSubmission(attempt, version);
    const history = Array.isArray(attempt.resultReleaseHistory) ? attempt.resultReleaseHistory : [];
    if (history.length >= 100) throw new Error('EXAM_RESULT_RELEASE_HISTORY_LIMIT');
    const updated: ExamAttemptRecord = {
      ...attempt,
      resultReleaseStatus: 'released',
      resultReleaseHistory: [...history, {
        releasedByUid,
        releasedAtIso,
        status: attempt.status,
        finalScoreBasisPoints: Number.isSafeInteger(attempt.finalScoreBasisPoints) ? Number(attempt.finalScoreBasisPoints) : null
      }]
    };
    await transaction.update('exam_attempts', attemptId, updated);
    return toPublicSubmission(updated, version);
  });
}
