import type { DocumentSnapshot, Firestore, Query, Transaction } from 'firebase-admin/firestore';
import { EXAM_COLLECTIONS } from './examRepositoryTypes.ts';
import type {
  AttemptInvalidationAudit,
  ExamCollection,
  ExamDocument,
  ExamQuery,
  ExamRepositorySnapshot,
  ExamStorageAdapter,
  ExamTransaction
} from './examRepositoryTypes.ts';
import {
  assertAttemptInvalidationAudit,
  assertExamAttemptCreate,
  assertExamAttemptUpdate,
  assertExamCanDelete,
  assertExamCanUpdate,
  assertExamDocument,
  assertExamDocumentId,
  assertExamQuery
} from './examRepositoryRules.ts';

function storageId(id: string): string {
  return encodeURIComponent(id);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function buildQuery(database: Firestore, collection: ExamCollection, query: ExamQuery = {}): Query {
  assertExamQuery(collection, query);
  let result: Query = database.collection(collection);
  for (const filter of query.where ?? []) {
    result = result.where(filter.field, '==', filter.value);
  }
  return result.limit(query.limit ?? 1000);
}

function documentFromSnapshot<T extends ExamDocument>(
  collection: ExamCollection,
  snapshot: DocumentSnapshot,
  expectedId?: string
): T | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (
    !data ||
    typeof data.id !== 'string' ||
    storageId(data.id) !== snapshot.id ||
    (expectedId !== undefined && data.id !== expectedId)
  ) {
    throw new Error('EXAM_FIRESTORE_DOCUMENT_INVALID');
  }
  assertExamDocument(collection, data.id, data as ExamDocument);
  return clone(data) as T;
}

class FirestoreExamTransaction implements ExamTransaction {
  private hasWrites = false;
  private readonly database: Firestore;
  private readonly transaction: Transaction;

  private assertCanRead(): void {
    if (this.hasWrites) throw new Error('EXAM_TRANSACTION_READ_AFTER_WRITE');
  }

  constructor(database: Firestore, transaction: Transaction) {
    this.database = database;
    this.transaction = transaction;
  }

  async get<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    id: string
  ): Promise<T | null> {
    this.assertCanRead();
    assertExamDocumentId(id);
    const reference = this.database.collection(collection).doc(storageId(id));
    const snapshot = await this.transaction.get(reference);
    return documentFromSnapshot<T>(collection, snapshot, id);
  }

  async list<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    query: ExamQuery = {}
  ): Promise<T[]> {
    this.assertCanRead();
    const snapshot = await this.transaction.get(buildQuery(this.database, collection, query));
    return snapshot.docs.map(document => {
      const data = documentFromSnapshot<T>(collection, document);
      if (!data) throw new Error('EXAM_FIRESTORE_DOCUMENT_INVALID');
      return data;
    });
  }

  async create<T extends ExamDocument>(
    collection: ExamCollection,
    id: string,
    document: T
  ): Promise<void> {
    assertExamDocument(collection, id, document);
    assertExamAttemptCreate(collection, document);
    const reference = this.database.collection(collection).doc(storageId(id));
    this.transaction.create(reference, clone(document));
    this.hasWrites = true;
  }

  async update<T extends ExamDocument>(
    collection: ExamCollection,
    id: string,
    document: T
  ): Promise<void> {
    assertExamCanUpdate(collection);
    assertExamDocument(collection, id, document);
    const existing = await this.get(collection, id);
    if (!existing) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    if (collection === 'exam_attempts') assertExamAttemptUpdate(existing, document);
    const reference = this.database.collection(collection).doc(storageId(id));
    this.transaction.set(reference, clone(document));
    this.hasWrites = true;
  }

  async invalidateAttempt(id: string, audit: AttemptInvalidationAudit): Promise<void> {
    assertExamDocumentId(id);
    assertAttemptInvalidationAudit(audit);
    const existing = await this.get('exam_attempts', id);
    if (!existing) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    if (existing.status === 'invalidated_by_admin') throw new Error('EXAM_ATTEMPT_ALREADY_INVALIDATED');
    if (!['in_progress', 'pending_review', 'passed', 'failed'].includes(String(existing.status))) {
      throw new Error('EXAM_ATTEMPT_STATUS_INVALID');
    }
    const next = {
      ...existing,
      status: 'invalidated_by_admin',
      invalidatedByUid: audit.adminUid,
      invalidatedAtIso: audit.atIso,
      invalidationReason: audit.reason
    };
    const reference = this.database.collection('exam_attempts').doc(storageId(id));
    this.transaction.set(reference, clone(next));
    this.hasWrites = true;
  }

  async delete(collection: ExamCollection, id: string): Promise<void> {
    assertExamCanDelete(collection);
    assertExamDocumentId(id);
    const reference = this.database.collection(collection).doc(storageId(id));
    this.transaction.delete(reference);
    this.hasWrites = true;
  }
}

