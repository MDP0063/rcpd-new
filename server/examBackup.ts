import { assertExamDocument } from './examRepositoryRules.ts';
import { legacyVerificationId, validateLegacyVerification } from './examLegacy.ts';
import { EXAM_COLLECTIONS } from './examRepositoryTypes.ts';
import type { ExamCollection, ExamDocument, ExamRepositorySnapshot } from './examRepositoryTypes.ts';
import { normalizeCourseCode } from './examValidate.ts';

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
  if (
    collectionKeys.length !== expectedKeys.length ||
    collectionKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return fail('EXAM_BACKUP_COLLECTIONS_INCOMPLETE');
  }

  const collections = {} as Record<ExamCollection, ExamDocument[]>;
  const ids = {} as Record<ExamCollection, Set<string>>;

  for (const collection of EXAM_COLLECTIONS) {
    const raw = value.collections[collection];
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
    ids[collection] = seen;
    collections[collection] = documents;
  }

  const masters = new Map(collections.exam_masters.map(document => [document.id, document]));
  const versions = new Map(collections.exam_versions.map(document => [document.id, document]));

  for (const version of collections.exam_versions) {
    if (typeof version.examId !== 'string' || !masters.has(version.examId)) {
      return fail('EXAM_BACKUP_VERSION_MASTER_MISSING');
    }
  }

  for (const master of collections.exam_masters) {
    const currentVersionId = master.currentPublishedVersionId;
    if (currentVersionId !== undefined && currentVersionId !== null) {
      if (typeof currentVersionId !== 'string') return fail('EXAM_BACKUP_MASTER_VERSION_INVALID');
      const version = versions.get(currentVersionId);
      if (!version || version.examId !== master.id) return fail('EXAM_BACKUP_MASTER_VERSION_MISSING');
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
  }

  for (const progress of collections.exam_progress) {
    if (typeof progress.examId !== 'string' || !masters.has(progress.examId)) {
      return fail('EXAM_BACKUP_PROGRESS_MASTER_MISSING');
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

  const examIds = new Set(
    legacyExams.filter(isRecord).map(exam => exam.id).filter((id): id is string => typeof id === 'string')
  );
  const progressById = new Map(
    legacyProgress.filter(isRecord).map(record => [record.id, record]).filter(
      (entry): entry is [string, Record<string, unknown>] => typeof entry[0] === 'string'
    )
  );

  for (const verification of snapshot.collections.exam_legacy_verifications) {
    if (!validateLegacyVerification(verification).ok) fail('EXAM_BACKUP_LEGACY_VERIFICATION_INVALID');
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
