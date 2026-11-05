import { join } from 'node:path';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreExamStorageAdapter } from './examFirestoreAdapter.ts';
import { JsonExamStorageAdapter } from './examJsonAdapter.ts';
import {
  assertAttemptInvalidationAudit,
  assertExamAttemptCreate,
  assertExamCanDelete,
  assertExamCanUpdate,
  assertExamCollection,
  assertExamDocument,
  assertExamDocumentId,
  assertExamQuery
} from './examRepositoryRules.ts';
import { legacyVerificationId } from './examLegacy.ts';
import { validateExamRepositorySnapshot } from './examBackup.ts';
import type { LegacyVerificationDoc } from './examTypes.ts';
import {
  type AttemptInvalidationAudit,
  type ExamCollection,
  type ExamDocument,
  type ExamQuery,
  type ExamRepositorySnapshot,
  type ExamStorageAdapter,
  type ExamTransaction
} from './examRepositoryTypes.ts';

export * from './examRepositoryTypes.ts';

export class ExamRepository implements ExamStorageAdapter {
  private readonly adapter: ExamStorageAdapter;

  constructor(adapter: ExamStorageAdapter) {
    this.adapter = adapter;
  }

  async exportSnapshot(): Promise<ExamRepositorySnapshot> {
    return validateExamRepositorySnapshot(await this.adapter.exportSnapshot());
  }

  async restoreSnapshot(snapshot: unknown): Promise<void> {
    const validated = validateExamRepositorySnapshot(snapshot);
    await this.adapter.replaceSnapshot(validated);
  }

  async isMaintenanceMode(): Promise<boolean> {
    return this.adapter.isMaintenanceMode();
  }

  async setMaintenanceMode(enabled: boolean, allowExisting = false): Promise<void> {
    return this.adapter.setMaintenanceMode(enabled, allowExisting);
  }

  async get<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    id: string
  ): Promise<T | null> {
    assertExamCollection(collection);
    assertExamDocumentId(id);
    return this.adapter.get<T>(collection, id);
  }

  async list<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    query: ExamQuery = {}
  ): Promise<T[]> {
    assertExamCollection(collection);
    assertExamQuery(collection, query);
    return this.adapter.list<T>(collection, query);
  }

  /** Firestore kann den Callback bei Konflikten erneut ausführen; darin keine externen Side Effects auslösen. */
  runTransaction<T>(operation: (transaction: ExamTransaction) => Promise<T>): Promise<T> {
    return this.adapter.runTransaction(operation);
  }

  async create<T extends ExamDocument>(
    collection: ExamCollection,
    id: string,
    document: T
  ): Promise<void> {
    assertExamDocument(collection, id, document);
    assertExamAttemptCreate(collection, document);
    return this.runTransaction(transaction => transaction.create(collection, id, document));
  }

  async update<T extends ExamDocument>(
    collection: ExamCollection,
    id: string,
    document: T
  ): Promise<void> {
    assertExamCanUpdate(collection);
    assertExamDocument(collection, id, document);
    return this.runTransaction(transaction => transaction.update(collection, id, document));
  }

  /**
   * Veröffentlicht einen unveränderlichen Snapshot und aktualisiert den Master-Zeiger atomar.
   * Der Aufrufer muss den Snapshot zuvor vollständig validiert haben und nextMaster vollständig liefern.
   */
  async publishVersion(
    examId: string,
    version: ExamDocument,
    nextMaster: ExamDocument
  ): Promise<void> {
    assertExamDocument('exam_versions', version.id, version);
    assertExamDocument('exam_masters', examId, nextMaster);
    return this.runTransaction(async transaction => {
      const current = await transaction.get('exam_masters', examId);
      if (!current) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
      if (current.status === 'archived') throw new Error('EXAM_MASTER_ARCHIVED');
      if (current.status !== 'draft' && current.status !== 'published') {
        throw new Error('EXAM_MASTER_STATUS_INVALID');
      }
      const latest = current.latestVersionNumber ?? 0;
      if (typeof latest !== 'number' || !Number.isSafeInteger(latest) || latest < 0) {
        throw new Error('EXAM_VERSION_SEQUENCE_INVALID');
      }
      const nextVersionNumber = latest + 1;
      if (!Number.isSafeInteger(nextVersionNumber)) throw new Error('EXAM_VERSION_SEQUENCE_INVALID');
      const expectedVersionId = `${examId}__v${nextVersionNumber}`;
      if (
        version.id !== expectedVersionId ||
        version.examId !== examId ||
        version.versionNumber !== nextVersionNumber ||
        nextMaster.currentPublishedVersionId !== expectedVersionId ||
        nextMaster.latestVersionNumber !== nextVersionNumber ||
        nextMaster.status !== 'published'
      ) {
        throw new Error('EXAM_VERSION_SEQUENCE_INVALID');
      }
      await transaction.update('exam_masters', examId, nextMaster);
      await transaction.create('exam_versions', version.id, version);
    });
  }

  /** Liest den unveränderlichen Nachweis für eine Legacy-Progress-ID. */
  async getLegacyVerification(legacyProgressId: string): Promise<LegacyVerificationDoc | null> {
    assertExamDocumentId(legacyProgressId);
    return this.get<LegacyVerificationDoc>(
      'exam_legacy_verifications',
      legacyVerificationId(legacyProgressId)
    );
  }

  /** Erstellt den einmaligen, append-only Verifikationsnachweis. */
  async createLegacyVerification(document: LegacyVerificationDoc): Promise<void> {
    return this.create('exam_legacy_verifications', document.id, document);
  }

  async invalidateAttempt(id: string, audit: AttemptInvalidationAudit): Promise<void> {
    assertExamDocumentId(id);
    assertAttemptInvalidationAudit(audit);
    return this.runTransaction(transaction => transaction.invalidateAttempt(id, audit));
  }

  async delete(collection: ExamCollection, id: string): Promise<void> {
    assertExamCollection(collection);
    assertExamDocumentId(id);
    assertExamCanDelete(collection);
    return this.runTransaction(transaction => transaction.delete(collection, id));
  }
}

export function createJsonExamRepository(dataDirectory: string): ExamRepository {
  return new ExamRepository(new JsonExamStorageAdapter(join(dataDirectory, 'exam-db-v1.json')));
}

export function createFirestoreExamRepository(database: Firestore): ExamRepository {
  return new ExamRepository(new FirestoreExamStorageAdapter(database));
}