/** Direkte Reads und echte Firestore-Transaktionen für mutierende Fachoperationen. */
export class FirestoreExamStorageAdapter implements ExamStorageAdapter {
  private readonly database: Firestore;

  constructor(database: Firestore) {
    this.database = database;
  }

  async get<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    id: string
  ): Promise<T | null> {
    assertExamDocumentId(id);
    const snapshot = await this.database.collection(collection).doc(storageId(id)).get();
    return documentFromSnapshot<T>(collection, snapshot, id);
  }

  async list<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    query: ExamQuery = {}
  ): Promise<T[]> {
    const snapshot = await buildQuery(this.database, collection, query).get();
    return snapshot.docs.map(document => {
      const data = documentFromSnapshot<T>(collection, document);
      if (!data) throw new Error('EXAM_FIRESTORE_DOCUMENT_INVALID');
      return data;
    });
  }

  async exportSnapshot(): Promise<ExamRepositorySnapshot> {
    return this.database.runTransaction(async transaction => {
      const control = await transaction.get(this.database.doc('exam_system_control/state'));
      if (control.get('enabled') !== true) throw new Error('EXAM_MAINTENANCE_REQUIRED');
      const collections = {} as ExamRepositorySnapshot['collections'];
      for (const collection of EXAM_COLLECTIONS) {
        const snapshot = await transaction.get(this.database.collection(collection));
        collections[collection] = snapshot.docs.map(document => {
          const data = documentFromSnapshot(collection, document);
          if (!data) throw new Error('EXAM_FIRESTORE_DOCUMENT_INVALID');
          return data;
        });
      }
      return { formatVersion: 1, collections };
    });
  }

  async replaceSnapshot(snapshot: ExamRepositorySnapshot): Promise<void> {
    const control = await this.database.doc('exam_system_control/state').get();
    if (control.get('enabled') !== true) throw new Error('EXAM_MAINTENANCE_REQUIRED');

    const writer = this.database.bulkWriter();
    const writes: Promise<unknown>[] = [];
    for (const collection of EXAM_COLLECTIONS) {
      const existing = await this.database.collection(collection).get();
      const incomingIds = new Set(snapshot.collections[collection].map(document => storageId(document.id)));
      for (const document of existing.docs) {
        if (!incomingIds.has(document.id)) writes.push(writer.delete(document.ref));
      }
      for (const document of snapshot.collections[collection]) {
        writes.push(
          writer.set(
            this.database.collection(collection).doc(storageId(document.id)),
            clone(document)
          )
        );
      }
    }

    let closeError: unknown;
    try {
      await writer.close();
    } catch (error) {
      closeError = error;
    }
    const settled = await Promise.allSettled(writes);
    const failed = settled.find(result => result.status === 'rejected') as PromiseRejectedResult | undefined;
    if (closeError) throw closeError;
    if (failed) throw failed.reason;
  }

  async isMaintenanceMode(): Promise<boolean> {
    const snapshot = await this.database.doc('exam_system_control/state').get();
    return snapshot.get('enabled') === true;
  }

  async setMaintenanceMode(enabled: boolean, allowExisting = false): Promise<void> {
    const reference = this.database.doc('exam_system_control/state');
    await this.database.runTransaction(async transaction => {
      const current = await transaction.get(reference);
      if (enabled && current.exists && current.get('enabled') === true && !allowExisting) {
        throw new Error('EXAM_MAINTENANCE_ALREADY_ACTIVE');
      }
      if (enabled) {
        transaction.set(reference, {
          enabled: true,
          updatedAtIso: new Date().toISOString()
        });
      } else if (current.exists) {
        transaction.delete(reference);
      }
    });
  }

  runTransaction<T>(operation: (transaction: ExamTransaction) => Promise<T>): Promise<T> {
    return this.database.runTransaction(transaction =>
      operation(new FirestoreExamTransaction(this.database, transaction))
    );
  }
}
