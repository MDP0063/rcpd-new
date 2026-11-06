import { join } from 'node:path';
import type { AcademyCourseMasterDoc, AcademyCourseDraftDoc, AcademyCourseVersionDoc, AcademyCourseParticipationDoc, AcademyProgressEvidenceDoc, AcademyCompletionCorrectionDoc, AcademyProgramMasterDoc, AcademyProgramDraftDoc, AcademyProgramVersionDoc, AcademyPrivateNoteDoc } from '../src/types/academy.ts';
import { validateCourseMaster, validateCourseDraft, validateCourseVersion, validateProgramMaster, validateProgramDraft, validateProgramVersion, validatePrivateNote, validateCourseParticipation, validateProgressEvidence, validateCompletionCorrection } from './academyDomain.ts';
import type { AcademyCollection, AcademyDocument, AcademyQuery, AcademyStorageAdapter, AcademyTransaction } from './academyRepositoryTypes.ts';
import { assertAcademyDocument, assertAcademyDocumentId, assertAcademyQuery } from './academyRepositoryRules.ts';
import { JsonAcademyStorageAdapter } from './academyJsonAdapter.ts';
import { FirestoreAcademyStorageAdapter } from './academyFirestoreAdapter.ts';
import type { Firestore } from 'firebase-admin/firestore';

