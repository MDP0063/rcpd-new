import type { Firestore, Transaction, DocumentSnapshot, Query } from 'firebase-admin/firestore';
import { ACADEMY_COLLECTIONS, type AcademyCollection, type AcademyDocument, type AcademyQuery, type AcademyStorageAdapter, type AcademyTransaction } from './academyRepositoryTypes.ts';
import { assertAcademyCanDelete, assertAcademyCanUpdate, assertAcademyDocument, assertAcademyDocumentId, assertAcademyQuery } from './academyRepositoryRules.ts';

const storageId = (id: string) => encodeURIComponent(id);
const clone = <T,>(value: T): T => structuredClone(value);
function fromSnapshot<T extends AcademyDocument>(collection: AcademyCollection, snapshot: DocumentSnapshot, expectedId?: string): T | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  if (!data || typeof data.id !== 'string' || storageId(data.id) !== snapshot.id || (expectedId !== undefined && expectedId !== data.id)) throw new Error('ACADEMY_FIRESTORE_DOCUMENT_INVALID');
  assertAcademyDocument(collection, data.id, data as AcademyDocument); return clone(data) as T;
}
function buildQuery(database: Firestore, collection: AcademyCollection, query: AcademyQuery = {}): Query {
  assertAcademyQuery(collection, query); let result: Query = database.collection(collection);
  for (const filter of query.where ?? []) result = result.where(filter.field, '==', filter.value);
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
    const snap = await this.transaction.get(this.database.collection(collection).doc(storageId(id)));
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
    this.transaction.create(this.database.collection(collection).doc(storageId(id)), clone(document)); this.cache.set(key, clone(document)); this.hasWrites = true;
  }
  async update<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    assertAcademyCanUpdate(collection); assertAcademyDocument(collection, id, document); const key = this.key(collection, id);
    let existing = this.cache.get(key);
    if (!this.cache.has(key)) { if (this.hasWrites) throw new Error('ACADEMY_TRANSACTION_READ_AFTER_WRITE'); existing = await this.get(collection, id); }
    if (!existing) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
    this.transaction.set(this.database.collection(collection).doc(storageId(id)), clone(document)); this.cache.set(key, clone(document)); this.hasWrites = true;
  }
  async delete(collection: AcademyCollection, id: string): Promise<void> {
    assertAcademyCanDelete(collection); assertAcademyDocumentId(id); const key = this.key(collection, id);
    let existing = this.cache.get(key);
    if (!this.cache.has(key)) { if (this.hasWrites) throw new Error('ACADEMY_TRANSACTION_READ_AFTER_WRITE'); existing = await this.get(collection, id); }
    if (!existing) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
    this.transaction.delete(this.database.collection(collection).doc(storageId(id))); this.cache.set(key, null); this.hasWrites = true;
  }
}
export class FirestoreAcademyStorageAdapter implements AcademyStorageAdapter {
  private readonly database: Firestore;
  constructor(database: Firestore) { this.database = database; }
  async get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null> {
    assertAcademyDocumentId(id); return fromSnapshot<T>(collection, await this.database.collection(collection).doc(storageId(id)).get(), id);
  }
  async list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query: AcademyQuery = {}): Promise<T[]> {
    const snap = await buildQuery(this.database, collection, query).get();
    return snap.docs.map(item => { const doc = fromSnapshot<T>(collection, item); if (!doc) throw new Error('ACADEMY_FIRESTORE_DOCUMENT_INVALID'); return doc; });
  }
  runTransaction<T>(operation: (transaction: AcademyTransaction) => Promise<T>): Promise<T> {
    return this.database.runTransaction(transaction => operation(new FirestoreTransaction(this.database, transaction)));
  }
}
