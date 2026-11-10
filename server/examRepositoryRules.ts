import { isDeepStrictEqual } from 'node:util';
import { validateLegacyVerification } from './examLegacy.ts';
import { EXAM_LIMITS } from './examTypes.ts';
import type {
  AttemptInvalidationAudit,
  ExamCollection,
  ExamDocument,
  ExamQuery
} from './examRepositoryTypes.ts';
import { EXAM_COLLECTIONS } from './examRepositoryTypes.ts';

export function assertExamCollection(collection: string): asserts collection is ExamCollection {
  if (!(EXAM_COLLECTIONS as readonly string[]).includes(collection)) {
    throw new Error('EXAM_COLLECTION_INVALID');
  }
}

export function assertExamDocumentId(id: string): void {
  if (
    typeof id !== 'string' ||
    id.trim().length === 0 ||
    Buffer.byteLength(encodeURIComponent(id), 'utf8') > 1500
  ) {
    throw new Error('EXAM_DOCUMENT_ID_INVALID');
  }
}

export function assertExamDocument(
  collection: ExamCollection,
  id: string,
  document: ExamDocument
): void {
  assertExamCollection(collection);
  assertExamDocumentId(id);
  if (
    !document ||
    typeof document !== 'object' ||
    Array.isArray(document) ||
    !Object.prototype.hasOwnProperty.call(document, 'id') ||
    document.id !== id
  ) {
    throw new Error('EXAM_DOCUMENT_INVALID');
  }

  if (collection === 'exam_comments') {
    if (
      typeof document.examId !== 'string' || !document.examId.trim() ||
      typeof document.authorUid !== 'string' || !document.authorUid.trim() ||
      typeof document.authorName !== 'string' || document.authorName.length > 120 ||
      typeof document.body !== 'string' || !document.body.trim() || document.body.length > 4000 ||
      typeof document.createdIso !== 'string' || Number.isNaN(Date.parse(document.createdIso))
    ) throw new Error('EXAM_COMMENT_INVALID');
  }

  if (collection === 'exam_publication_requests') {
    if (
      typeof document.examId !== 'string' || !document.examId.trim() ||
      typeof document.requestedByUid !== 'string' || !document.requestedByUid.trim() ||
      typeof document.requestedByName !== 'string' || document.requestedByName.length > 120 ||
      (document.assessmentStage !== 'test' && document.assessmentStage !== 'final_exam') ||
      (document.requestKind !== 'new' && document.requestKind !== 'update') ||
      !['pending', 'published', 'returned', 'rejected', 'archived'].includes(String(document.status)) ||
      typeof document.submittedRevision !== 'number' || !Number.isSafeInteger(document.submittedRevision) || document.submittedRevision < 1 ||
      typeof document.submittedHash !== 'string' || !/^[a-f0-9]{64}$/.test(document.submittedHash) ||
      typeof document.createdIso !== 'string' || Number.isNaN(Date.parse(document.createdIso)) ||
      typeof document.updatedIso !== 'string' || Number.isNaN(Date.parse(document.updatedIso)) ||
      (document.reviewComment !== undefined && (typeof document.reviewComment !== 'string' || document.reviewComment.length > 1000))
    ) throw new Error('EXAM_PUBLICATION_REQUEST_INVALID');
  }

  if (collection === 'exam_versions') {
    if (
      typeof document.examId !== 'string' ||
      !document.examId.trim() ||
      typeof document.versionNumber !== 'number' ||
      !Number.isSafeInteger(document.versionNumber) ||
      document.versionNumber < 1 ||
      id !== `${document.examId}__v${document.versionNumber}`
    ) {
      throw new Error('EXAM_VERSION_ID_INVALID');
    }

    let serialized: string;
    try {
      const value = JSON.stringify(document);
      if (typeof value !== 'string') throw new Error('EXAM_DOCUMENT_NOT_SERIALIZABLE');
      serialized = value;
    } catch {
      throw new Error('EXAM_DOCUMENT_NOT_SERIALIZABLE');
    }
    if (Buffer.byteLength(serialized, 'utf8') > EXAM_LIMITS.maxSnapshotBytes) {
      throw new Error('EXAM_SNAPSHOT_TOO_LARGE');
    }
  }

  if (collection === 'exam_legacy_verifications') {
    if (
      typeof document.legacyProgressId !== 'string' ||
      !document.legacyProgressId.trim() ||
      id !== `legacy_verification__${document.legacyProgressId.replace(/\//g, '%2F')}`
    ) {
      throw new Error('EXAM_LEGACY_VERIFICATION_ID_INVALID');
    }
    if (!validateLegacyVerification(document).ok) {
      throw new Error('EXAM_LEGACY_VERIFICATION_INVALID');
    }
  }
}

