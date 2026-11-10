import { assertExamDocument } from './examRepositoryRules.ts';
import { legacyVerificationId, validateLegacyVerification } from './examLegacy.ts';
import { EXAM_COLLECTIONS } from './examRepositoryTypes.ts';
import type { ExamCollection, ExamDocument, ExamRepositorySnapshot } from './examRepositoryTypes.ts';
import type { LegacyVerificationDoc } from './examTypes.ts';
import { normalizeCourseCode, validateExamForPublication } from './examValidate.ts';
import {
  createMatchingPairOrders,
  createMatchingPresentationIds,
  evaluateExamAnswers,
  parseAttemptAnswers,
  projectQuestionsForAttempt
} from './examRunner.ts';
import { meetsPassingScore, scoreBasisPoints } from './examMath.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fail(code: string): never {
  throw new Error(code);
}

/**
 * Prüft einen vollständigen Exam-Snapshot vor jeder Änderung am produktiven Datenbestand.
 * Neben den Dokumentregeln werden die stabilen Referenzen zwischen Master, Versionen und Versuchen geprüft.
 */
function validIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function validateBackupAttempt(attempt: ExamDocument, version: ExamDocument): void {
  const allowedStatuses = new Set([
    'in_progress', 'pending_review', 'passed', 'failed', 'invalidated_by_admin'
  ]);
  const attemptCourseCode = normalizeCourseCode(attempt.attemptCourseCode);
  if (
    typeof attempt.userId !== 'string' || !attempt.userId.trim() ||
    typeof attempt.userName !== 'string' || !attempt.userName.trim() || attempt.userName.length > 200 ||
    !attemptCourseCode || attemptCourseCode !== attempt.attemptCourseCode ||
    attempt.moduleCode !== attemptCourseCode ||
    !Array.isArray(attempt.assignedCourseCodesAtStart) ||
    !attempt.assignedCourseCodesAtStart.every(code => typeof code === 'string' && normalizeCourseCode(code) === code) ||
    !attempt.assignedCourseCodesAtStart.includes(attemptCourseCode) ||
    !Number.isSafeInteger(attempt.attemptNumber) || Number(attempt.attemptNumber) < 1 ||
    !validIsoTimestamp(attempt.startedAtIso) ||
    !validIsoTimestamp(attempt.lastHeartbeatAtIso) ||
    (attempt.deadlineIso !== null && !validIsoTimestamp(attempt.deadlineIso)) ||
    !Number.isSafeInteger(attempt.currentRevision) || Number(attempt.currentRevision) < 0 ||
    !allowedStatuses.has(String(attempt.status)) ||
    attempt.assessmentStage !== version.assessmentStage ||
    version.startable === false
  ) {
    fail('EXAM_BACKUP_ATTEMPT_CONTENT_INVALID');
  }

  const questions = version.questionsSnapshot as Array<Record<string, unknown>>;
  let totalPossiblePointsMilli = 0;
  for (const question of questions) {
    if (!Number.isSafeInteger(question.pointsMilli) || Number(question.pointsMilli) <= 0) {
      fail('EXAM_BACKUP_ATTEMPT_CONTENT_INVALID');
    }
    totalPossiblePointsMilli += Number(question.pointsMilli);
    if (!Number.isSafeInteger(totalPossiblePointsMilli)) fail('EXAM_BACKUP_ATTEMPT_CONTENT_INVALID');
  }
  if (attempt.totalPossiblePointsMilli !== totalPossiblePointsMilli) {
    fail('EXAM_BACKUP_ATTEMPT_POINTS_INVALID');
  }

  for (const field of ['automaticallyEarnedPointsMilli', 'manuallyEarnedPointsMilli'] as const) {
    if (!Number.isSafeInteger(attempt[field]) || Number(attempt[field]) < 0 || Number(attempt[field]) > totalPossiblePointsMilli) {
      fail('EXAM_BACKUP_ATTEMPT_POINTS_INVALID');
    }
  }
  if (!Number.isSafeInteger(attempt.preliminaryScoreBasisPoints) ||
      Number(attempt.preliminaryScoreBasisPoints) < 0 || Number(attempt.preliminaryScoreBasisPoints) > 10_000) {
    fail('EXAM_BACKUP_ATTEMPT_SCORE_INVALID');
  }
  const finalScore = attempt.finalScoreBasisPoints;
  if (finalScore !== null &&
      (!Number.isSafeInteger(finalScore) || Number(finalScore) < 0 || Number(finalScore) > 10_000)) {
    fail('EXAM_BACKUP_ATTEMPT_SCORE_INVALID');
  }

  let parsedAnswers: Record<string, unknown>;
  try {
    parsedAnswers = parseAttemptAnswers(attempt.answers, questions as never);
    const shuffleOrders = attempt.matchingShuffleOrders === undefined ? {} : attempt.matchingShuffleOrders;
    const presentationIds = attempt.matchingPresentationIds === undefined
      ? createMatchingPresentationIds(questions as never)
      : attempt.matchingPresentationIds;
    const pairOrders = attempt.matchingPairOrders === undefined
      ? createMatchingPairOrders(questions as never)
      : attempt.matchingPairOrders;
    projectQuestionsForAttempt(
      questions as never,
      shuffleOrders as never,
      presentationIds as never,
      pairOrders as never
    );
  } catch {
    fail('EXAM_BACKUP_ATTEMPT_ANSWERS_OR_PRESENTATION_INVALID');
  }

  if (attempt.status === 'in_progress') {
    if (attempt.submittedAtIso !== undefined || attempt.questionGrades !== undefined ||
        attempt.finalScoreBasisPoints !== null) {
      fail('EXAM_BACKUP_ATTEMPT_STATUS_CONTENT_MISMATCH');
    }
  } else if (attempt.status === 'passed' || attempt.status === 'failed' || attempt.status === 'pending_review') {
    if (!validIsoTimestamp(attempt.submittedAtIso) || !Array.isArray(attempt.questionGrades)) {
      fail('EXAM_BACKUP_ATTEMPT_RESULT_MISSING');
    }
    if (
      (attempt.status === 'pending_review' && finalScore !== null) ||
      ((attempt.status === 'passed' || attempt.status === 'failed') &&
        (!Number.isSafeInteger(finalScore) || finalScore === null))
    ) {
      fail('EXAM_BACKUP_ATTEMPT_RESULT_INVALID');
    }
    const automaticGrade = evaluateExamAnswers(
      questions as never,
      parsedAnswers as never,
      Number(version.passingScoreBasisPoints)
    );
    if (
      automaticGrade.totalPossiblePointsMilli !== totalPossiblePointsMilli ||
      automaticGrade.automaticallyEarnedPointsMilli !== attempt.automaticallyEarnedPointsMilli ||
      automaticGrade.preliminaryScoreBasisPoints !== attempt.preliminaryScoreBasisPoints
    ) {
      fail('EXAM_BACKUP_ATTEMPT_RESULT_INVALID');
    }
    const questionById = new Map(questions.map(question => [String(question.id), question]));
    const automaticGrades = new Map(automaticGrade.questionGrades.map(grade => [grade.questionId, grade]));
    const seenGrades = new Set<string>();
    let gradedPoints = 0;
    let automaticPoints = 0;
    let manualPoints = 0;
    let pendingManualReviewCount = 0;
    if (attempt.questionGrades.length !== questions.length) fail('EXAM_BACKUP_ATTEMPT_RESULT_INVALID');
    for (const rawGrade of attempt.questionGrades) {
      if (!isRecord(rawGrade) || typeof rawGrade.questionId !== 'string' || seenGrades.has(rawGrade.questionId)) {
        fail('EXAM_BACKUP_ATTEMPT_RESULT_INVALID');
      }
      const question = questionById.get(rawGrade.questionId);
      const automatic = automaticGrades.get(rawGrade.questionId);
      const expectedManualReview = attempt.status === 'pending_review' &&
        question?.type === 'free_text' &&
        typeof parsedAnswers[rawGrade.questionId] === 'string' &&
        String(parsedAnswers[rawGrade.questionId]).trim().length > 0;
      if (
        !question || !automatic ||
        !Number.isSafeInteger(rawGrade.pointsEarnedMilli) ||
        Number(rawGrade.pointsEarnedMilli) < 0 ||
        Number(rawGrade.pointsEarnedMilli) > Number(question.pointsMilli) ||
        rawGrade.maxPointsMilli !== question.pointsMilli ||
        rawGrade.requiresManualReview !== expectedManualReview ||
        (rawGrade.correct !== undefined && typeof rawGrade.correct !== 'boolean') ||
        (question.type !== 'free_text' &&
          (rawGrade.pointsEarnedMilli !== automatic.pointsEarnedMilli ||
           rawGrade.correct !== automatic.correct))
      ) {
        fail('EXAM_BACKUP_ATTEMPT_RESULT_INVALID');
      }
      seenGrades.add(rawGrade.questionId);
      gradedPoints += Number(rawGrade.pointsEarnedMilli);
      if (question.type === 'free_text') manualPoints += Number(rawGrade.pointsEarnedMilli);
      else automaticPoints += Number(rawGrade.pointsEarnedMilli);
      if (rawGrade.requiresManualReview === true) pendingManualReviewCount += 1;
    }
    if (
      gradedPoints !== Number(attempt.automaticallyEarnedPointsMilli) + Number(attempt.manuallyEarnedPointsMilli) ||
      automaticPoints !== Number(attempt.automaticallyEarnedPointsMilli) ||
      manualPoints !== Number(attempt.manuallyEarnedPointsMilli) ||
      ((attempt.status === 'pending_review') !== (pendingManualReviewCount > 0)) ||
      (attempt.status === 'pending_review' && Number(attempt.manuallyEarnedPointsMilli) !== 0)
    ) {
      fail('EXAM_BACKUP_ATTEMPT_RESULT_INVALID');
    }
    const finalScoreExpected = scoreBasisPoints(gradedPoints, totalPossiblePointsMilli);
    if (
      attempt.status !== 'pending_review' &&
      (attempt.finalScoreBasisPoints !== finalScoreExpected ||
       (attempt.status === 'passed') !== meetsPassingScore(gradedPoints, totalPossiblePointsMilli, Number(version.passingScoreBasisPoints)))
    ) {
      fail('EXAM_BACKUP_ATTEMPT_RESULT_INVALID');
    }
    if (attempt.submissionReason !== 'submitted' && attempt.submissionReason !== 'time_expired') {
      fail('EXAM_BACKUP_ATTEMPT_RESULT_INVALID');
    }
  } else if (attempt.status === 'invalidated_by_admin') {
    if (
      typeof attempt.invalidatedByUid !== 'string' || !attempt.invalidatedByUid.trim() ||
      !validIsoTimestamp(attempt.invalidatedAtIso) ||
      typeof attempt.invalidationReason !== 'string' ||
      attempt.invalidationReason.trim().length < 1 ||
      attempt.invalidationReason.length > 1000
    ) {
      fail('EXAM_BACKUP_ATTEMPT_INVALIDATION_AUDIT_INVALID');
    }
  }
}

