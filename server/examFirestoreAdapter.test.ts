import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreExamStorageAdapter } from './examFirestoreAdapter.ts';

class FakeReference {
  constructor(private readonly database: FakeFirestore, readonly collectionName: string, readonly id: string) {}
  async get() {
    const data = this.database.read(this.collectionName, this.id);
    return { id: this.id, exists: data !== null, data: () => data ?? undefined };
  }
}
class FakeCollection {
  constructor(private readonly database: FakeFirestore, readonly collectionName: string) {}
  doc(id: string) { return new FakeReference(this.database, this.collectionName, id); }
  async get() {
    return { docs: this.database.list(this.collectionName).map(({ id, data }) => ({
      id, exists: true, data: () => data, ref: this.doc(id)
    })) };
  }
}
class FakeBulkWriter {
  private readonly writes: Array<{ kind: 'set'; collection: string; id: string; data: unknown }> = [];
  constructor(private readonly database: FakeFirestore) {}
  set(reference: FakeReference, data: unknown) {
    this.writes.push({ kind: 'set', collection: reference.collectionName, id: reference.id, data });
    return Promise.resolve();
  }
  async close() {
    for (const write of this.writes) this.database.seed(write.collection, write.id, write.data);
  }
}
class FakeFirestore {
  private readonly documents = new Map<string, Map<string, unknown>>();
  collection(name: string) { return new FakeCollection(this, name); }
  doc(path: string) {
    const [collection, id] = path.split('/');
    return { get: async () => {
      const data = this.read(collection, id);
      return { exists: data !== null, get: (field: string) => data && typeof data === 'object' ? (data as Record<string, unknown>)[field] : undefined };
    } };
  }
  bulkWriter() { return new FakeBulkWriter(this); }
  seed(collection: string, id: string, data: unknown) {
    let items = this.documents.get(collection);
    if (!items) { items = new Map(); this.documents.set(collection, items); }
    items.set(id, data);
  }
  read(collection: string, id: string) { return this.documents.get(collection)?.get(id) ?? null; }
  list(collection: string) {
    return [...(this.documents.get(collection)?.entries() ?? [])].map(([id, data]) => ({ id, data }));
  }
}

test('Firestore Exam adapter anonymizes identity fields without changing attempt results', async () => {
  const database = new FakeFirestore();
  database.seed('exam_attempts', 'attempt-1', {
    id: 'attempt-1', userId: 'deleted-user', userName: 'Former Officer',
    examId: 'exam-1', status: 'passed', finalScoreBasisPoints: 9000
  });
  database.seed('exam_legacy_verifications', 'legacy_verification__legacy-1', {
    id: 'legacy_verification__legacy-1', userId: 'deleted-user', verifiedByUid: 'deleted-user',
    legacyProgressId: 'legacy-1', examId: 'exam-1', verifiedStatus: 'passed',
    verifiedScoreBasisPoints: 9000, verifiedAtIso: '2026-11-09T12:00:00.000Z',
    reason: 'Historischen Nachweis geprüft'
  });
  const adapter = new FirestoreExamStorageAdapter(database as unknown as Firestore);
  await adapter.anonymizeUser('deleted-user', 'deleted-marker', ['Former Officer']);
  const attempt = database.read('exam_attempts', 'attempt-1') as Record<string, unknown>;
  assert.equal(attempt.userId, 'deleted-marker');
  assert.equal(attempt.userName, 'Gelöschtes Konto');
  assert.equal(attempt.status, 'passed');
  assert.equal(attempt.finalScoreBasisPoints, 9000);
  const verification = database.read('exam_legacy_verifications', 'legacy_verification__legacy-1') as Record<string, unknown>;
  assert.equal(verification.userId, 'deleted-marker');
  assert.equal(verification.verifiedByUid, 'deleted-marker');
  assert.equal(verification.verifiedScoreBasisPoints, 9000);
});
