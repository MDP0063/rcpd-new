import assert from 'node:assert/strict';
import test from 'node:test';
import { createExamWorkshopComment, listExamWorkshopComments } from './examWorkshopComments.ts';
import { ExamRepository } from './examRepository.ts';
import type { ExamStorageAdapter, ExamRepositorySnapshot, ExamCollection, ExamDocument, ExamQuery, ExamTransaction } from './examRepositoryTypes.ts';

class MemoryAdapter implements ExamStorageAdapter {
  collections: Record<ExamCollection, ExamDocument[]> = {
    exam_masters: [], exam_versions: [], exam_attempts: [], exam_progress: [],
    exam_legacy_verifications: [], exam_comments: [], exam_publication_requests: []
  };
  async exportSnapshot(): Promise<ExamRepositorySnapshot> {
    return { formatVersion: 1, collections: Object.fromEntries(
      Object.entries(this.collections).map(([key, value]) => [key, structuredClone(value)])
    ) as Record<ExamCollection, ExamDocument[]> };
  }
  async replaceSnapshot(snapshot: ExamRepositorySnapshot): Promise<void> {
    for (const key of Object.keys(this.collections) as ExamCollection[]) this.collections[key] = structuredClone(snapshot.collections[key]);
  }
  async isMaintenanceMode() { return false; }
  async setMaintenanceMode() {}
  async get<T extends ExamDocument = ExamDocument>(collection: ExamCollection, id: string): Promise<T | null> {
    return (this.collections[collection].find(doc => doc.id === id) as T | undefined) ?? null;
  }
  async list<T extends ExamDocument = ExamDocument>(collection: ExamCollection, query: ExamQuery = {}): Promise<T[]> {
    return this.collections[collection].filter(doc => (query.where ?? []).every(filter => doc[filter.field] === filter.value)).slice(0, query.limit ?? 1000) as T[];
  }
  async runTransaction<T>(operation: (transaction: ExamTransaction) => Promise<T>): Promise<T> {
    const tx: ExamTransaction = {
      get: async (collection, id) => this.get(collection, id),
      list: async (collection, query) => this.list(collection, query),
      create: async (collection, id, doc) => { this.collections[collection].push(structuredClone(doc)); },
      update: async (collection, id, doc) => { this.collections[collection] = this.collections[collection].map(old => old.id === id ? structuredClone(doc) : old); },
      invalidateAttempt: async () => {},
      delete: async (collection, id) => { this.collections[collection] = this.collections[collection].filter(doc => doc.id !== id); }
    };
    return operation(tx);
  }
}

test('comments are stored against their exam and returned in chronological order', async () => {
  const repository = new ExamRepository(new MemoryAdapter());
  await repository.create('exam_masters', 'exam_1', { id: 'exam_1', assessmentStage: 'test' });
  await createExamWorkshopComment(repository, {
    examId: 'exam_1', authorUid: 'user_1', authorName: 'Officer One', body: 'Second'
  }, '2026-11-05T12:02:00.000Z');
  await createExamWorkshopComment(repository, {
    examId: 'exam_1', authorUid: 'user_2', authorName: 'Officer Two', body: 'First'
  }, '2026-11-05T12:01:00.000Z');
  const comments = await listExamWorkshopComments(repository, 'exam_1');
  assert.deepEqual(comments.map(comment => comment.body), ['First', 'Second']);
});

test('comment input is bounded and blank comments are rejected', async () => {
  const repository = new ExamRepository(new MemoryAdapter());
  await assert.rejects(
    () => createExamWorkshopComment(repository, {
      examId: 'exam_1', authorUid: 'user_1', authorName: 'Officer One', body: '   '
    }),
    /EXAM_COMMENT_INPUT_INVALID/
  );
});