export function validateExamRepositorySnapshot(value: unknown): ExamRepositorySnapshot {
  if (!isRecord(value) || value.formatVersion !== 1 || !isRecord(value.collections)) {
    return fail('EXAM_BACKUP_FORMAT_INVALID');
  }

  const collectionKeys = Object.keys(value.collections).sort();
  const expectedKeys = [...EXAM_COLLECTIONS].sort();
  const legacyKeys = expectedKeys.filter(key => key !== 'exam_comments' && key !== 'exam_publication_requests');
  const isLegacySnapshot =
    collectionKeys.length === legacyKeys.length &&
    collectionKeys.every((key, index) => key === legacyKeys[index]);
  const isCurrentSnapshot =
    collectionKeys.length === expectedKeys.length &&
    collectionKeys.every((key, index) => key === expectedKeys[index]);
  if (!isLegacySnapshot && !isCurrentSnapshot) {
    return fail('EXAM_BACKUP_COLLECTIONS_INCOMPLETE');
  }

  const collections = {} as Record<ExamCollection, ExamDocument[]>;

  for (const collection of EXAM_COLLECTIONS) {
    const raw = value.collections[collection] ?? (
      isLegacySnapshot && (collection === 'exam_comments' || collection === 'exam_publication_requests')
        ? []
        : undefined
    );
    if (!Array.isArray(raw)) return fail('EXAM_BACKUP_COLLECTION_INVALID');
    const seen = new Set<string>();
    const documents: ExamDocument[] = [];
    for (const item of raw) {
      if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) {
        return fail('EXAM_BACKUP_DOCUMENT_INVALID');
      }
      if (seen.has(item.id)) return fail('EXAM_BACKUP_DUPLICATE_ID');
      seen.add(item.id);
      try {
        assertExamDocument(collection, item.id, item as ExamDocument);
      } catch {
        return fail('EXAM_BACKUP_DOCUMENT_INVALID');
      }
      documents.push(structuredClone(item) as ExamDocument);
    }
    collections[collection] = documents;
  }

  const masters = new Map(collections.exam_masters.map(document => [document.id, document]));
  const versions = new Map(collections.exam_versions.map(document => [document.id, document]));
  const versionsByExamId = new Map<string, ExamDocument[]>();

  for (const version of collections.exam_versions) {
    if (typeof version.examId !== 'string' || !masters.has(version.examId)) {
      return fail('EXAM_BACKUP_VERSION_MASTER_MISSING');
    }
    if (version.assessmentStage !== 'test' && version.assessmentStage !== 'final_exam') {
      return fail('EXAM_BACKUP_VERSION_ASSESSMENT_STAGE_INVALID');
    }
    if (!Number.isSafeInteger(version.minClearance) || Number(version.minClearance) < 0) {
      return fail('EXAM_BACKUP_VERSION_CONTENT_INVALID');
    }
    // Non-startable legacy versions are retained as historical records. Interactive-code
    // migrations intentionally have no structured questions; malformed legacy structured exams
    // may also remain preserved but cannot be started.
    if (version.startable !== false) {
      const versionValidation = validateExamForPublication({
        title: version.title,
        assessmentStage: version.assessmentStage,
        timeLimitMinutes: version.timeLimitMinutes,
        passingScoreBasisPoints: version.passingScoreBasisPoints,
        maxAttempts: version.maxAttempts,
        prerequisites: version.prerequisites ?? [],
        assignedCourseCodes: version.historicalAssignedCourseCodes,
        questions: version.questionsSnapshot
      });
      if (!versionValidation.ok) return fail('EXAM_BACKUP_VERSION_CONTENT_INVALID');
    } else if (!Array.isArray(version.questionsSnapshot)) {
      return fail('EXAM_BACKUP_VERSION_CONTENT_INVALID');
    }
    const history = versionsByExamId.get(version.examId) ?? [];
    history.push(version);
    versionsByExamId.set(version.examId, history);
  }

  for (const master of collections.exam_masters) {
    const latestVersionNumber = master.latestVersionNumber ?? 0;
    if (!Number.isSafeInteger(latestVersionNumber) || Number(latestVersionNumber) < 0) {
      return fail('EXAM_BACKUP_MASTER_VERSION_SEQUENCE_INVALID');
    }
    const history = versionsByExamId.get(master.id) ?? [];
    if (history.some(version =>
      !Number.isSafeInteger(version.versionNumber) || Number(version.versionNumber) > Number(latestVersionNumber)
    )) {
      return fail('EXAM_BACKUP_VERSION_SEQUENCE_INVALID');
    }
    // Versions are append-only and numbered from 1 without gaps. A backup that omits an
    // intermediate version would silently erase immutable history on restore.
    if (history.length !== Number(latestVersionNumber)) {
      return fail('EXAM_BACKUP_VERSION_HISTORY_INCOMPLETE');
    }
    const orderedHistory = [...history].sort(
      (left, right) => Number(left.versionNumber) - Number(right.versionNumber)
    );
    for (let index = 0; index < orderedHistory.length; index += 1) {
      const expectedVersionNumber = index + 1;
      const version = orderedHistory[index];
      if (
        !Number.isSafeInteger(version.versionNumber) ||
        Number(version.versionNumber) !== expectedVersionNumber ||
        version.id !== `${master.id}__v${expectedVersionNumber}`
      ) {
        return fail('EXAM_BACKUP_VERSION_SEQUENCE_INVALID');
      }
    }

    const currentVersionId = master.currentPublishedVersionId;
    if (currentVersionId !== undefined && currentVersionId !== null) {
      if (typeof currentVersionId !== 'string') return fail('EXAM_BACKUP_MASTER_VERSION_INVALID');
      const version = versions.get(currentVersionId);
      if (!version || version.examId !== master.id) return fail('EXAM_BACKUP_MASTER_VERSION_MISSING');
      if (version.versionNumber !== latestVersionNumber) {
        return fail('EXAM_BACKUP_MASTER_VERSION_SEQUENCE_MISMATCH');
      }
      if (
        master.assessmentStage !== version.assessmentStage ||
        master.examFormat !== version.examFormat ||
        master.isLegacyFormat !== version.isLegacyFormat ||
        master.startable !== version.startable
      ) {
        return fail('EXAM_BACKUP_MASTER_VERSION_METADATA_MISMATCH');
      }
    } else if (Number(latestVersionNumber) !== 0) {
      return fail('EXAM_BACKUP_MASTER_VERSION_POINTER_MISSING');
    }
    if (master.status === 'published' && (currentVersionId == null || Number(latestVersionNumber) < 1)) {
      return fail('EXAM_BACKUP_PUBLISHED_MASTER_VERSION_MISSING');
    }
  }

  for (const attempt of collections.exam_attempts) {
    if (
      typeof attempt.examId !== 'string' ||
      typeof attempt.examVersionId !== 'string' ||
      !masters.has(attempt.examId)
    ) {
      return fail('EXAM_BACKUP_ATTEMPT_REFERENCE_INVALID');
    }
    const version = versions.get(attempt.examVersionId);
    if (!version || version.examId !== attempt.examId) {
      return fail('EXAM_BACKUP_ATTEMPT_VERSION_MISSING');
    }
    if (!Number.isSafeInteger(attempt.versionNumber) || attempt.versionNumber !== version.versionNumber) {
      return fail('EXAM_BACKUP_ATTEMPT_VERSION_MISMATCH');
    }
    if (attempt.assessmentStage !== version.assessmentStage) {
      return fail('EXAM_BACKUP_ATTEMPT_STAGE_MISMATCH');
    }
    validateBackupAttempt(attempt, version);
  }

  for (const progress of collections.exam_progress) {
    if (typeof progress.examId !== 'string' || !masters.has(progress.examId)) {
      return fail('EXAM_BACKUP_PROGRESS_MASTER_MISSING');
    }
  }

  for (const comment of collections.exam_comments) {
    if (typeof comment.examId !== 'string' || !masters.has(comment.examId)) {
      return fail('EXAM_BACKUP_COMMENT_MASTER_MISSING');
    }
  }

  for (const request of collections.exam_publication_requests) {
    if (typeof request.examId !== 'string' || !masters.has(request.examId)) {
      return fail('EXAM_BACKUP_PUBLICATION_REQUEST_MASTER_MISSING');
    }
  }

  return { formatVersion: 1, collections };
}

