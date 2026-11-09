import { join } from 'node:path';
import type { AcademyCourseMasterDoc, AcademyCourseDraftDoc, AcademyCourseVersionDoc, AcademyCourseParticipationDoc, AcademyProgressEvidenceDoc, AcademyCompletionCorrectionDoc, AcademyProgramMasterDoc, AcademyProgramDraftDoc, AcademyProgramVersionDoc, AcademyProgramParticipationDoc, AcademyProgramCoursePin, AcademyPrivateNoteDoc, AcademyMaterialCategoryDoc, AcademyMaterialCategoryAssignmentDoc, AcademyMaterialDocumentTypeDoc, AcademyMaterialDocumentTypeAssignmentDoc, AcademyMaterialMasterDoc, AcademyMaterialDraftDoc, AcademyMaterialVersionDoc } from '../src/types/academy.ts';
import { validateCourseMaster, validateCourseDraft, validateCourseVersion, validateProgramMaster, validateProgramDraft, validateProgramVersion, validatePrivateNote, validateCourseParticipation, validateProgressEvidence, validateCompletionCorrection, validateProgramParticipation, validateMaterialCategory, validateMaterialCategoryAssignment, validateMaterialDocumentType, validateMaterialDocumentTypeAssignment, validateMaterialMaster, validateMaterialDraft, validateMaterialVersion } from './academyDomain.ts';
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