export function assertExamQuery(collection: ExamCollection, query: ExamQuery = {}): void {
  if (
    !query ||
    typeof query !== 'object' ||
    Array.isArray(query) ||
    (query.where !== undefined && !Array.isArray(query.where))
  ) {
    throw new Error('EXAM_QUERY_INVALID');
  }
  if (collection !== 'exam_masters' && (!query.where || query.where.length === 0)) {
    throw new Error('EXAM_QUERY_FILTER_REQUIRED');
  }
  if (
    query.limit !== undefined &&
    (!Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 1000)
  ) {
    throw new Error('EXAM_QUERY_LIMIT_INVALID');
  }
  for (const filter of query.where ?? []) {
    if (
      !filter ||
      typeof filter !== 'object' ||
      typeof filter.field !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(filter.field)
    ) {
      throw new Error('EXAM_QUERY_FIELD_INVALID');
    }
    const valueType = typeof filter.value;
    if (
      filter.value !== null &&
      valueType !== 'string' &&
      valueType !== 'number' &&
      valueType !== 'boolean'
    ) {
      throw new Error('EXAM_QUERY_VALUE_INVALID');
    }
    if (typeof filter.value === 'number' && !Number.isFinite(filter.value)) {
      throw new Error('EXAM_QUERY_VALUE_INVALID');
    }
  }
}

export function assertExamCanUpdate(collection: ExamCollection): void {
  if (collection === 'exam_versions' || collection === 'exam_legacy_verifications' || collection === 'exam_comments') {
    throw new Error('EXAM_DOCUMENT_APPEND_ONLY');
  }
}

export function assertExamAttemptCreate(
  collection: ExamCollection,
  document: ExamDocument
): void {
  if (collection === 'exam_attempts' && document.status !== 'in_progress') {
    throw new Error('EXAM_ATTEMPT_MUST_START_IN_PROGRESS');
  }
}