/** Bindet unveränderliche Legacy-Verifikationen an exakt die mitgesicherten Legacy-Quelldatensätze. */
export function validateLegacyVerificationSources(
  snapshot: ExamRepositorySnapshot,
  legacyExams: unknown,
  legacyProgress: unknown
): void {
  if (!Array.isArray(legacyExams) || !Array.isArray(legacyProgress)) {
    fail('EXAM_BACKUP_LEGACY_DATA_MISSING');
  }

  const examIds = new Set<string>();
  for (const exam of legacyExams) {
    if (!isRecord(exam) || typeof exam.id !== 'string' || !exam.id.trim() || examIds.has(exam.id)) {
      fail('EXAM_BACKUP_LEGACY_EXAMS_INVALID');
    }
    examIds.add(exam.id);
  }
  const progressById = new Map<string, Record<string, unknown>>();
  for (const record of legacyProgress) {
    if (!isRecord(record) || typeof record.id !== 'string' || !record.id.trim() || progressById.has(record.id)) {
      fail('EXAM_BACKUP_LEGACY_PROGRESS_INVALID');
    }
    progressById.set(record.id, record);
  }

  for (const document of snapshot.collections.exam_legacy_verifications) {
    if (!validateLegacyVerification(document).ok) fail('EXAM_BACKUP_LEGACY_VERIFICATION_INVALID');
    const verification = document as LegacyVerificationDoc;
    if (verification.id !== legacyVerificationId(verification.legacyProgressId)) {
      fail('EXAM_BACKUP_LEGACY_VERIFICATION_ID_INVALID');
    }
    const source = progressById.get(verification.legacyProgressId);
    if (
      !source ||
      source.status !== 'passed' ||
      (source.targetType !== 'test' && source.targetType !== 'final_exam') ||
      source.userId !== verification.userId ||
      source.targetId !== verification.examId ||
      !examIds.has(verification.examId)
    ) {
      fail('EXAM_BACKUP_LEGACY_SOURCE_MISMATCH');
    }

    const score = Number(source.scorePercent);
    if (
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100 ||
      Math.round(score * 100) !== verification.verifiedScoreBasisPoints
    ) {
      fail('EXAM_BACKUP_LEGACY_SCORE_MISMATCH');
    }

    if (source.updatedIso !== verification.legacyUpdatedIso) {
      fail('EXAM_BACKUP_LEGACY_REVISION_MISMATCH');
    }

    const sourceCourse = source.courseCode === undefined ? undefined : normalizeCourseCode(source.courseCode);
    const verifiedCourse = verification.attemptCourseCode === undefined
      ? undefined
      : normalizeCourseCode(verification.attemptCourseCode);
    if (
      (source.courseCode !== undefined && !sourceCourse) ||
      (verification.attemptCourseCode !== undefined && !verifiedCourse) ||
      sourceCourse !== verifiedCourse
    ) {
      fail('EXAM_BACKUP_LEGACY_COURSE_MISMATCH');
    }
  }
}
