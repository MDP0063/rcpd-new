import { assertExamDocument } from './examRepositoryRules.ts';
import { legacyVerificationId, validateLegacyVerification } from './examLegacy.ts';
import { EXAM_COLLECTIONS } from './examRepositoryTypes.ts';
import type { ExamCollection, ExamDocument, ExamRepositorySnapshot } from './examRepositoryTypes.ts';
import type { LegacyVerificationDoc } from './examTypes.ts';
import { normalizeCourseCode, validateExamForPublication } from './examValidate.ts';

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
