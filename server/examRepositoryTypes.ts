export const EXAM_COLLECTIONS = [
  'exam_masters',
  'exam_versions',
  'exam_attempts',
  'exam_progress',
  'exam_legacy_verifications',
  'exam_comments',
  'exam_publication_requests'
] as const;

export type ExamCollection = (typeof EXAM_COLLECTIONS)[number];

export interface ExamDocument {
  id: string;
  [key: string]: unknown;
}

export interface ExamWhere {
  field: string;
  value: string | number | boolean | null;
}

export interface ExamQuery {
  where?: readonly ExamWhere[];
  /** Standardmäßig maximal 1.000 Dokumente. */
  limit?: number;
}

export interface AttemptInvalidationAudit {
  adminUid: string;
  atIso: string;
  reason: string;
}

export interface ExamTransaction {
  get<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    id: string
  ): Promise<T | null>;
  list<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    query?: ExamQuery
  ): Promise<T[]>;
  create<T extends ExamDocument>(
    collection: ExamCollection,
    id: string,
    document: T
  ): Promise<void>;
  /** Ersetzt das vollständige vorhandene Dokument; partielle Patches sind nicht vorgesehen. */
  update<T extends ExamDocument>(
    collection: ExamCollection,
    id: string,
    document: T
  ): Promise<void>;
  invalidateAttempt(id: string, audit: AttemptInvalidationAudit): Promise<void>;
  delete(collection: ExamCollection, id: string): Promise<void>;
}

export interface ExamRepositorySnapshot {
  formatVersion: 1;
  collections: Record<ExamCollection, ExamDocument[]>;
}

export interface ExamStorageAdapter {
  exportSnapshot(): Promise<ExamRepositorySnapshot>;
  replaceSnapshot(snapshot: ExamRepositorySnapshot): Promise<void>;
  isMaintenanceMode(): Promise<boolean>;
  setMaintenanceMode(enabled: boolean, allowExisting?: boolean): Promise<void>;
  get<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    id: string
  ): Promise<T | null>;
  list<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    query?: ExamQuery
  ): Promise<T[]>;
  runTransaction<T>(operation: (transaction: ExamTransaction) => Promise<T>): Promise<T>;
}
