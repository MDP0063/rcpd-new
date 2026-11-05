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
  if (collection === 'exam_versions' || collection === 'exam_legacy_verifications') {
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