function assertValid(result: { ok: boolean; code?: string }): void {
  if (!result.ok) throw new Error(result.code || 'ACADEMY_DOCUMENT_INVALID');
}
function courseDraftMatchesVersion(draft: AcademyCourseDraftDoc, version: AcademyCourseVersionDoc): boolean {
  return draft.title === version.title &&
    draft.summary === version.summary &&
    JSON.stringify(draft.learningObjectives) === JSON.stringify(version.learningObjectives) &&
    JSON.stringify(draft.chapters) === JSON.stringify(version.chapters) &&
    JSON.stringify(draft.completionRequirements) === JSON.stringify(version.completionRequirements);
}
function programDraftMatchesVersion(draft: AcademyProgramDraftDoc, version: AcademyProgramVersionDoc): boolean {
  return draft.title === version.title &&
    draft.summary === version.summary &&
    JSON.stringify(draft.learningObjectives) === JSON.stringify(version.learningObjectives) &&
    JSON.stringify(draft.courseReferences) === JSON.stringify(version.courseReferences);
}
export class AcademyRepository {
  private readonly adapter: AcademyStorageAdapter;
  constructor(adapter: AcademyStorageAdapter) { this.adapter = adapter; }
  async get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null> {
    if (collection === 'academy_private_notes') throw new Error('ACADEMY_NOTE_OWNER_METHOD_REQUIRED');
    assertAcademyDocumentId(id); return this.adapter.get<T>(collection, id);
  }
  async list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query: AcademyQuery = {}): Promise<T[]> {
    if (collection === 'academy_private_notes') throw new Error('ACADEMY_NOTE_OWNER_METHOD_REQUIRED');
    assertAcademyQuery(collection, query); return this.adapter.list<T>(collection, query);
  }
  private runTransaction<T>(operation: (transaction: AcademyTransaction) => Promise<T>): Promise<T> {
    return this.adapter.runTransaction(operation);
  }
  async create<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    if (collection === 'academy_private_notes') throw new Error('ACADEMY_NOTE_OWNER_METHOD_REQUIRED');
    if (collection !== 'academy_courses' && collection !== 'academy_programs') throw new Error('ACADEMY_TYPED_CREATE_REQUIRED');
    assertAcademyDocument(collection, id, document);
    if (collection === 'academy_courses') {
      const master = document as unknown as AcademyCourseMasterDoc;
      assertValid(validateCourseMaster(master));
      if (master.publicationStatus !== 'draft' || master.latestVersionNumber !== 0 || master.currentPublishedVersionId) throw new Error('ACADEMY_MASTER_MUST_START_AS_DRAFT');
    } else {
      const master = document as unknown as AcademyProgramMasterDoc;
      assertValid(validateProgramMaster(master));
      if (master.publicationStatus !== 'draft' || master.latestVersionNumber !== 0 || master.currentPublishedVersionId) throw new Error('ACADEMY_MASTER_MUST_START_AS_DRAFT');
    }
    return this.runTransaction(tx => tx.create(collection, id, document));
  }
  async update<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    if (collection.endsWith('_versions') || collection === 'academy_progress_evidence' || collection === 'academy_completion_corrections') throw new Error('ACADEMY_DOCUMENT_APPEND_ONLY');
    if (collection === 'academy_private_notes') throw new Error('ACADEMY_NOTE_OWNER_METHOD_REQUIRED');
    assertAcademyDocument(collection, id, document);
    throw new Error('ACADEMY_MASTER_UPDATE_METHOD_REQUIRED');
  }
  async delete(collection: AcademyCollection, id: string): Promise<void> {
    assertAcademyDocumentId(id);
    if (collection.endsWith('_versions') || collection === 'academy_progress_evidence' || collection === 'academy_completion_corrections' || collection === 'academy_private_notes') {
      throw new Error('ACADEMY_DOCUMENT_APPEND_ONLY');
    }
    throw new Error('ACADEMY_MASTER_ARCHIVE_METHOD_REQUIRED');
  }
  async createCourseWithDraft(master: AcademyCourseMasterDoc, draft: AcademyCourseDraftDoc): Promise<void> {
    assertValid(validateCourseMaster(master));
    assertValid(validateCourseDraft(master.id, draft));
    if (master.publicationStatus !== 'draft' || master.latestVersionNumber !== 0 ||
        master.currentPublishedVersionId || master.workingRevision !== 1 ||
        draft.workingRevision !== 1 || master.ownerUid !== draft.updatedByUid) {
      throw new Error('ACADEMY_INITIAL_COURSE_STATE_INVALID');
    }
    return this.runTransaction(async tx => {
      const existing = await tx.list<AcademyCourseMasterDoc>('academy_courses');
      if (existing.some(item => item.code.toUpperCase() === master.code.toUpperCase())) {
        throw new Error('ACADEMY_CODE_ALREADY_EXISTS');
      }
      await tx.create('academy_courses', master.id, master);
      await tx.create('academy_course_drafts', master.id, draft);
    });
  }
  async createProgramWithDraft(master: AcademyProgramMasterDoc, draft: AcademyProgramDraftDoc): Promise<void> {
    assertValid(validateProgramMaster(master));
    assertValid(validateProgramDraft(master.id, draft));
    if (master.publicationStatus !== 'draft' || master.latestVersionNumber !== 0 ||
        master.currentPublishedVersionId || master.workingRevision !== 1 ||
        draft.workingRevision !== 1 || master.ownerUid !== draft.updatedByUid) {
      throw new Error('ACADEMY_INITIAL_PROGRAM_STATE_INVALID');
    }
    return this.runTransaction(async tx => {
      const existing = await tx.list<AcademyProgramMasterDoc>('academy_programs');
      if (existing.some(item => item.code.toUpperCase() === master.code.toUpperCase())) {
        throw new Error('ACADEMY_CODE_ALREADY_EXISTS');
      }
      await tx.create('academy_programs', master.id, master);
      await tx.create('academy_program_drafts', master.id, draft);
    });
  }
  async getCourseDraft(courseId: string): Promise<AcademyCourseDraftDoc | null> {
    return this.adapter.get<AcademyCourseDraftDoc>('academy_course_drafts', courseId);
  }
  async saveCourseDraft(courseId: string, draft: AcademyCourseDraftDoc, expectedRevision: number, actorUid: string): Promise<void> {
    if (!actorUid.trim() || draft.updatedByUid !== actorUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    assertValid(validateCourseDraft(courseId, draft));
    if (!Number.isSafeInteger(expectedRevision) || draft.workingRevision !== expectedRevision + 1) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
    return this.runTransaction(async tx => {
      const master = await tx.get<AcademyCourseMasterDoc>('academy_courses', courseId);
      if (!master) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      assertValid(validateCourseMaster(master));
      if (master.publicationStatus === 'archived') throw new Error('ACADEMY_MASTER_ARCHIVED');
      if (master.workingRevision !== expectedRevision) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      const existing = await tx.get<AcademyCourseDraftDoc>('academy_course_drafts', courseId);
      if ((existing && existing.workingRevision !== expectedRevision) || (!existing && expectedRevision !== 1)) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      if (existing) await tx.update('academy_course_drafts', courseId, draft);
      else await tx.create('academy_course_drafts', courseId, draft);
      await tx.update('academy_courses', courseId, { ...master, workingRevision: draft.workingRevision, updatedIso: draft.updatedIso });
    });
  }
  async getProgramDraft(programId: string): Promise<AcademyProgramDraftDoc | null> {
    return this.adapter.get<AcademyProgramDraftDoc>('academy_program_drafts', programId);
  }
  async saveProgramDraft(programId: string, draft: AcademyProgramDraftDoc, expectedRevision: number, actorUid: string): Promise<void> {
    if (!actorUid.trim() || draft.updatedByUid !== actorUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    assertValid(validateProgramDraft(programId, draft));
    if (!Number.isSafeInteger(expectedRevision) || draft.workingRevision !== expectedRevision + 1) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
    return this.runTransaction(async tx => {
      const master = await tx.get<AcademyProgramMasterDoc>('academy_programs', programId);
      if (!master) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      assertValid(validateProgramMaster(master));
      if (master.publicationStatus === 'archived') throw new Error('ACADEMY_MASTER_ARCHIVED');
      if (master.workingRevision !== expectedRevision) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      const existing = await tx.get<AcademyProgramDraftDoc>('academy_program_drafts', programId);
      if ((existing && existing.workingRevision !== expectedRevision) || (!existing && expectedRevision !== 1)) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      if (existing) await tx.update('academy_program_drafts', programId, draft);
      else await tx.create('academy_program_drafts', programId, draft);
      await tx.update('academy_programs', programId, { ...master, workingRevision: draft.workingRevision, updatedIso: draft.updatedIso });
    });
  }
  async publishCourseVersion(courseId: string, version: AcademyCourseVersionDoc, nextMaster: AcademyCourseMasterDoc, expectedRevision: number, publisherUid: string): Promise<void> {
    if (!publisherUid.trim() || version.publishedByUid !== publisherUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    assertValid(validateCourseVersion(courseId, version));
    assertValid(validateCourseMaster(nextMaster));
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyCourseMasterDoc>('academy_courses', courseId);
      if (!current) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      if (current.publicationStatus === 'archived') throw new Error('ACADEMY_MASTER_ARCHIVED');
      assertValid(validateCourseMaster(current));
      if (current.workingRevision !== expectedRevision || nextMaster.workingRevision !== expectedRevision || version.workingRevision !== expectedRevision) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      const draft = await tx.get<AcademyCourseDraftDoc>('academy_course_drafts', courseId);
      if (!draft || draft.workingRevision !== expectedRevision || !courseDraftMatchesVersion(draft, version)) throw new Error('ACADEMY_DRAFT_VERSION_MISMATCH');
      const nextNumber = current.latestVersionNumber + 1;
      const versionId = `${courseId}__v${nextNumber}`;
      if (version.id !== versionId || version.versionNumber !== nextNumber ||
          nextMaster.id !== current.id || nextMaster.code !== current.code ||
          nextMaster.ownerUid !== current.ownerUid || nextMaster.createdIso !== current.createdIso ||
          nextMaster.availability !== current.availability ||
          nextMaster.latestVersionNumber !== nextNumber ||
          nextMaster.currentPublishedVersionId !== versionId ||
          nextMaster.publicationStatus !== 'published' ||
          !version.publishedIso || !version.publishedByUid) throw new Error('ACADEMY_VERSION_SEQUENCE_INVALID');
      await tx.create('academy_course_versions', versionId, version);
      await tx.update('academy_courses', courseId, nextMaster);
    });
  }
  async publishProgramVersion(programId: string, version: AcademyProgramVersionDoc, nextMaster: AcademyProgramMasterDoc, expectedRevision: number, publisherUid: string): Promise<void> {
    if (!publisherUid.trim() || version.publishedByUid !== publisherUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    assertValid(validateProgramVersion(programId, version));
    assertValid(validateProgramMaster(nextMaster));
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyProgramMasterDoc>('academy_programs', programId);
      if (!current) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      if (current.publicationStatus === 'archived') throw new Error('ACADEMY_MASTER_ARCHIVED');
      assertValid(validateProgramMaster(current));
      if (current.workingRevision !== expectedRevision || nextMaster.workingRevision !== expectedRevision || version.workingRevision !== expectedRevision) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      const draft = await tx.get<AcademyProgramDraftDoc>('academy_program_drafts', programId);
      if (!draft || draft.workingRevision !== expectedRevision || !programDraftMatchesVersion(draft, version)) throw new Error('ACADEMY_DRAFT_VERSION_MISMATCH');
      const nextNumber = current.latestVersionNumber + 1;
      const versionId = `${programId}__v${nextNumber}`;
      if (version.id !== versionId || version.versionNumber !== nextNumber ||
          nextMaster.id !== current.id || nextMaster.code !== current.code ||
          nextMaster.ownerUid !== current.ownerUid || nextMaster.createdIso !== current.createdIso ||
          nextMaster.availability !== current.availability ||
          nextMaster.latestVersionNumber !== nextNumber ||
          nextMaster.currentPublishedVersionId !== versionId ||
          nextMaster.publicationStatus !== 'published' ||
          !version.publishedIso || !version.publishedByUid) throw new Error('ACADEMY_VERSION_SEQUENCE_INVALID');
      await tx.create('academy_program_versions', versionId, version);
      await tx.update('academy_programs', programId, nextMaster);
    });
  }
  async startCourseParticipation(userUid: string, courseId: string, now: string): Promise<AcademyCourseParticipationDoc> {
    if (!userUid.trim()) throw new Error('ACADEMY_PARTICIPANT_REQUIRED');
    const participationId = `participation_${encodeURIComponent(userUid)}_${encodeURIComponent(courseId)}`;
    return this.runTransaction(async tx => {
      const master = await tx.get<AcademyCourseMasterDoc>('academy_courses', courseId);
      if (!master) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      assertValid(validateCourseMaster(master));
      if (master.publicationStatus !== 'published' || master.availability !== 'available' || !master.currentPublishedVersionId) {
        throw new Error('ACADEMY_COURSE_NOT_STARTABLE');
      }
      const version = await tx.get<AcademyCourseVersionDoc>('academy_course_versions', master.currentPublishedVersionId);
      if (!version) throw new Error('ACADEMY_PUBLISHED_VERSION_MISSING');
      assertValid(validateCourseVersion(courseId, version));
      const existing = await tx.get<AcademyCourseParticipationDoc>('academy_course_participations', participationId);
      if (existing) throw new Error('ACADEMY_PARTICIPATION_ALREADY_EXISTS');
      const participation: AcademyCourseParticipationDoc = {
        id: participationId, userUid, courseId, courseVersionId: version.id,
        status: 'in_progress', startedIso: now, lastActivityIso: now,
        createdIso: now, updatedIso: now
      };
      assertValid(validateCourseParticipation(participation));
      await tx.create('academy_course_participations', participation.id, participation);
      return participation;
    });
  }
  async getCourseParticipation(participationId: string): Promise<AcademyCourseParticipationDoc | null> {
    return this.adapter.get<AcademyCourseParticipationDoc>('academy_course_participations', participationId);
  }
  async listOwnCourseParticipations(userUid: string): Promise<AcademyCourseParticipationDoc[]> {
    if (!userUid.trim()) throw new Error('ACADEMY_PARTICIPANT_REQUIRED');
    return this.adapter.list<AcademyCourseParticipationDoc>('academy_course_participations', {
      where: [{ field: 'userUid', value: userUid }], limit: 1000
    });
  }
  async listCourseParticipations(courseId: string): Promise<AcademyCourseParticipationDoc[]> {
    if (!courseId.trim()) throw new Error('ACADEMY_COURSE_REQUIRED');
    return this.adapter.list<AcademyCourseParticipationDoc>('academy_course_participations', {
      where: [{ field: 'courseId', value: courseId }], limit: 1000
    });
  }
  async listParticipationEvidence(participationId: string): Promise<AcademyProgressEvidenceDoc[]> {
    return this.adapter.list<AcademyProgressEvidenceDoc>('academy_progress_evidence', {
      where: [{ field: 'participationId', value: participationId }], limit: 1000
    });
  }
  async recordProgressEvidence(
    participationId: string,
    evidenceInput: Omit<AcademyProgressEvidenceDoc, 'id'>,
    actorUid: string,
    instructorAuthorized: boolean
  ): Promise<{ participation: AcademyCourseParticipationDoc; evidence: AcademyProgressEvidenceDoc }> {
    if (!actorUid.trim() || evidenceInput.recordedByUid !== actorUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    if (evidenceInput.participationId !== participationId) throw new Error('ACADEMY_PROGRESS_EVIDENCE_ID_INVALID');
    return this.runTransaction(async tx => {
      const participation = await tx.get<AcademyCourseParticipationDoc>('academy_course_participations', participationId);
      if (!participation) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      assertValid(validateCourseParticipation(participation));
      if (participation.status !== 'in_progress') throw new Error('ACADEMY_PARTICIPATION_NOT_ACTIVE');
      const version = await tx.get<AcademyCourseVersionDoc>('academy_course_versions', participation.courseVersionId);
      if (!version || version.courseId !== participation.courseId) throw new Error('ACADEMY_PINNED_VERSION_MISSING');
      const requirement = version.completionRequirements.find(item => item.id === evidenceInput.requirementId);
      if (!requirement) throw new Error('ACADEMY_COMPLETION_REQUIREMENT_NOT_FOUND');
      if (requirement.type !== evidenceInput.evidenceType || requirement.targetId !== evidenceInput.sourceId) {
        throw new Error('ACADEMY_PROGRESS_EVIDENCE_REQUIREMENT_MISMATCH');
      }
      if (requirement.type === 'required_assessment') throw new Error('ACADEMY_EVIDENCE_EXTERNAL_SOURCE_REQUIRED');
      const participantSelfEvidence = ['required_chapter', 'required_material', 'accepted_self_confirmation'].includes(requirement.type);
      const instructorEvidence = ['practical_task', 'instructor_confirmation'].includes(requirement.type);
      if (participantSelfEvidence && participation.userUid !== actorUid) throw new Error('ACADEMY_EVIDENCE_ACTOR_FORBIDDEN');
      if (instructorEvidence && (!instructorAuthorized || participation.userUid === actorUid)) throw new Error('ACADEMY_EVIDENCE_INSTRUCTOR_REQUIRED');

      const previousEvidence = await tx.list<AcademyProgressEvidenceDoc>('academy_progress_evidence', {
        where: [{ field: 'participationId', value: participationId }], limit: 1000
      });
      const previousCorrections = await tx.list<AcademyCompletionCorrectionDoc>('academy_completion_corrections', {
        where: [{ field: 'participationId', value: participationId }], limit: 1000
      });
      const invalidatedIds = new Set(previousCorrections.flatMap(item => item.invalidatedEvidenceIds ?? []));
      const activeEvidence = previousEvidence.filter(item => !invalidatedIds.has(item.id));
      if (activeEvidence.some(item => item.requirementId === evidenceInput.requirementId)) {
        throw new Error('ACADEMY_PROGRESS_EVIDENCE_ALREADY_EXISTS');
      }
      const sequence = previousEvidence.filter(item => item.requirementId === evidenceInput.requirementId).length + 1;
      const evidence: AcademyProgressEvidenceDoc = {
        ...evidenceInput,
        id: `evidence_${encodeURIComponent(participationId)}_${encodeURIComponent(evidenceInput.requirementId)}_${sequence}`
      };
      assertValid(validateProgressEvidence(evidence));
      const completedRequirements = new Set(activeEvidence.map(item => item.requirementId));
      completedRequirements.add(evidence.requirementId);
      const required = version.completionRequirements.filter(item => item.required);
      const isComplete = required.length > 0 && required.every(item => completedRequirements.has(item.id));
      const nextParticipation: AcademyCourseParticipationDoc = {
        ...participation,
        status: isComplete ? 'completed' : 'in_progress',
        lastActivityIso: evidence.recordedIso,
        updatedIso: evidence.recordedIso,
        ...(isComplete ? { completedIso: evidence.recordedIso } : {})
      };
      assertValid(validateCourseParticipation(nextParticipation));
      await tx.create('academy_progress_evidence', evidence.id, evidence);
      await tx.update('academy_course_participations', participationId, nextParticipation);
      return { participation: nextParticipation, evidence };
    });
  }
  async correctCourseParticipation(
    participationId: string,
    correction: AcademyCompletionCorrectionDoc,
    expectedStatus: 'in_progress' | 'completed'
  ): Promise<AcademyCourseParticipationDoc> {
    assertValid(validateCompletionCorrection(correction));
    if (correction.participationId !== participationId || correction.previousStatus !== expectedStatus) {
      throw new Error('ACADEMY_COMPLETION_CORRECTION_INVALID');
    }
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyCourseParticipationDoc>('academy_course_participations', participationId);
      if (!current) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      if (current.status !== expectedStatus || !['in_progress', 'completed'].includes(current.status)) {
        throw new Error('ACADEMY_COMPLETION_CORRECTION_CONFLICT');
      }
      if (correction.correctedStatus === current.status) throw new Error('ACADEMY_COMPLETION_CORRECTION_NOOP');
      const evidence = await tx.list<AcademyProgressEvidenceDoc>('academy_progress_evidence', {
        where: [{ field: 'participationId', value: participationId }], limit: 1000
      });
      const priorCorrections = await tx.list<AcademyCompletionCorrectionDoc>('academy_completion_corrections', {
        where: [{ field: 'participationId', value: participationId }], limit: 1000
      });
      const previouslyInvalidated = new Set(priorCorrections.flatMap(item => item.invalidatedEvidenceIds ?? []));
      const requestedInvalidations = correction.invalidatedEvidenceIds ?? [];
      const evidenceIds = new Set(evidence.map(item => item.id));
      if (requestedInvalidations.some(id => !evidenceIds.has(id) || previouslyInvalidated.has(id))) {
        throw new Error('ACADEMY_COMPLETION_CORRECTION_EVIDENCE_CONFLICT');
      }
      if (correction.correctedStatus === 'in_progress') {
        const version = await tx.get<AcademyCourseVersionDoc>('academy_course_versions', current.courseVersionId);
        if (!version) throw new Error('ACADEMY_PINNED_VERSION_MISSING');
        const invalidatedAfterCorrection = new Set([...previouslyInvalidated, ...requestedInvalidations]);
        const activeRequirements = new Set(evidence.filter(item => !invalidatedAfterCorrection.has(item.id)).map(item => item.requirementId));
        const required = version.completionRequirements.filter(item => item.required);
        if (required.length > 0 && required.every(item => activeRequirements.has(item.id))) {
          throw new Error('ACADEMY_COMPLETION_CORRECTION_REQUIRES_EVIDENCE_INVALIDATION');
        }
      }
      const { completedIso: _previousCompletedIso, ...withoutCompletion } = current;
      const next: AcademyCourseParticipationDoc = {
        ...withoutCompletion,
        status: correction.correctedStatus,
        updatedIso: correction.correctedIso,
        ...(correction.correctedStatus === 'completed' ? { completedIso: correction.correctedIso } : {})
      };
      assertValid(validateCourseParticipation(next));
      await tx.create('academy_completion_corrections', correction.id, correction);
      await tx.update('academy_course_participations', participationId, next);
      return next;
    });
  }
  async listParticipationCorrections(participationId: string): Promise<AcademyCompletionCorrectionDoc[]> {
    return this.adapter.list<AcademyCompletionCorrectionDoc>('academy_completion_corrections', {
      where: [{ field: 'participationId', value: participationId }], limit: 1000
    });
  }
  async listOwnPrivateNotes(ownerUid: string): Promise<AcademyPrivateNoteDoc[]> {
    if (!ownerUid.trim()) throw new Error('ACADEMY_NOTE_OWNER_REQUIRED');
    return this.adapter.list<AcademyPrivateNoteDoc>('academy_private_notes', { where: [{ field: 'ownerUid', value: ownerUid }], limit: 1000 });
  }
  async getOwnPrivateNote(ownerUid: string, noteId: string): Promise<AcademyPrivateNoteDoc | null> {
    if (!ownerUid.trim()) throw new Error('ACADEMY_NOTE_OWNER_REQUIRED');
    const note = await this.adapter.get<AcademyPrivateNoteDoc>('academy_private_notes', noteId);
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
    if (!ownerUid.trim()) throw new Error('ACADEMY_NOTE_OWNER_REQUIRED');
    return this.runTransaction(async tx => {
      const existing = await tx.get<AcademyPrivateNoteDoc>('academy_private_notes', noteId);
      if (!existing || existing.ownerUid !== ownerUid) throw new Error('ACADEMY_NOTE_NOT_FOUND');
      await tx.delete('academy_private_notes', noteId);
    });
  }
}
export function createJsonAcademyRepository(dataDirectory: string): AcademyRepository {
  return new AcademyRepository(new JsonAcademyStorageAdapter(join(dataDirectory, 'academy-db.json')));
}
export function createFirestoreAcademyRepository(database: Firestore): AcademyRepository {
  return new AcademyRepository(new FirestoreAcademyStorageAdapter(database));
}
