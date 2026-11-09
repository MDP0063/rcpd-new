import type { Firestore, Transaction, DocumentSnapshot, Query } from 'firebase-admin/firestore';
import { ACADEMY_COLLECTIONS, ACADEMY_BACKUP_COLLECTIONS, type AcademyCollection, type AcademyDocument, type AcademyQuery, type AcademyStorageAdapter, type AcademyTransaction } from './academyRepositoryTypes.ts';
import type { AcademyRepositoryBackupSnapshot } from '../src/types/academy.ts';
import { assertAcademyCanDelete, assertAcademyCanUpdate, assertAcademyDocument, assertAcademyDocumentId, assertAcademyQuery } from './academyRepositoryRules.ts';

// Keep the repository's collections separate from legacy PortalDatabaseState collections.
export function academyFirestoreCollectionName(collection: AcademyCollection): string {
  return `academy_repo_${collection.slice('academy_'.length)}`;
}
const storageId = (id: string) => encodeURIComponent(id);
const clone = <T,>(value: T): T => structuredClone(value);
function fromSnapshot<T extends AcademyDocument>(collection: AcademyCollection, snapshot: DocumentSnapshot, expectedId?: string): T | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!data || typeof data.id !== 'string' || storageId(data.id) !== snapshot.id || (expectedId !== undefined && expectedId !== data.id)) throw new Error('ACADEMY_FIRESTORE_DOCUMENT_INVALID');
  assertAcademyDocument(collection, data.id, data as AcademyDocument); return clone(data) as T;
}
function buildQuery(database: Firestore, collection: AcademyCollection, query: AcademyQuery = {}): Query {
  assertAcademyQuery(collection, query); let result: Query = database.collection(academyFirestoreCollectionName(collection));
  for (const filter of query.where ?? []) result = result.where(filter.field, '==', filter.value);
  if (query.orderBy) result = result.orderBy(query.orderBy, query.orderDirection ?? 'asc');
  if (query.offset !== undefined && query.offset > 0) result = result.offset(query.offset);
  return result.limit(query.limit ?? 1000);
}
class FirestoreTransaction implements AcademyTransaction {
  private hasWrites = false;
  private cache = new Map<string, AcademyDocument | null>();
  private readonly database: Firestore;
  private readonly transaction: Transaction;
  constructor(database: Firestore, transaction: Transaction) { this.database = database; this.transaction = transaction; }
  private key(collection: AcademyCollection, id: string) { return JSON.stringify([collection, id]); }
  private canRead() { if (this.hasWrites) throw new Error('ACADEMY_TRANSACTION_READ_AFTER_WRITE'); }
  async get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null> {
    this.canRead(); assertAcademyDocumentId(id); const key = this.key(collection, id);
    if (this.cache.has(key)) return clone(this.cache.get(key) as T | null);
    const snap = await this.transaction.get(this.database.collection(academyFirestoreCollectionName(collection)).doc(storageId(id)));
    const doc = fromSnapshot<T>(collection, snap, id); this.cache.set(key, doc ? clone(doc) : null); return doc;
  }
  async list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query: AcademyQuery = {}): Promise<T[]> {
    this.canRead(); const snap = await this.transaction.get(buildQuery(this.database, collection, query));
    return snap.docs.map(item => { const doc = fromSnapshot<T>(collection, item); if (!doc) throw new Error('ACADEMY_FIRESTORE_DOCUMENT_INVALID'); this.cache.set(this.key(collection, doc.id), clone(doc)); return doc; });
  }
  async create<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    assertAcademyDocument(collection, id, document); const key = this.key(collection, id);
    if (!this.cache.has(key)) { const existing = await this.get(collection, id); if (existing) throw new Error('ACADEMY_DOCUMENT_ALREADY_EXISTS'); }
    else if (this.cache.get(key)) throw new Error('ACADEMY_DOCUMENT_ALREADY_EXISTS');
    this.transaction.create(this.database.collection(academyFirestoreCollectionName(collection)).doc(storageId(id)), clone(document)); this.cache.set(key, clone(document)); this.hasWrites = true;
  }
  async update<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    assertAcademyCanUpdate(collection); assertAcademyDocument(collection, id, document); const key = this.key(collection, id);
    let existing = this.cache.get(key);
    if (!this.cache.has(key)) { if (this.hasWrites) throw new Error('ACADEMY_TRANSACTION_READ_AFTER_WRITE'); existing = await this.get(collection, id); }
    if (!existing) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
    this.transaction.set(this.database.collection(academyFirestoreCollectionName(collection)).doc(storageId(id)), clone(document)); this.cache.set(key, clone(document)); this.hasWrites = true;
  }
  async delete(collection: AcademyCollection, id: string): Promise<void> {
    assertAcademyCanDelete(collection); assertAcademyDocumentId(id); const key = this.key(collection, id);
    let existing = this.cache.get(key);
    if (!this.cache.has(key)) { if (this.hasWrites) throw new Error('ACADEMY_TRANSACTION_READ_AFTER_WRITE'); existing = await this.get(collection, id); }
    if (!existing) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
    this.transaction.delete(this.database.collection(academyFirestoreCollectionName(collection)).doc(storageId(id))); this.cache.set(key, null); this.hasWrites = true;
  }
}
export class FirestoreAcademyStorageAdapter implements AcademyStorageAdapter {
  private readonly database: Firestore;
  private maintenanceMode = false;
  constructor(database: Firestore) { this.database = database; }
  async get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null> {
    assertAcademyDocumentId(id); return fromSnapshot<T>(collection, await this.database.collection(academyFirestoreCollectionName(collection)).doc(storageId(id)).get(), id);
  }
  async list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query: AcademyQuery = {}): Promise<T[]> {
    const snap = await buildQuery(this.database, collection, query).get();
    return snap.docs.map(item => { const doc = fromSnapshot<T>(collection, item); if (!doc) throw new Error('ACADEMY_FIRESTORE_DOCUMENT_INVALID'); return doc; });
  }
  async setMaintenanceMode(enabled: boolean): Promise<void> {
    this.maintenanceMode = enabled;
  }
  async exportSnapshot(): Promise<AcademyRepositoryBackupSnapshot> {
    return this.database.runTransaction(async transaction => {
      const control = await transaction.get(this.database.doc('exam_system_control/state'));
      if (!this.maintenanceMode && control.get('enabled') !== true) {
        throw new Error('ACADEMY_MAINTENANCE_REQUIRED');
      }
      const collections = {} as AcademyRepositoryBackupSnapshot['collections'];
      for (const collection of ACADEMY_BACKUP_COLLECTIONS) {
        const snapshot = await transaction.get(this.database.collection(academyFirestoreCollectionName(collection)));
        collections[collection] = snapshot.docs.map(document => {
          const data = fromSnapshot(collection, document);
          if (!data) throw new Error('ACADEMY_FIRESTORE_DOCUMENT_INVALID');
          return data;
        }) as typeof collections[typeof collection];
      }
      return { formatVersion: 1, collections };
    });
  }
  async replaceSnapshot(snapshot: AcademyRepositoryBackupSnapshot): Promise<void> {
    const control = await this.database.doc('exam_system_control/state').get();
    if (!this.maintenanceMode && control.get('enabled') !== true) {
      throw new Error('ACADEMY_MAINTENANCE_REQUIRED');
    }

    const writer = this.database.bulkWriter();
    const writes: Promise<unknown>[] = [];
    for (const collection of ACADEMY_BACKUP_COLLECTIONS) {
      const existing = await this.database.collection(academyFirestoreCollectionName(collection)).get();
      const incomingIds = new Set(snapshot.collections[collection].map(document => storageId(document.id)));
      for (const document of existing.docs) {
        if (!incomingIds.has(document.id)) writes.push(writer.delete(document.ref));
      }
      for (const document of snapshot.collections[collection]) {
        writes.push(writer.set(
          this.database.collection(academyFirestoreCollectionName(collection)).doc(storageId(document.id)),
          clone(document)
        ));
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
  runTransaction<T>(operation: (transaction: AcademyTransaction) => Promise<T>): Promise<T> {
    return this.database.runTransaction(async transaction => {
      const control = await transaction.get(this.database.doc('exam_system_control/state'));
      if (this.maintenanceMode || control.get('enabled') === true) {
        throw new Error('ACADEMY_MAINTENANCE_ACTIVE');
      }
      return operation(new FirestoreTransaction(this.database, transaction));
    });
  }
}