function materialDraftMatchesVersion(draft: AcademyMaterialDraftDoc, version: AcademyMaterialVersionDoc): boolean {
  return draft.title === version.title &&
    draft.description === version.description &&
    draft.categoryId === version.categoryId &&
    draft.documentTypeId === version.documentTypeId &&
    draft.requiredRole === version.requiredRole &&
    draft.contentFormat === version.contentFormat &&
    draft.content === version.content &&
    draft.codeLanguage === version.codeLanguage;
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
  async listMaterialCategories(): Promise<AcademyMaterialCategoryDoc[]> {
    return this.adapter.list<AcademyMaterialCategoryDoc>('academy_material_categories', { limit: 1000 });
  }
  async listMaterialDocumentTypes(): Promise<AcademyMaterialDocumentTypeDoc[]> {
    return this.adapter.list<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', { limit: 1000 });
  }
  async setMaterialDocumentTypeAssignment(
    materialId: string,
    documentTypeId: string,
    actorUid: string,
    now: string
  ): Promise<AcademyMaterialDocumentTypeAssignmentDoc> {
    if (!materialId.trim() || !documentTypeId.trim() || !actorUid.trim()) {
      throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_ASSIGNMENT_INVALID');
    }
    return this.runTransaction(async tx => {
      const documentType = await tx.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', documentTypeId);
      if (!documentType) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND');
      assertValid(validateMaterialDocumentType(documentType));
      const existing = await tx.get<AcademyMaterialDocumentTypeAssignmentDoc>(
        'academy_material_document_type_assignments', materialId
      );
      if (existing) assertValid(validateMaterialDocumentTypeAssignment(existing));
      if (existing?.documentTypeId === documentTypeId) return existing;
      if (documentType.status !== 'active') throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_ACTIVE');
      const next: AcademyMaterialDocumentTypeAssignmentDoc = {
        id: materialId,
        materialId,
        documentTypeId,
        revision: (existing?.revision ?? 0) + 1,
        createdIso: existing?.createdIso ?? now,
        createdByUid: existing?.createdByUid ?? actorUid,
        updatedIso: now,
        updatedByUid: actorUid
      };
      assertValid(validateMaterialDocumentTypeAssignment(next));
      if (existing) await tx.update('academy_material_document_type_assignments', materialId, next);
      else await tx.create('academy_material_document_type_assignments', materialId, next);
      return next;
    });
  }
  async clearMaterialDocumentTypeAssignment(materialId: string): Promise<void> {
    if (!materialId.trim()) throw new Error('ACADEMY_MATERIAL_REQUIRED');
    return this.runTransaction(async tx => {
      const existing = await tx.get<AcademyMaterialDocumentTypeAssignmentDoc>(
        'academy_material_document_type_assignments', materialId
      );
      if (existing) {
        assertValid(validateMaterialDocumentTypeAssignment(existing));
        await tx.delete('academy_material_document_type_assignments', materialId);
      }
    });
  }
  async deleteMaterialDocumentType(
    documentTypeId: string,
    expectedRevision: number,
    actorUid: string
  ): Promise<AcademyMaterialDocumentTypeDoc> {
    if (!actorUid.trim()) throw new Error('ACADEMY_ACTOR_REQUIRED');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_CONFLICT');
    }
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', documentTypeId);
      if (!current) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND');
      assertValid(validateMaterialDocumentType(current));
      if (current.revision !== expectedRevision) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_CONFLICT');
      const references = await tx.list<AcademyMaterialDocumentTypeAssignmentDoc>(
        'academy_material_document_type_assignments',
        { where: [{ field: 'documentTypeId', value: documentTypeId }], limit: 1 }
      );
      if (references.length > 0) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_IN_USE');
      await tx.delete('academy_material_document_types', documentTypeId);
      return current;
    });
  }
  async createMaterialDocumentType(documentType: AcademyMaterialDocumentTypeDoc): Promise<void> {
    assertValid(validateMaterialDocumentType(documentType));
    if (documentType.revision !== 1 || documentType.status !== 'active' ||
        documentType.archivedIso !== undefined || documentType.archivedByUid !== undefined) {
      throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_INITIAL_STATE_INVALID');
    }
    return this.runTransaction(async tx => {
      const existing = await tx.list<AcademyMaterialDocumentTypeDoc>('academy_material_document_types');
      const normalizedName = documentType.name.normalize('NFKC').trim().toLocaleLowerCase('de-DE');
      if (existing.some(item => item.name.normalize('NFKC').trim().toLocaleLowerCase('de-DE') === normalizedName)) {
        throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NAME_ALREADY_EXISTS');
      }
      await tx.create('academy_material_document_types', documentType.id, documentType);
    });
  }
  async updateMaterialDocumentType(
    documentType: AcademyMaterialDocumentTypeDoc,
    expectedRevision: number,
    actorUid: string
  ): Promise<void> {
    if (!actorUid.trim() || documentType.updatedByUid !== actorUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    assertValid(validateMaterialDocumentType(documentType));
    if (!Number.isSafeInteger(expectedRevision) || documentType.revision !== expectedRevision + 1) {
      throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_CONFLICT');
    }
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', documentType.id);
      if (!current) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND');
      assertValid(validateMaterialDocumentType(current));
      if (current.revision !== expectedRevision ||
          documentType.createdIso !== current.createdIso || documentType.createdByUid !== current.createdByUid ||
          documentType.status !== current.status || documentType.archivedIso !== current.archivedIso ||
          documentType.archivedByUid !== current.archivedByUid) {
        throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_CONFLICT');
      }
      const documentTypes = await tx.list<AcademyMaterialDocumentTypeDoc>('academy_material_document_types');
      const normalizedName = documentType.name.normalize('NFKC').trim().toLocaleLowerCase('de-DE');
      if (documentTypes.some(item => item.id !== documentType.id &&
          item.name.normalize('NFKC').trim().toLocaleLowerCase('de-DE') === normalizedName)) {
        throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NAME_ALREADY_EXISTS');
      }
      await tx.update('academy_material_document_types', documentType.id, documentType);
    });
  }
  async setMaterialDocumentTypeArchived(
    documentTypeId: string,
    archived: boolean,
    expectedRevision: number,
    actorUid: string,
    now: string
  ): Promise<AcademyMaterialDocumentTypeDoc> {
    if (!actorUid.trim()) throw new Error('ACADEMY_ACTOR_REQUIRED');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_CONFLICT');
    }
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', documentTypeId);
      if (!current) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND');
      assertValid(validateMaterialDocumentType(current));
      if (current.revision !== expectedRevision) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_CONFLICT');
      if ((current.status === 'archived') === archived) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_STATE_UNCHANGED');
      const next: AcademyMaterialDocumentTypeDoc = {
        ...current,
        status: archived ? 'archived' : 'active',
        revision: current.revision + 1,
        updatedIso: now,
        updatedByUid: actorUid,
        ...(archived ? { archivedIso: now, archivedByUid: actorUid } : {})
      };
      if (!archived) { delete next.archivedIso; delete next.archivedByUid; }
      assertValid(validateMaterialDocumentType(next));
      await tx.update('academy_material_document_types', documentTypeId, next);
      return next;
    });
  }
  async setMaterialCategoryAssignment(
    materialId: string,
    categoryId: string,
    actorUid: string,
    now: string
  ): Promise<AcademyMaterialCategoryAssignmentDoc> {
    if (!materialId.trim() || !categoryId.trim() || !actorUid.trim()) {
      throw new Error('ACADEMY_MATERIAL_CATEGORY_ASSIGNMENT_INVALID');
    }
    return this.runTransaction(async tx => {
      const category = await tx.get<AcademyMaterialCategoryDoc>('academy_material_categories', categoryId);
      if (!category) throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_FOUND');
      assertValid(validateMaterialCategory(category));
      const existing = await tx.get<AcademyMaterialCategoryAssignmentDoc>(
        'academy_material_category_assignments', materialId
      );
      if (existing) assertValid(validateMaterialCategoryAssignment(existing));
      if (existing?.categoryId === categoryId) return existing;
      if (category.status !== 'active') throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_ACTIVE');
      const next: AcademyMaterialCategoryAssignmentDoc = {
        id: materialId,
        materialId,
        categoryId,
        revision: (existing?.revision ?? 0) + 1,
        createdIso: existing?.createdIso ?? now,
        createdByUid: existing?.createdByUid ?? actorUid,
        updatedIso: now,
        updatedByUid: actorUid
      };
      assertValid(validateMaterialCategoryAssignment(next));
      if (existing) await tx.update('academy_material_category_assignments', materialId, next);
      else await tx.create('academy_material_category_assignments', materialId, next);
      return next;
    });
  }
  async clearMaterialCategoryAssignment(materialId: string): Promise<void> {
    if (!materialId.trim()) throw new Error('ACADEMY_MATERIAL_REQUIRED');
    return this.runTransaction(async tx => {
      const existing = await tx.get<AcademyMaterialCategoryAssignmentDoc>(
        'academy_material_category_assignments', materialId
      );
      if (existing) {
        assertValid(validateMaterialCategoryAssignment(existing));
        await tx.delete('academy_material_category_assignments', materialId);
      }
    });
  }
  async deleteMaterialCategory(
    categoryId: string,
    expectedRevision: number,
    actorUid: string
  ): Promise<AcademyMaterialCategoryDoc> {
    if (!actorUid.trim()) throw new Error('ACADEMY_ACTOR_REQUIRED');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw new Error('ACADEMY_MATERIAL_CATEGORY_REVISION_CONFLICT');
    }
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyMaterialCategoryDoc>('academy_material_categories', categoryId);
      if (!current) throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_FOUND');
      assertValid(validateMaterialCategory(current));
      if (current.revision !== expectedRevision) throw new Error('ACADEMY_MATERIAL_CATEGORY_REVISION_CONFLICT');
      const references = await tx.list<AcademyMaterialCategoryAssignmentDoc>(
        'academy_material_category_assignments',
        { where: [{ field: 'categoryId', value: categoryId }], limit: 1 }
      );
      if (references.length > 0) throw new Error('ACADEMY_MATERIAL_CATEGORY_IN_USE');
      await tx.delete('academy_material_categories', categoryId);
      return current;
    });
  }
  async createMaterialCategory(category: AcademyMaterialCategoryDoc): Promise<void> {
    assertValid(validateMaterialCategory(category));
    if (category.revision !== 1 || category.status !== 'active' ||
        category.archivedIso !== undefined || category.archivedByUid !== undefined) {
      throw new Error('ACADEMY_MATERIAL_CATEGORY_INITIAL_STATE_INVALID');
    }
    return this.runTransaction(async tx => {
      const existing = await tx.list<AcademyMaterialCategoryDoc>('academy_material_categories');
      const normalizedName = category.name.normalize('NFKC').trim().toLocaleLowerCase('de-DE');
      if (existing.some(item => item.name.normalize('NFKC').trim().toLocaleLowerCase('de-DE') === normalizedName)) {
        throw new Error('ACADEMY_MATERIAL_CATEGORY_NAME_ALREADY_EXISTS');
      }
      await tx.create('academy_material_categories', category.id, category);
    });
  }
  async updateMaterialCategory(
    category: AcademyMaterialCategoryDoc,
    expectedRevision: number,
    actorUid: string
  ): Promise<void> {
    if (!actorUid.trim() || category.updatedByUid !== actorUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    assertValid(validateMaterialCategory(category));
    if (!Number.isSafeInteger(expectedRevision) || category.revision !== expectedRevision + 1) {
      throw new Error('ACADEMY_MATERIAL_CATEGORY_REVISION_CONFLICT');
    }
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyMaterialCategoryDoc>('academy_material_categories', category.id);
      if (!current) throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_FOUND');
      assertValid(validateMaterialCategory(current));
      if (current.revision !== expectedRevision ||
          category.createdIso !== current.createdIso || category.createdByUid !== current.createdByUid ||
          category.status !== current.status || category.archivedIso !== current.archivedIso ||
          category.archivedByUid !== current.archivedByUid) {
        throw new Error('ACADEMY_MATERIAL_CATEGORY_REVISION_CONFLICT');
      }
      const categories = await tx.list<AcademyMaterialCategoryDoc>('academy_material_categories');
      const normalizedName = category.name.normalize('NFKC').trim().toLocaleLowerCase('de-DE');
      if (categories.some(item => item.id !== category.id &&
          item.name.normalize('NFKC').trim().toLocaleLowerCase('de-DE') === normalizedName)) {
        throw new Error('ACADEMY_MATERIAL_CATEGORY_NAME_ALREADY_EXISTS');
      }
      await tx.update('academy_material_categories', category.id, category);
    });
  }
  async setMaterialCategoryArchived(
    categoryId: string,
    archived: boolean,
    expectedRevision: number,
    actorUid: string,
    now: string
  ): Promise<AcademyMaterialCategoryDoc> {
    if (!actorUid.trim()) throw new Error('ACADEMY_ACTOR_REQUIRED');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw new Error('ACADEMY_MATERIAL_CATEGORY_REVISION_CONFLICT');
    }
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyMaterialCategoryDoc>('academy_material_categories', categoryId);
      if (!current) throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_FOUND');
      assertValid(validateMaterialCategory(current));
      if (current.revision !== expectedRevision) throw new Error('ACADEMY_MATERIAL_CATEGORY_REVISION_CONFLICT');
      if ((current.status === 'archived') === archived) throw new Error('ACADEMY_MATERIAL_CATEGORY_STATE_UNCHANGED');
      const next: AcademyMaterialCategoryDoc = {
        ...current,
        status: archived ? 'archived' : 'active',
        revision: current.revision + 1,
        updatedIso: now,
        updatedByUid: actorUid,
        ...(archived
          ? { archivedIso: now, archivedByUid: actorUid }
          : {})
      };
      if (!archived) {
        delete next.archivedIso;
        delete next.archivedByUid;
      }
      assertValid(validateMaterialCategory(next));
      await tx.update('academy_material_categories', categoryId, next);
      return next;
    });
  }

  async getMaterialDraft(materialId: string): Promise<AcademyMaterialDraftDoc | null> {
    return this.adapter.get<AcademyMaterialDraftDoc>('academy_material_drafts', materialId);
  }
  async createMaterialWithDraft(master: AcademyMaterialMasterDoc, draft: AcademyMaterialDraftDoc): Promise<void> {
    assertValid(validateMaterialMaster(master));
    assertValid(validateMaterialDraft(master.id, draft));
    if (master.publicationStatus !== 'draft' || master.latestVersionNumber !== 0 ||
        master.currentPublishedVersionId || master.lastPublishedWorkingRevision !== undefined ||
        master.workingRevision !== 1 || draft.workingRevision !== 1 ||
        master.ownerUid !== draft.createdByUid || draft.createdByUid !== draft.updatedByUid ||
        draft.createdIso !== draft.updatedIso) {
      throw new Error('ACADEMY_MATERIAL_INITIAL_STATE_INVALID');
    }
    return this.runTransaction(async tx => {
      const existingMaterials = await tx.list<AcademyMaterialMasterDoc>('academy_materials', {
        where: [{ field: 'code', value: master.code }], limit: 1
      });
      if (existingMaterials.length > 0) throw new Error('ACADEMY_MATERIAL_CODE_ALREADY_EXISTS');
      if (master.responsibleCourseCode) {
        const courses = await tx.list<AcademyCourseMasterDoc>('academy_courses');
        const responsibleCourse = courses.find(item => item.code.toUpperCase() === master.responsibleCourseCode!.toUpperCase());
        if (!responsibleCourse || responsibleCourse.publicationStatus === 'archived') {
          throw new Error('ACADEMY_MATERIAL_COURSE_NOT_FOUND');
        }
      }
      const category = await tx.get<AcademyMaterialCategoryDoc>('academy_material_categories', draft.categoryId);
      const documentType = await tx.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', draft.documentTypeId);
      if (!category) throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_FOUND');
      if (!documentType) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND');
      assertValid(validateMaterialCategory(category));
      assertValid(validateMaterialDocumentType(documentType));
      if (category.status !== 'active') throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_ACTIVE');
      if (documentType.status !== 'active') throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_ACTIVE');
      const [existingMaster, existingDraft, existingCategoryAssignment, existingDocumentTypeAssignment] = await Promise.all([
        tx.get<AcademyMaterialMasterDoc>('academy_materials', master.id),
        tx.get<AcademyMaterialDraftDoc>('academy_material_drafts', master.id),
        tx.get<AcademyMaterialCategoryAssignmentDoc>('academy_material_category_assignments', master.id),
        tx.get<AcademyMaterialDocumentTypeAssignmentDoc>('academy_material_document_type_assignments', master.id)
      ]);
      if (existingMaster || existingDraft || existingCategoryAssignment || existingDocumentTypeAssignment) {
        throw new Error('ACADEMY_DOCUMENT_ALREADY_EXISTS');
      }
      const categoryAssignment: AcademyMaterialCategoryAssignmentDoc = {
        id: master.id, materialId: master.id, categoryId: draft.categoryId, revision: 1,
        createdIso: draft.createdIso, createdByUid: draft.createdByUid,
        updatedIso: draft.updatedIso, updatedByUid: draft.updatedByUid
      };
      const documentTypeAssignment: AcademyMaterialDocumentTypeAssignmentDoc = {
        id: master.id, materialId: master.id, documentTypeId: draft.documentTypeId, revision: 1,
        createdIso: draft.createdIso, createdByUid: draft.createdByUid,
        updatedIso: draft.updatedIso, updatedByUid: draft.updatedByUid
      };
      assertValid(validateMaterialCategoryAssignment(categoryAssignment));
      assertValid(validateMaterialDocumentTypeAssignment(documentTypeAssignment));
      await tx.create('academy_materials', master.id, master);
      await tx.create('academy_material_drafts', master.id, draft);
      await tx.create('academy_material_category_assignments', master.id, categoryAssignment);
      await tx.create('academy_material_document_type_assignments', master.id, documentTypeAssignment);
    });
  }
  async saveMaterialDraft(
    materialId: string,
    draft: AcademyMaterialDraftDoc,
    expectedRevision: number,
    actorUid: string
  ): Promise<void> {
    if (!actorUid.trim() || draft.updatedByUid !== actorUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    assertValid(validateMaterialDraft(materialId, draft));
    if (!Number.isSafeInteger(expectedRevision) || draft.workingRevision !== expectedRevision + 1) {
      throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
    }
    return this.runTransaction(async tx => {
      const master = await tx.get<AcademyMaterialMasterDoc>('academy_materials', materialId);
      const existing = await tx.get<AcademyMaterialDraftDoc>('academy_material_drafts', materialId);
      if (!master || !existing) throw new Error('ACADEMY_MATERIAL_NOT_FOUND');
      assertValid(validateMaterialMaster(master));
      assertValid(validateMaterialDraft(materialId, existing));
      if (master.publicationStatus === 'archived') throw new Error('ACADEMY_MATERIAL_ARCHIVED');
      if (master.workingRevision !== expectedRevision || existing.workingRevision !== expectedRevision) {
        throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      }
      if (draft.createdIso !== existing.createdIso || draft.createdByUid !== existing.createdByUid) {
        throw new Error('ACADEMY_MATERIAL_DRAFT_AUDIT_MISMATCH');
      }
      const category = await tx.get<AcademyMaterialCategoryDoc>('academy_material_categories', draft.categoryId);
      const documentType = await tx.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', draft.documentTypeId);
      if (!category) throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_FOUND');
      if (!documentType) throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND');
      assertValid(validateMaterialCategory(category));
      assertValid(validateMaterialDocumentType(documentType));
      const categoryAssignment = await tx.get<AcademyMaterialCategoryAssignmentDoc>('academy_material_category_assignments', materialId);
      const documentTypeAssignment = await tx.get<AcademyMaterialDocumentTypeAssignmentDoc>('academy_material_document_type_assignments', materialId);
      if (categoryAssignment) assertValid(validateMaterialCategoryAssignment(categoryAssignment));
      if (documentTypeAssignment) assertValid(validateMaterialDocumentTypeAssignment(documentTypeAssignment));
      if (category.status !== 'active' && categoryAssignment?.categoryId !== draft.categoryId) {
        throw new Error('ACADEMY_MATERIAL_CATEGORY_NOT_ACTIVE');
      }
      if (documentType.status !== 'active' && documentTypeAssignment?.documentTypeId !== draft.documentTypeId) {
        throw new Error('ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_ACTIVE');
      }
      const nextCategoryAssignment: AcademyMaterialCategoryAssignmentDoc = {
        id: materialId, materialId, categoryId: draft.categoryId,
        revision: (categoryAssignment?.revision ?? 0) + (categoryAssignment?.categoryId === draft.categoryId ? 0 : 1),
        createdIso: categoryAssignment?.createdIso ?? draft.createdIso,
        createdByUid: categoryAssignment?.createdByUid ?? draft.createdByUid,
        updatedIso: draft.updatedIso, updatedByUid: actorUid
      };
      const nextDocumentTypeAssignment: AcademyMaterialDocumentTypeAssignmentDoc = {
        id: materialId, materialId, documentTypeId: draft.documentTypeId,
        revision: (documentTypeAssignment?.revision ?? 0) + (documentTypeAssignment?.documentTypeId === draft.documentTypeId ? 0 : 1),
        createdIso: documentTypeAssignment?.createdIso ?? draft.createdIso,
        createdByUid: documentTypeAssignment?.createdByUid ?? draft.createdByUid,
        updatedIso: draft.updatedIso, updatedByUid: actorUid
      };
      assertValid(validateMaterialCategoryAssignment(nextCategoryAssignment));
      assertValid(validateMaterialDocumentTypeAssignment(nextDocumentTypeAssignment));
      await tx.update('academy_material_drafts', materialId, draft);
      await tx.update('academy_materials', materialId, {
        ...master, workingRevision: draft.workingRevision, updatedIso: draft.updatedIso
      });
      if (categoryAssignment) {
        if (categoryAssignment.categoryId !== draft.categoryId) await tx.update('academy_material_category_assignments', materialId, nextCategoryAssignment);
      } else {
        await tx.create('academy_material_category_assignments', materialId, nextCategoryAssignment);
      }
      if (documentTypeAssignment) {
        if (documentTypeAssignment.documentTypeId !== draft.documentTypeId) await tx.update('academy_material_document_type_assignments', materialId, nextDocumentTypeAssignment);
      } else {
        await tx.create('academy_material_document_type_assignments', materialId, nextDocumentTypeAssignment);
      }
    });
  }
  async publishMaterialVersion(
    materialId: string,
    version: AcademyMaterialVersionDoc,
    nextMaster: AcademyMaterialMasterDoc,
    expectedRevision: number,
    publisherUid: string
  ): Promise<void> {
    if (!publisherUid.trim() || version.publishedByUid !== publisherUid) throw new Error('ACADEMY_ACTOR_MISMATCH');
    assertValid(validateMaterialVersion(materialId, version));
    assertValid(validateMaterialMaster(nextMaster));
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyMaterialMasterDoc>('academy_materials', materialId);
      if (!current) throw new Error('ACADEMY_MATERIAL_NOT_FOUND');
      assertValid(validateMaterialMaster(current));
      if (current.publicationStatus === 'archived') throw new Error('ACADEMY_MATERIAL_ARCHIVED');
      if (current.workingRevision !== expectedRevision || version.workingRevision !== expectedRevision ||
          current.lastPublishedWorkingRevision === expectedRevision) {
        throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      }
      const draft = await tx.get<AcademyMaterialDraftDoc>('academy_material_drafts', materialId);
      if (!draft || draft.workingRevision !== expectedRevision || !materialDraftMatchesVersion(draft, version)) {
        throw new Error('ACADEMY_MATERIAL_DRAFT_VERSION_MISMATCH');
      }
      const nextNumber = current.latestVersionNumber + 1;
      const versionId = materialId + '__v' + nextNumber;
      if (version.id !== versionId || version.versionNumber !== nextNumber ||
          nextMaster.id !== current.id || nextMaster.code !== current.code ||
          nextMaster.ownerUid !== current.ownerUid ||
          nextMaster.responsibleCourseCode !== current.responsibleCourseCode ||
          nextMaster.createdIso !== current.createdIso ||
          nextMaster.workingRevision !== current.workingRevision ||
          nextMaster.latestVersionNumber !== nextNumber ||
          nextMaster.currentPublishedVersionId !== versionId ||
          nextMaster.lastPublishedWorkingRevision !== expectedRevision ||
          nextMaster.publicationStatus !== 'published' ||
          !version.publishedIso || !version.publishedByUid) {
        throw new Error('ACADEMY_MATERIAL_VERSION_SEQUENCE_INVALID');
      }
      const category = await tx.get<AcademyMaterialCategoryDoc>('academy_material_categories', draft.categoryId);
      const documentType = await tx.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', draft.documentTypeId);
      const categoryAssignment = await tx.get<AcademyMaterialCategoryAssignmentDoc>('academy_material_category_assignments', materialId);
      const documentTypeAssignment = await tx.get<AcademyMaterialDocumentTypeAssignmentDoc>('academy_material_document_type_assignments', materialId);
      if (!category || !documentType || !categoryAssignment || !documentTypeAssignment) {
        throw new Error('ACADEMY_MATERIAL_METADATA_REFERENCE_MISSING');
      }
      assertValid(validateMaterialCategory(category));
      assertValid(validateMaterialDocumentType(documentType));
      assertValid(validateMaterialCategoryAssignment(categoryAssignment));
      assertValid(validateMaterialDocumentTypeAssignment(documentTypeAssignment));
      if (categoryAssignment.categoryId !== draft.categoryId || documentTypeAssignment.documentTypeId !== draft.documentTypeId) {
        throw new Error('ACADEMY_MATERIAL_METADATA_REFERENCE_MISSING');
      }
      const versionCategoryAssignment = {
        id: versionId, materialId, materialVersionId: versionId, categoryId: draft.categoryId,
        revision: 1, createdIso: version.createdIso, createdByUid: publisherUid,
        updatedIso: version.createdIso, updatedByUid: publisherUid
      };
      const versionDocumentTypeAssignment = {
        id: versionId, materialId, materialVersionId: versionId, documentTypeId: draft.documentTypeId,
        revision: 1, createdIso: version.createdIso, createdByUid: publisherUid,
        updatedIso: version.createdIso, updatedByUid: publisherUid
      };
      assertValid(validateMaterialCategoryAssignment(versionCategoryAssignment));
      assertValid(validateMaterialDocumentTypeAssignment(versionDocumentTypeAssignment));
      const [existingVersion, existingVersionCategoryAssignment, existingVersionDocumentTypeAssignment] = await Promise.all([
        tx.get<AcademyMaterialVersionDoc>('academy_material_versions', versionId),
        tx.get<AcademyMaterialCategoryAssignmentDoc>('academy_material_category_assignments', versionId),
        tx.get<AcademyMaterialDocumentTypeAssignmentDoc>('academy_material_document_type_assignments', versionId)
      ]);
      if (existingVersion || existingVersionCategoryAssignment || existingVersionDocumentTypeAssignment) {
        throw new Error('ACADEMY_MATERIAL_VERSION_ALREADY_EXISTS');
      }
      await tx.create('academy_material_versions', versionId, version);
      await tx.create('academy_material_category_assignments', versionId, versionCategoryAssignment);
      await tx.create('academy_material_document_type_assignments', versionId, versionDocumentTypeAssignment);
      await tx.update('academy_materials', materialId, nextMaster);
    });
  }
  async archiveMaterial(
    materialId: string,
    expectedRevision: number,
    actorUid: string,
    reason: string,
    now: string
  ): Promise<AcademyMaterialMasterDoc> {
    if (!actorUid.trim()) throw new Error('ACADEMY_ACTOR_REQUIRED');
    if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 1000) {
      throw new Error('ACADEMY_MATERIAL_ARCHIVE_REASON_INVALID');
    }
    return this.runTransaction(async tx => {
      const current = await tx.get<AcademyMaterialMasterDoc>('academy_materials', materialId);
      if (!current) throw new Error('ACADEMY_MATERIAL_NOT_FOUND');
      assertValid(validateMaterialMaster(current));
      if (current.publicationStatus === 'archived') throw new Error('ACADEMY_MATERIAL_ARCHIVED');
      if (current.workingRevision !== expectedRevision) throw new Error('ACADEMY_WORKING_REVISION_CONFLICT');
      const next: AcademyMaterialMasterDoc = {
        ...current, publicationStatus: 'archived',
        archivedIso: now, archivedByUid: actorUid, archiveReason: reason.trim(),
        updatedIso: now
      };
      assertValid(validateMaterialMaster(next));
      await tx.update('academy_materials', materialId, next);
      return next;
    });
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
      const existingDraft = await tx.get<AcademyCourseDraftDoc>('academy_course_drafts', master.id);
      if (existingDraft) throw new Error('ACADEMY_DOCUMENT_ALREADY_EXISTS');
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
      const existingDraft = await tx.get<AcademyProgramDraftDoc>('academy_program_drafts', master.id);
      if (existingDraft) throw new Error('ACADEMY_DOCUMENT_ALREADY_EXISTS');
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
      const materialReferences = draft.chapters.flatMap(chapter => chapter.materialReferences);
      const uniqueReferences = new Map(materialReferences.map(reference => [reference.materialId + '|' + reference.materialVersionId, reference]));
      for (const reference of uniqueReferences.values()) {
        const materialMaster = await tx.get<AcademyMaterialMasterDoc>('academy_materials', reference.materialId);
        const materialVersion = await tx.get<AcademyMaterialVersionDoc>('academy_material_versions', reference.materialVersionId);
        if (!materialMaster || materialMaster.publicationStatus === 'archived' ||
            !materialVersion || materialVersion.materialId !== reference.materialId ||
            materialVersion.id !== reference.materialVersionId || !materialVersion.publishedIso) {
          throw new Error('ACADEMY_COURSE_MATERIAL_VERSION_NOT_PUBLISHED');
        }
        assertValid(validateMaterialMaster(materialMaster));
        assertValid(validateMaterialVersion(reference.materialId, materialVersion));
      }
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
      const programParticipations = await tx.list<AcademyProgramParticipationDoc>('academy_program_participations', {
        where: [{ field: 'userUid', value: userUid }], limit: 1000
      });
      if (programParticipations.length >= 1000) throw new Error('ACADEMY_PROGRAM_PARTICIPATION_HISTORY_LIMIT');
      const pinnedVersionIds = [...new Set(programParticipations.flatMap(item =>
        item.requiredCoursePins.filter(pin => pin.courseId === courseId).map(pin => pin.courseVersionId)
      ))];
      if (pinnedVersionIds.length > 1) throw new Error('ACADEMY_PROGRAM_COURSE_VERSION_CONFLICT');

      const master = await tx.get<AcademyCourseMasterDoc>('academy_courses', courseId);
      if (!master) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      assertValid(validateCourseMaster(master));
      const pinnedVersionId = pinnedVersionIds[0];
      if (!pinnedVersionId &&
          (master.publicationStatus !== 'published' || master.availability !== 'available' || !master.currentPublishedVersionId)) {
        throw new Error('ACADEMY_COURSE_NOT_STARTABLE');
      }
      // A program participant may start the exact course version that was pinned at enrollment,
      // even if the catalog has since moved to a newer version or the course was archived.
      const targetVersionId = pinnedVersionId || master.currentPublishedVersionId!;
      const version = await tx.get<AcademyCourseVersionDoc>('academy_course_versions', targetVersionId);
      if (!version) throw new Error('ACADEMY_PUBLISHED_VERSION_MISSING');
      assertValid(validateCourseVersion(courseId, version));
      const existing = await tx.get<AcademyCourseParticipationDoc>('academy_course_participations', participationId);
      if (existing) {
        assertValid(validateCourseParticipation(existing));
        if (existing.courseVersionId !== version.id) throw new Error('ACADEMY_PROGRAM_COURSE_VERSION_CONFLICT');
        if (existing.status === 'voluntarily_ended' || existing.status === 'administratively_ended') {
          throw new Error('ACADEMY_PARTICIPATION_ALREADY_EXISTS');
        }
        throw new Error('ACADEMY_PARTICIPATION_ALREADY_EXISTS');
      }
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
  async startProgramParticipation(userUid: string, programId: string, now: string): Promise<AcademyProgramParticipationDoc> {
    if (!userUid.trim()) throw new Error('ACADEMY_PARTICIPANT_REQUIRED');
    const participationId = `program_participation_${encodeURIComponent(userUid)}_${encodeURIComponent(programId)}`;
    return this.runTransaction(async tx => {
      const program = await tx.get<AcademyProgramMasterDoc>('academy_programs', programId);
      if (!program) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
      assertValid(validateProgramMaster(program));
      if (program.publicationStatus !== 'published' || program.availability !== 'available' || !program.currentPublishedVersionId) {
        throw new Error('ACADEMY_PROGRAM_NOT_STARTABLE');
      }
      const version = await tx.get<AcademyProgramVersionDoc>('academy_program_versions', program.currentPublishedVersionId);
      if (!version) throw new Error('ACADEMY_PUBLISHED_VERSION_MISSING');
      assertValid(validateProgramVersion(programId, version));
      const existingProgramParticipation = await tx.get<AcademyProgramParticipationDoc>('academy_program_participations', participationId);
      if (existingProgramParticipation) throw new Error('ACADEMY_PROGRAM_PARTICIPATION_ALREADY_EXISTS');
      const otherProgramParticipations = await tx.list<AcademyProgramParticipationDoc>('academy_program_participations', {
        where: [{ field: 'userUid', value: userUid }], limit: 1000
      });
      if (otherProgramParticipations.length >= 1000) throw new Error('ACADEMY_PROGRAM_PARTICIPATION_HISTORY_LIMIT');

      const pins: AcademyProgramCoursePin[] = [];
      for (const reference of version.courseReferences.filter(item => item.requirement === 'required')) {
        const course = await tx.get<AcademyCourseMasterDoc>('academy_courses', reference.courseId);
        if (!course) throw new Error('ACADEMY_PROGRAM_REQUIRED_COURSE_MISSING');
        assertValid(validateCourseMaster(course));
        if (course.publicationStatus !== 'published' || course.availability !== 'available' || !course.currentPublishedVersionId) {
          throw new Error('ACADEMY_PROGRAM_REQUIRED_COURSE_NOT_STARTABLE');
        }
        const courseVersion = await tx.get<AcademyCourseVersionDoc>('academy_course_versions', course.currentPublishedVersionId);
        if (!courseVersion) throw new Error('ACADEMY_PUBLISHED_VERSION_MISSING');
        assertValid(validateCourseVersion(course.id, courseVersion));
        const conflictingProgramPin = otherProgramParticipations.some(item =>
          item.requiredCoursePins.some(pin => pin.courseId === course.id && pin.courseVersionId !== courseVersion.id)
        );
        if (conflictingProgramPin) throw new Error('ACADEMY_PROGRAM_COURSE_VERSION_CONFLICT');
        const courseParticipationId = `participation_${encodeURIComponent(userUid)}_${encodeURIComponent(course.id)}`;
        const existing = await tx.get<AcademyCourseParticipationDoc>('academy_course_participations', courseParticipationId);
        if (existing) {
          assertValid(validateCourseParticipation(existing));
          if (existing.courseVersionId !== courseVersion.id) throw new Error('ACADEMY_PROGRAM_COURSE_VERSION_CONFLICT');
          if (existing.status === 'voluntarily_ended' || existing.status === 'administratively_ended') {
            throw new Error('ACADEMY_PROGRAM_COURSE_PARTICIPATION_ENDED');
          }
        }
        // Pin the stable participation identity without creating a course participation.
        // A course is only "started" after the participant explicitly starts that course.
        pins.push({ courseId: course.id, courseVersionId: courseVersion.id, courseParticipationId });
      }
      const participation: AcademyProgramParticipationDoc = {
        id: participationId, userUid, programId, programVersionId: version.id,
        requiredCoursePins: pins, createdIso: now, updatedIso: now
      };
      assertValid(validateProgramParticipation(participation));
      await tx.create('academy_program_participations', participation.id, participation);
      return participation;
    });
  }
  async getProgramParticipation(participationId: string): Promise<AcademyProgramParticipationDoc | null> {
    return this.adapter.get<AcademyProgramParticipationDoc>('academy_program_participations', participationId);
  }
  async listOwnProgramParticipations(userUid: string): Promise<AcademyProgramParticipationDoc[]> {
    if (!userUid.trim()) throw new Error('ACADEMY_PARTICIPANT_REQUIRED');
    return this.adapter.list<AcademyProgramParticipationDoc>('academy_program_participations', {
      where: [{ field: 'userUid', value: userUid }], limit: 1000
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
