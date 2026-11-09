import assert from 'node:assert/strict';
import { test } from 'node:test';
import { academyFirestoreCollectionName } from './academyFirestoreAdapter.ts';

test('Academy repository Firestore collections are isolated from legacy portal state collections', () => {
  assert.equal(academyFirestoreCollectionName('academy_material_categories'), 'academy_repo_material_categories');
  assert.equal(academyFirestoreCollectionName('academy_material_category_assignments'), 'academy_repo_material_category_assignments');
  assert.equal(academyFirestoreCollectionName('academy_material_document_types'), 'academy_repo_material_document_types');
  assert.equal(academyFirestoreCollectionName('academy_material_document_type_assignments'), 'academy_repo_material_document_type_assignments');
  assert.equal(academyFirestoreCollectionName('academy_materials'), 'academy_repo_materials');
  assert.equal(academyFirestoreCollectionName('academy_material_drafts'), 'academy_repo_material_drafts');
  assert.equal(academyFirestoreCollectionName('academy_material_versions'), 'academy_repo_material_versions');
  assert.equal(academyFirestoreCollectionName('academy_courses'), 'academy_repo_courses');
  assert.equal(academyFirestoreCollectionName('academy_course_versions'), 'academy_repo_course_versions');
  assert.equal(academyFirestoreCollectionName('academy_private_notes'), 'academy_repo_private_notes');
  assert.notEqual(academyFirestoreCollectionName('academy_courses'), 'academy_courses');
  assert.notEqual(academyFirestoreCollectionName('academy_private_notes'), 'academy_private_notes');
});


import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreAcademyStorageAdapter } from './academyFirestoreAdapter.ts';
import { AcademyRepository } from './academyRepository.ts';
import type {
  AcademyCourseMasterDoc,
  AcademyCourseDraftDoc,
  AcademyProgramMasterDoc,
  AcademyProgramDraftDoc
} from '../src/types/academy.ts';

type FakeFilter = { field: string; value: unknown };
type FakeWrite = { kind: 'create' | 'set' | 'delete'; collection: string; id: string; data?: unknown };

class FakeDocumentReference {
  readonly database: FakeFirestore;
  readonly collectionName: string;
  readonly id: string;
  constructor(database: FakeFirestore, collectionName: string, id: string) {
    this.database = database;
    this.collectionName = collectionName;
    this.id = id;
  }
  async get() {
    const data = this.database.read(this.collectionName, this.id);
    return { id: this.id, exists: data !== null, data: () => data ?? undefined };
  }
}

class FakeQuery {
  readonly database: FakeFirestore;
  readonly collectionName: string;
  readonly filters: FakeFilter[];
  readonly maxResults: number;
  constructor(database: FakeFirestore, collectionName: string, filters: FakeFilter[] = [], maxResults = 1000) {
    this.database = database;
    this.collectionName = collectionName;
    this.filters = filters;
    this.maxResults = maxResults;
  }
  where(field: string, _operator: string, value: unknown) {
    return new FakeQuery(this.database, this.collectionName, [...this.filters, { field, value }], this.maxResults);
  }
  orderBy() { return this; }
  offset() { return this; }
  limit(maxResults: number) {
    return new FakeQuery(this.database, this.collectionName, this.filters, maxResults);
  }
}

class FakeCollectionReference extends FakeQuery {
  doc(id: string) { return new FakeDocumentReference(this.database, this.collectionName, id); }
}

class FakeTransaction {
  private hasWrites = false;
  readonly writes: FakeWrite[] = [];
  private readonly database: FakeFirestore;
  constructor(database: FakeFirestore) {
    this.database = database;
  }
  async get(target: FakeDocumentReference | FakeQuery) {
    if (this.hasWrites) throw new Error('FAKE_FIRESTORE_READ_AFTER_WRITE');
    if (target instanceof FakeDocumentReference) {
      const data = this.database.read(target.collectionName, target.id);
      return { id: target.id, exists: data !== null, data: () => data ?? undefined };
    }
    const docs = this.database.list(target.collectionName)
      .filter(document => target.filters.every(filter => (document.data as Record<string, unknown>)[filter.field] === filter.value))
      .slice(0, target.maxResults)
      .map(document => ({
        id: document.id,
        exists: true,
        data: () => document.data
      }));
    return { docs };
  }
  create(reference: FakeDocumentReference, data: unknown) {
    this.hasWrites = true;
    this.writes.push({ kind: 'create', collection: reference.collectionName, id: reference.id, data });
  }
  set(reference: FakeDocumentReference, data: unknown) {
    this.hasWrites = true;
    this.writes.push({ kind: 'set', collection: reference.collectionName, id: reference.id, data });
  }
  delete(reference: FakeDocumentReference) {
    this.hasWrites = true;
    this.writes.push({ kind: 'delete', collection: reference.collectionName, id: reference.id });
  }
}