export function assertExamAttemptUpdate(existing: ExamDocument, next: ExamDocument): void {
  if (existing.status === 'passed' || existing.status === 'failed') {
    const previousReleaseHistory = Array.isArray(existing.resultReleaseHistory) ? existing.resultReleaseHistory : [];
    const nextReleaseHistory = Array.isArray(next.resultReleaseHistory) ? next.resultReleaseHistory : [];
    const releaseEntry = nextReleaseHistory[nextReleaseHistory.length - 1] as Record<string, unknown> | undefined;
    const isReleaseAppend = nextReleaseHistory.length === previousReleaseHistory.length + 1 &&
      isDeepStrictEqual(nextReleaseHistory.slice(0, -1), previousReleaseHistory);
    if (isReleaseAppend) {
      const stripReleaseMutable = (document: ExamDocument) => Object.fromEntries(
        Object.entries(document).filter(([key]) => key !== 'resultReleaseStatus' && key !== 'resultReleaseHistory')
      );
      if (
        next.resultReleaseStatus !== 'released' ||
        existing.resultReleaseStatus === 'released' ||
        next.status !== existing.status ||
        !isDeepStrictEqual(stripReleaseMutable(existing), stripReleaseMutable(next)) ||
        !releaseEntry ||
        Object.keys(releaseEntry).sort().join(',') !== 'finalScoreBasisPoints,releasedAtIso,releasedByUid,status' ||
        typeof releaseEntry.releasedByUid !== 'string' || !releaseEntry.releasedByUid.trim() ||
        typeof releaseEntry.releasedAtIso !== 'string' || Number.isNaN(Date.parse(releaseEntry.releasedAtIso)) ||
        releaseEntry.status !== existing.status ||
        !isDeepStrictEqual(releaseEntry.finalScoreBasisPoints, existing.finalScoreBasisPoints ?? null) ||
        nextReleaseHistory.length > 100
      ) throw new Error('EXAM_RESULT_RELEASE_INVALID');
      return;
    }
    const previousHistory = Array.isArray(existing.reviewCorrections) ? existing.reviewCorrections : [];
    const nextHistory = Array.isArray(next.reviewCorrections) ? next.reviewCorrections : [];
    const allowedMutableFields = new Set([
      'status', 'manuallyEarnedPointsMilli', 'preliminaryScoreBasisPoints',
      'finalScoreBasisPoints', 'questionGrades', 'reviewedByUid', 'reviewedAtIso',
      'reviewCorrections', 'resultReleaseStatus', 'resultReleaseHistory'
    ]);
    const stripMutable = (document: ExamDocument) => Object.fromEntries(
      Object.entries(document).filter(([key]) => !allowedMutableFields.has(key))
    );
    const appended = nextHistory[nextHistory.length - 1] as Record<string, unknown> | undefined;
    const previousGrades = Array.isArray(appended?.previousGrades) ? appended.previousGrades : null;
    const nextGrades = Array.isArray(appended?.nextGrades) ? appended.nextGrades : null;
    const previousScore = appended?.previousScoreBasisPoints;
    const nextScore = appended?.nextScoreBasisPoints;
    if (
      nextHistory.length !== previousHistory.length + 1 ||
      !isDeepStrictEqual(nextHistory.slice(0, -1), previousHistory)
    ) throw new Error('EXAM_ATTEMPT_IMMUTABLE');
    if (
      (next.status !== 'passed' && next.status !== 'failed') ||
      !isDeepStrictEqual(stripMutable(existing), stripMutable(next)) ||
      !isDeepStrictEqual(next.resultReleaseHistory, existing.resultReleaseHistory) ||
      !(existing.resultReleaseStatus === 'released'
        ? next.resultReleaseStatus === 'pending_rerelease'
        : isDeepStrictEqual(next.resultReleaseStatus, existing.resultReleaseStatus)) ||
      !appended || typeof appended !== 'object' ||
      typeof appended.reviewerUid !== 'string' || !appended.reviewerUid.trim() ||
      typeof appended.atIso !== 'string' || Number.isNaN(Date.parse(appended.atIso)) ||
      typeof appended.reason !== 'string' || appended.reason.trim().length < 10 || appended.reason.length > 1000 ||
      !['passed', 'failed'].includes(String(appended.previousStatus)) ||
      !['passed', 'failed'].includes(String(appended.nextStatus)) ||
      appended.nextStatus !== next.status ||
      !previousGrades || !nextGrades ||
      !isDeepStrictEqual(appended.previousStatus, existing.status) ||
      !isDeepStrictEqual(appended.previousScoreBasisPoints, existing.finalScoreBasisPoints ?? null) ||
      !isDeepStrictEqual(appended.nextScoreBasisPoints, next.finalScoreBasisPoints ?? null) ||
      !isDeepStrictEqual(next.reviewedByUid, appended.reviewerUid) ||
      !isDeepStrictEqual(next.reviewedAtIso, appended.atIso) ||
      !isDeepStrictEqual(appended.previousReviewerUid, existing.reviewedByUid) ||
      !isDeepStrictEqual(appended.previousReviewedAtIso, existing.reviewedAtIso) ||
      !isDeepStrictEqual(appended.previousManualPointsMilli, existing.manuallyEarnedPointsMilli) ||
      !isDeepStrictEqual(appended.nextManualPointsMilli, next.manuallyEarnedPointsMilli) ||
      !Number.isSafeInteger(appended.previousManualPointsMilli) || Number(appended.previousManualPointsMilli) < 0 ||
      !Number.isSafeInteger(appended.nextManualPointsMilli) || Number(appended.nextManualPointsMilli) < 0 ||
      !isDeepStrictEqual(
        Object.keys(appended).sort(),
        ['atIso', 'nextGrades', 'nextManualPointsMilli', 'nextScoreBasisPoints', 'nextStatus', 'previousGrades', 'previousManualPointsMilli', 'previousReviewedAtIso', 'previousReviewerUid', 'previousScoreBasisPoints', 'previousStatus', 'reason', 'reviewerUid'].sort()
      ) ||
      !previousGrades.every((grade: any, index: number, all: any[]) =>
        grade && typeof grade.questionId === 'string' && grade.questionId.trim() &&
        Number.isSafeInteger(grade.pointsEarnedMilli) && grade.pointsEarnedMilli >= 0 &&
        all.findIndex((candidate: any) => candidate?.questionId === grade.questionId) === index &&
        Array.isArray(existing.questionGrades) &&
        existing.questionGrades.some((current: any) => current?.questionId === grade.questionId && current.pointsEarnedMilli === grade.pointsEarnedMilli)
      ) ||
      !nextGrades.every((grade: any, index: number, all: any[]) =>
        grade && typeof grade.questionId === 'string' && grade.questionId.trim() &&
        Number.isSafeInteger(grade.pointsEarnedMilli) && grade.pointsEarnedMilli >= 0 &&
        all.findIndex((candidate: any) => candidate?.questionId === grade.questionId) === index &&
        Array.isArray(next.questionGrades) &&
        next.questionGrades.some((current: any) => current?.questionId === grade.questionId && current.pointsEarnedMilli === grade.pointsEarnedMilli)
      ) ||
      previousGrades.length === 0 ||
      previousGrades.reduce((sum: number, grade: any) => sum + grade.pointsEarnedMilli, 0) !== appended.previousManualPointsMilli ||
      nextGrades.reduce((sum: number, grade: any) => sum + grade.pointsEarnedMilli, 0) !== appended.nextManualPointsMilli ||
      previousGrades.length !== nextGrades.length ||
      previousGrades.some((grade: any) => !nextGrades.some((nextGrade: any) => nextGrade.questionId === grade.questionId)) ||
      (nextScore !== null && (typeof nextScore !== 'number' || !Number.isSafeInteger(nextScore) || nextScore < 0 || nextScore > 10000)) ||
      (previousScore !== null && (typeof previousScore !== 'number' || !Number.isSafeInteger(previousScore) || previousScore < 0 || previousScore > 10000))
    ) throw new Error('EXAM_ATTEMPT_CORRECTION_INVALID');
    return;
  }
  if (existing.status === 'pending_review' && next.status === 'pending_review') {
    const mutable = new Set(['reviewClaim', 'reviewClaimHistory', 'reviewDraft', 'reviewDraftRevision', 'reviewDraftUpdatedAtIso', 'reviewDraftUpdatedByUid']);
    const strip = (document: ExamDocument) => Object.fromEntries(
      Object.entries(document).filter(([key]) => !mutable.has(key))
    );
    if (!isDeepStrictEqual(strip(existing), strip(next))) throw new Error('EXAM_ATTEMPT_IMMUTABLE');

    const claim = next.reviewClaim;
    if (claim !== undefined && claim !== null) {
      const allowedKeys = ['claimedAtIso', 'lastActivityAtIso', 'reviewerName', 'reviewerUid', 'warningStartedAtIso', 'disconnectedAtIso'];
      if (typeof claim !== 'object' || Array.isArray(claim) ||
          Object.keys(claim as object).some(key => !allowedKeys.includes(key)) ||
          typeof (claim as any).reviewerUid !== 'string' || !(claim as any).reviewerUid.trim() ||
          typeof (claim as any).reviewerName !== 'string' || !(claim as any).reviewerName.trim() || (claim as any).reviewerName.length > 120 ||
          typeof (claim as any).claimedAtIso !== 'string' || Number.isNaN(Date.parse((claim as any).claimedAtIso)) ||
          typeof (claim as any).lastActivityAtIso !== 'string' || Number.isNaN(Date.parse((claim as any).lastActivityAtIso)) ||
          ((claim as any).warningStartedAtIso !== undefined && (typeof (claim as any).warningStartedAtIso !== 'string' || Number.isNaN(Date.parse((claim as any).warningStartedAtIso)))) ||
          ((claim as any).disconnectedAtIso !== undefined && (typeof (claim as any).disconnectedAtIso !== 'string' || Number.isNaN(Date.parse((claim as any).disconnectedAtIso))))) {
        throw new Error('EXAM_REVIEW_CLAIM_INVALID');
      }
    }

    const draft = next.reviewDraft;
    const nextReviewClaim = next.reviewClaim as { reviewerUid?: string; disconnectedAtIso?: string } | null | undefined;
    if (draft !== undefined && (typeof draft !== 'object' || draft === null || Array.isArray(draft) ||
        Object.entries(draft).some(([questionId, points]) =>
          !questionId.trim() || questionId.length > 128 || !Number.isSafeInteger(points) || Number(points) < 0
        ))) {
      throw new Error('EXAM_REVIEW_DRAFT_INVALID');
    }
    const previousDraft = existing.reviewDraft ?? {};
    const nextDraft = next.reviewDraft ?? {};
    const draftChanged = !isDeepStrictEqual(previousDraft, nextDraft);
    const previousDraftRevision = Number.isSafeInteger(existing.reviewDraftRevision) ? Number(existing.reviewDraftRevision) : 0;
    const nextDraftRevision = Number.isSafeInteger(next.reviewDraftRevision) ? Number(next.reviewDraftRevision) : 0;
    if (draftChanged) {
      if (nextDraftRevision !== previousDraftRevision + 1 ||
          typeof next.reviewDraftUpdatedByUid !== 'string' || !next.reviewDraftUpdatedByUid.trim() ||
          !nextReviewClaim || nextReviewClaim.reviewerUid !== next.reviewDraftUpdatedByUid || nextReviewClaim.disconnectedAtIso !== undefined ||
          typeof next.reviewDraftUpdatedAtIso !== 'string' || Number.isNaN(Date.parse(next.reviewDraftUpdatedAtIso))) {
        throw new Error('EXAM_REVIEW_DRAFT_INVALID');
      }
    } else if (
      nextDraftRevision !== previousDraftRevision ||
      !isDeepStrictEqual(next.reviewDraftUpdatedAtIso, existing.reviewDraftUpdatedAtIso) ||
      !isDeepStrictEqual(next.reviewDraftUpdatedByUid, existing.reviewDraftUpdatedByUid)
    ) {
      throw new Error('EXAM_REVIEW_DRAFT_INVALID');
    }

    const previousHistory = Array.isArray(existing.reviewClaimHistory) ? existing.reviewClaimHistory : [];
    const nextHistory = Array.isArray(next.reviewClaimHistory) ? next.reviewClaimHistory : [];
    const historyUnchanged = isDeepStrictEqual(previousHistory, nextHistory);
    const historyAppended = nextHistory.length === previousHistory.length + 1 &&
      isDeepStrictEqual(nextHistory.slice(0, -1), previousHistory);
    const historyDeliveryUpdated = !historyUnchanged && nextHistory.length === previousHistory.length &&
      nextHistory.every((value, index) => {
        const previous = previousHistory[index] as Record<string, unknown>;
        const current = value as Record<string, unknown>;
        const { notificationDeliveredTo: previousDelivered, ...previousCore } = previous;
        const { notificationDeliveredTo: nextDelivered, ...nextCore } = current;
        const previousRecipients = Array.isArray(previousDelivered) ? previousDelivered : [];
        const nextRecipients = Array.isArray(nextDelivered) ? nextDelivered : [];
        return isDeepStrictEqual(previousCore, nextCore) &&
          nextRecipients.length >= previousRecipients.length &&
          previousRecipients.every((uid, recipientIndex) => uid === nextRecipients[recipientIndex]) &&
          nextRecipients.length <= 2 &&
          nextRecipients.every(uid => typeof uid === 'string' && uid.trim().length > 0);
      });
    if ((!historyUnchanged && !historyAppended && !historyDeliveryUpdated) || nextHistory.length > 100) {
      throw new Error('EXAM_REVIEW_CLAIM_HISTORY_INVALID');
    }
    const previousClaim = (existing.reviewClaim ?? null) as Record<string, unknown> | null;
    const nextClaim = (next.reviewClaim ?? null) as Record<string, unknown> | null;
    if (historyDeliveryUpdated && (
      !isDeepStrictEqual(previousClaim, nextClaim) ||
      draftChanged ||
      nextDraftRevision !== previousDraftRevision
    )) {
      throw new Error('EXAM_REVIEW_CLAIM_HISTORY_INVALID');
    }
    if (historyAppended) {
      const entry = nextHistory[nextHistory.length - 1] as Record<string, unknown>;
      const allowedHistoryKeys = [
        'action', 'actorUid', 'targetUid', 'previousUid', 'reason',
        'notificationRequired', 'notificationDeliveredTo', 'atIso'
      ];
      const notificationActions = ['warning_started', 'auto_released', 'transferred', 'reassigned'];
      const validRecipients = entry.action === 'transferred' || entry.action === 'reassigned'
        ? [entry.previousUid, entry.targetUid]
        : [entry.targetUid];
      if (!entry || Object.keys(entry).some(key => !allowedHistoryKeys.includes(key)) ||
          !['claimed', 'reclaimed', 'released', 'auto_released', 'warning_started', 'transferred', 'reassigned'].includes(String(entry.action)) ||
          typeof entry.actorUid !== 'string' || !entry.actorUid.trim() ||
          (entry.targetUid !== undefined && (typeof entry.targetUid !== 'string' || !entry.targetUid.trim())) ||
          (entry.previousUid !== undefined && (typeof entry.previousUid !== 'string' || !entry.previousUid.trim())) ||
          (entry.reason !== undefined && (typeof entry.reason !== 'string' || !entry.reason.trim() || entry.reason.length > 500)) ||
          (entry.notificationRequired !== undefined && entry.notificationRequired !== true) ||
          (entry.notificationRequired === true && !notificationActions.includes(String(entry.action))) ||
          (entry.notificationDeliveredTo !== undefined && (
            entry.notificationRequired !== true || !Array.isArray(entry.notificationDeliveredTo) ||
            entry.notificationDeliveredTo.length > 2 ||
            entry.notificationDeliveredTo.some((uid, index, values) =>
              typeof uid !== 'string' || !uid.trim() || !validRecipients.includes(uid) || values.indexOf(uid) !== index
            )
          )) ||
          typeof entry.atIso !== 'string' || Number.isNaN(Date.parse(entry.atIso))) {
        throw new Error('EXAM_REVIEW_CLAIM_HISTORY_INVALID');
      }
      const action = entry.action;
      if (
        (action === 'claimed' && (
          !nextClaim || previousClaim !== null ||
          entry.actorUid !== nextClaim.reviewerUid ||
          entry.targetUid !== nextClaim.reviewerUid
        )) ||
        (action === 'reclaimed' && (
          previousClaim === null || nextClaim === null ||
          !previousClaim.disconnectedAtIso ||
          previousClaim.reviewerUid !== nextClaim.reviewerUid ||
          entry.actorUid !== previousClaim.reviewerUid ||
          entry.targetUid !== nextClaim.reviewerUid ||
          previousClaim.claimedAtIso === nextClaim.claimedAtIso ||
          nextClaim.disconnectedAtIso !== undefined
        )) ||
        (action === 'released' && (
          previousClaim === null || nextClaim !== null ||
          entry.actorUid !== previousClaim.reviewerUid ||
          entry.targetUid !== previousClaim.reviewerUid ||
          (entry.reason !== undefined && entry.reason !== 'voluntary')
        )) ||
        (action === 'auto_released' && (
          previousClaim === null || nextClaim !== null ||
          entry.actorUid !== 'system' ||
          entry.targetUid !== previousClaim.reviewerUid ||
          (entry.reason !== undefined && !['inactivity', 'disconnect'].includes(String(entry.reason)))
        )) ||
        (action === 'warning_started' && (
          previousClaim === null || nextClaim === null ||
          previousClaim.reviewerUid !== nextClaim.reviewerUid ||
          previousClaim.warningStartedAtIso !== undefined ||
          nextClaim.warningStartedAtIso !== entry.atIso ||
          previousClaim.lastActivityAtIso !== nextClaim.lastActivityAtIso ||
          entry.actorUid !== 'system' ||
          entry.targetUid !== previousClaim.reviewerUid ||
          entry.notificationRequired !== true
        )) ||
        (action === 'transferred' && (
          previousClaim === null || nextClaim === null ||
          previousClaim.reviewerUid !== entry.previousUid ||
          previousClaim.reviewerUid !== entry.actorUid ||
          nextClaim.reviewerUid !== entry.targetUid ||
          entry.targetUid === entry.previousUid ||
          previousClaim.disconnectedAtIso !== undefined ||
          nextClaim.claimedAtIso !== entry.atIso ||
          nextClaim.lastActivityAtIso !== entry.atIso ||
          nextClaim.warningStartedAtIso !== undefined ||
          nextClaim.disconnectedAtIso !== undefined ||
          entry.notificationRequired !== true
        )) ||
        (action === 'reassigned' && (
          previousClaim === null || nextClaim === null ||
          previousClaim.reviewerUid !== entry.previousUid ||
          nextClaim.reviewerUid !== entry.targetUid ||
          entry.targetUid === entry.previousUid ||
          nextClaim.claimedAtIso !== entry.atIso ||
          nextClaim.lastActivityAtIso !== entry.atIso ||
          nextClaim.warningStartedAtIso !== undefined ||
          nextClaim.disconnectedAtIso !== undefined ||
          entry.notificationRequired !== true
        ))
      ) {
        throw new Error('EXAM_REVIEW_CLAIM_HISTORY_INVALID');
      }
    }
    if (historyDeliveryUpdated) {
      for (let index = 0; index < nextHistory.length; index++) {
        const previous = previousHistory[index] as Record<string, unknown>;
        const current = nextHistory[index] as Record<string, unknown>;
        const previousRecipients = Array.isArray(previous.notificationDeliveredTo) ? previous.notificationDeliveredTo : [];
        const nextRecipients = Array.isArray(current.notificationDeliveredTo) ? current.notificationDeliveredTo : [];
        if (nextRecipients.length === previousRecipients.length) continue;
        const expectedRecipients = current.action === 'transferred' || current.action === 'reassigned'
          ? [current.previousUid, current.targetUid]
          : [current.targetUid];
        if (current.notificationRequired !== true ||
            nextRecipients.some(uid => !expectedRecipients.includes(uid)) ||
            nextRecipients.length > expectedRecipients.length) {
          throw new Error('EXAM_REVIEW_CLAIM_HISTORY_INVALID');
        }
      }
    }
    if (!isDeepStrictEqual(previousClaim, nextClaim) && !historyAppended) {
      const sameOwner = previousClaim && nextClaim && previousClaim.reviewerUid === nextClaim.reviewerUid;
      if (!sameOwner) throw new Error('EXAM_REVIEW_CLAIM_HISTORY_INVALID');
    }
    return;
  }
  if (existing.status !== 'in_progress' && existing.status !== 'pending_review') {
    throw new Error('EXAM_ATTEMPT_IMMUTABLE');
  }
  const allowedNextStatuses = existing.status === 'in_progress'
    ? ['in_progress', 'pending_review', 'passed', 'failed']
    : ['pending_review', 'passed', 'failed'];
  if (typeof next.status !== 'string' || !allowedNextStatuses.includes(next.status)) {
    throw new Error('EXAM_ATTEMPT_STATUS_INVALID');
  }
}

export function assertExamCanDelete(collection: ExamCollection): void {
  if (collection !== 'exam_progress') {
    throw new Error('EXAM_DOCUMENT_DELETE_FORBIDDEN');
  }
}

export function assertAttemptInvalidationAudit(audit: AttemptInvalidationAudit): void {
  if (
    !audit ||
    typeof audit !== 'object' ||
    typeof audit.adminUid !== 'string' ||
    !audit.adminUid.trim() ||
    audit.adminUid.length > 128 ||
    typeof audit.reason !== 'string' ||
    !audit.reason.trim() ||
    audit.reason.length > 1000 ||
    typeof audit.atIso !== 'string' ||
    Number.isNaN(Date.parse(audit.atIso))
  ) {
    throw new Error('EXAM_INVALIDATION_AUDIT_INVALID');
  }
}
