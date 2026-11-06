import { join } from 'node:path';
import type { AcademyCourseMasterDoc, AcademyCourseVersionDoc, AcademyProgramMasterDoc, AcademyProgramVersionDoc, AcademyPrivateNoteDoc } from '../src/types/academy.ts';
import { validateCourseMaster, validateCourseVersion, validateProgramMaster, validateProgramVersion, validatePrivateNote } from './academyDomain.ts';
import type { AcademyCollection, AcademyDocument, AcademyQuery, AcademyStorageAdapter, AcademyTransaction } from './academyRepositoryTypes.ts';
import { assertAcademyDocument, assertAcademyDocumentId, assertAcademyQuery } from './academyRepositoryRules.ts';
import { JsonAcademyStorageAdapter } from './academyJsonAdapter.ts';
import { FirestoreAcademyStorageAdapter } from './academyFirestoreAdapter.ts';
import type { Firestore } from 'firebase-admin/firestore';

function assertValid(result: { ok: boolean; code?: string }): void {
  if (!result.ok) throw new Error(result.code || 'ACADEMY_DOCUMENT_INVALID');
}
export class AcademyRepository {
  constructor(private readonly adapter: AcademyStorageAdapter) {}
  get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null> {
    assertAcademyDocumentId(id); return this.adapter.get<T>(collection, id);
  }
  list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query: AcademyQuery = {}): Promise<T[]> {
    assertAcademyQuery(collection, query); return this.adapter.list<T>(collection, query);
  }
  runTransaction<T>(operation: (transaction: AcademyTransaction) => Promise<T>): Promise<T> {
    return this.adapter.runTransaction(operation);
  }
  async create<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    if (collection === 'academy_private_notes') throw new Error('ACADEMY_NOTE_OWNER_METHOD_REQUIRED');
    assertAcademyDocument(collection, id, document);
    return this.runTransaction(tx => tx.create(collection, id, document));
  }
  async update<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    if (collection.endsWith('_versions') || collection === 'academy_progress_evidence' || collection === 'academy_completion_corrections') throw new Error('ACADEMY_DOCUMENT_APPEND_ONLY');
    if (collection === 'academy_private_notes') throw new Error('ACADEMY_NOTE_OWNER_METHOD_REQUIRED');
    assertAcademyDocument(collection, id, document);
    return this.runTransaction(tx => tx.update(collection, id, document));
  }
  async delete(collection: AcademyCollection, id: string): Promise<void> {
    assertAcademyDocumentId(id);
    if (collection.endsWith('_versions') || collection === 'academy_progress_evidence' || collection === 'academy_completion_corrections') {
      throw new Error('ACADEMY_DOCUMENT_APPEND_ONLY');
    }
    return this.runTransaction(tx => tx.delete(collection, id));
  }
  async publishCourseVersion(courseId: string, version: AcademyCourseVersionDoc, nextMaster: AcademyCourseMasterDoc, expectedRevision: number): Promise<void> {
    assertValid(validateCourseVersion(courseId, version));
    assertValid(validateCourseMaster(nextMaster));
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyCourseMasterDoc>('academy_courses', courseId);
      if (!current) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      if (current.publicationStatus === 'archived') throw new Error('ACADEMY_MASTER_ARCHIVED');
      if (current.workingRevision !== expectedRevision || nextMaster.workingRevision !== expectedRevision) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      const nextNumber = current.latestVersionNumber + 1;
      const versionId = `${courseId}__v${nextNumber}`;
      if (version.id !== versionId || version.versionNumber !== nextNumber || nextMaster.latestVersionNumber !== nextNumber || nextMaster.currentPublishedVersionId !== versionId || nextMaster.publicationStatus !== 'published') throw new Error('ACADEMY_VERSION_SEQUENCE_INVALID');
      await tx.create('academy_course_versions', versionId, version);
      await tx.update('academy_courses', courseId, nextMaster);
    });
  }
  async publishProgramVersion(programId: string, version: AcademyProgramVersionDoc, nextMaster: AcademyProgramMasterDoc, expectedRevision: number): Promise<void> {
    assertValid(validateProgramVersion(programId, version));
    assertValid(validateProgramMaster(nextMaster));
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyProgramMasterDoc>('academy_programs', programId);
      if (!current) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      if (current.publicationStatus === 'archived') throw new Error('ACADEMY_MASTER_ARCHIVED');
      if (current.workingRevision !== expectedRevision || nextMaster.workingRevision !== expectedRevision) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      const nextNumber = current.latestVersionNumber + 1;
      const versionId = `${programId}__v${nextNumber}`;
      if (version.id !== versionId || version.versionNumber !== nextNumber || nextMaster.latestVersionNumber !== nextNumber || nextMaster.currentPublishedVersionId !== versionId || nextMaster.publicationStatus !== 'published') throw new Error('ACADEMY_VERSION_SEQUENCE_INVALID');
      await tx.create('academy_program_versions', versionId, version);
      await tx.update('academy_programs', programId, nextMaster);
    });
  }
  async listOwnPrivateNotes(ownerUid: string): Promise<AcademyPrivateNoteDoc[]> {
    if (!ownerUid.trim()) throw new Error('ACADEMY_NOTE_OWNER_REQUIRED');
    return this.list<AcademyPrivateNoteDoc>('academy_private_notes', { where: [{ field: 'ownerUid', value: ownerUid }], limit: 1000 });
  }
  async getOwnPrivateNote(ownerUid: string, noteId: string): Promise<AcademyPrivateNoteDoc | null> {
    const note = await this.get<AcademyPrivateNoteDoc>('academy_private_notes', noteId);
    return note?.ownerUid === ownerUid ? note : null;
  }
  async saveOwnPrivateNote(ownerUid: string, note: AcademyPrivateNoteDoc): Promise<void> {
    if (note.ownerUid !== ownerUid) throw new Error('ACADEMY_NOTE_OWNER_MISMATCH');
    assertValid(validatePrivateNote(note));
    return this.runTransaction(async tx => {
      const existing = await tx.get<AcademyPrivateNoteDoc>('academy_private_notes', note.id);
      if (existing && existing.ownerUid !== ownerUid) throw new Error('ACADEMY_NOTE_ACCESS_DENIED');
      if (existing) await tx.update('academy_private_notes', note.id, note);
      else await tx.create('academy_private_notes', note.id, note);
    });
  }
  async deleteOwnPrivateNote(ownerUid: string, noteId: string): Promise<void> {
    return this.runTransaction(async tx => {
      const existing = await tx.get<AcademyPrivateNoteDoc>('academy_private_notes', noteId);
      if (!existing || existing.ownerUid !== ownerUid) throw new Error('ACADEMY_NOTE_NOT_FOUND');
      await tx.delete('academy_private_notes', noteId);
    });
  }
}
export function createJsonAcademyRepository(dataDirectory: string): AcademyRepository {
  return new AcademyRepository(new JsonAcademyStorageAdapter(join(dataDirectory, 'academy-db-v1.json')));
}
export function createFirestoreAcademyRepository(database: Firestore): AcademyRepository {
  return new AcademyRepository(new FirestoreAcademyStorageAdapter(database));
}