class FakeFirestore {
  private readonly documents = new Map<string, Map<string, unknown>>();
  collection(name: string) { return new FakeCollectionReference(this, name); }
  seed(collection: string, id: string, data: unknown) {
    let documents = this.documents.get(collection);
    if (!documents) { documents = new Map(); this.documents.set(collection, documents); }
    documents.set(id, data);
  }
  read(collection: string, id: string): unknown | null {
    return this.documents.get(collection)?.get(id) ?? null;
  }
  list(collection: string) {
    return [...(this.documents.get(collection)?.entries() ?? [])].map(([id, data]) => ({ id, data }));
  }
  async runTransaction<T>(operation: (transaction: FakeTransaction) => Promise<T>): Promise<T> {
    const transaction = new FakeTransaction(this);
    const result = await operation(transaction);
    for (const write of transaction.writes) {
      let collection = this.documents.get(write.collection);
      if (!collection) {
        collection = new Map();
        this.documents.set(write.collection, collection);
      }
      if (write.kind === 'delete') collection.delete(write.id);
      else if (write.kind === 'create') {
        if (collection.has(write.id)) throw new Error('FAKE_FIRESTORE_DOCUMENT_ALREADY_EXISTS');
        collection.set(write.id, write.data);
      } else collection.set(write.id, write.data);
    }
    return result;
  }
}

const transactionTestIso = '2026-11-09T07:00:00.000Z';
const firestoreCourseMaster: AcademyCourseMasterDoc = {
  id: 'firestore-course-1',
  code: 'FIRESTORE-COURSE-01',
  ownerUid: 'owner-1',
  publicationStatus: 'draft',
  availability: 'available',
  latestVersionNumber: 0,
  workingRevision: 1,
  createdIso: transactionTestIso,
  updatedIso: transactionTestIso
};
const firestoreCourseDraft: AcademyCourseDraftDoc = {
  id: firestoreCourseMaster.id,
  courseId: firestoreCourseMaster.id,
  title: 'Firestore Testkurs',
  summary: '',
  learningObjectives: [{ id: 'goal-1', description: 'Testziel' }],
  chapters: [{ id: 'chapter-1', title: 'Einführung', materialReferences: [], required: true, order: 0 }],
  completionRequirements: [],
  workingRevision: 1,
  updatedIso: transactionTestIso,
  updatedByUid: 'owner-1'
};
const firestoreProgramMaster: AcademyProgramMasterDoc = {
  id: 'firestore-program-1',
  code: 'FIRESTORE-PROGRAM-01',
  ownerUid: 'owner-1',
  publicationStatus: 'draft',
  availability: 'available',
  latestVersionNumber: 0,
  workingRevision: 1,
  createdIso: transactionTestIso,
  updatedIso: transactionTestIso
};
const firestoreProgramDraft: AcademyProgramDraftDoc = {
  id: firestoreProgramMaster.id,
  programId: firestoreProgramMaster.id,
  title: 'Firestore Testlehrgang',
  summary: '',
  learningObjectives: [{ id: 'goal-1', description: 'Testziel' }],
  courseReferences: [{ courseId: 'course-1', requirement: 'required', order: 0 }],
  workingRevision: 1,
  updatedIso: transactionTestIso,
  updatedByUid: 'owner-1'
};

test('Firestore course creation completes all reads before creating master and draft', async () => {
  const database = new FakeFirestore();
  const repository = new AcademyRepository(
    new FirestoreAcademyStorageAdapter(database as unknown as Firestore)
  );

  await repository.createCourseWithDraft(firestoreCourseMaster, firestoreCourseDraft);

  assert.deepEqual(await repository.get('academy_courses', firestoreCourseMaster.id), firestoreCourseMaster);
  assert.deepEqual(await repository.getCourseDraft(firestoreCourseMaster.id), firestoreCourseDraft);
});

test('Firestore program creation completes all reads before creating master and draft', async () => {
  const database = new FakeFirestore();
  const repository = new AcademyRepository(
    new FirestoreAcademyStorageAdapter(database as unknown as Firestore)
  );

  await repository.createProgramWithDraft(firestoreProgramMaster, firestoreProgramDraft);

  assert.deepEqual(await repository.get('academy_programs', firestoreProgramMaster.id), firestoreProgramMaster);
  assert.deepEqual(await repository.getProgramDraft(firestoreProgramMaster.id), firestoreProgramDraft);
});

test('Firestore course creation rejects an existing draft before writing the master', async () => {
  const database = new FakeFirestore();
  database.seed('academy_repo_course_drafts', firestoreCourseMaster.id, firestoreCourseDraft);
  const repository = new AcademyRepository(
    new FirestoreAcademyStorageAdapter(database as unknown as Firestore)
  );

  await assert.rejects(
    repository.createCourseWithDraft(firestoreCourseMaster, firestoreCourseDraft),
    /ACADEMY_DOCUMENT_ALREADY_EXISTS/
  );
  assert.equal(await repository.get('academy_courses', firestoreCourseMaster.id), null);
});
