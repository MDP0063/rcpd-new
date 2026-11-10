import type { AcademyMaterialCategoryDoc, AcademyMaterialCategoryAssignmentDoc, AcademyMaterialDocumentTypeDoc, AcademyMaterialDocumentTypeAssignmentDoc, AcademyMaterialMasterDoc, AcademyMaterialDraftDoc, AcademyMaterialVersionDoc, AcademyCourseMasterDoc, AcademyCourseDraftDoc, AcademyCourseVersionDoc, AcademyProgramMasterDoc, AcademyProgramDraftDoc, AcademyProgramVersionDoc, AcademyCourseParticipationDoc, AcademyProgramParticipationDoc, AcademyProgressEvidenceDoc, AcademyCompletionCorrectionDoc, AcademyPrivateNoteDoc, AcademyRepositoryBackupSnapshot } from '../src/types/academy.ts';

export const ACADEMY_COLLECTIONS = [
  'academy_material_categories',
  'academy_material_category_assignments',
  'academy_material_document_types',
  'academy_material_document_type_assignments',
  'academy_materials',
  'academy_material_drafts',
  'academy_material_versions',
  'academy_courses',
  'academy_course_drafts',
  'academy_course_versions',
  'academy_programs',
  'academy_program_drafts',
  'academy_program_versions',
  'academy_course_participations',
  'academy_program_participations',
  'academy_progress_evidence',
  'academy_completion_corrections',
  'academy_private_notes'
] as const;
export type AcademyCollection = typeof ACADEMY_COLLECTIONS[number];
export const ACADEMY_BACKUP_COLLECTIONS = [
  'academy_material_categories',
  'academy_material_category_assignments',
  'academy_material_document_types',
  'academy_material_document_type_assignments',
  'academy_materials',
  'academy_material_drafts',
  'academy_material_versions',
  'academy_courses',
  'academy_course_drafts',
  'academy_course_versions',
  'academy_programs',
  'academy_program_drafts',
  'academy_program_versions',
  'academy_course_participations',
  'academy_program_participations',
  'academy_progress_evidence',
  'academy_completion_corrections'
] as const;
export type AcademyBackupCollection = typeof ACADEMY_BACKUP_COLLECTIONS[number];
export type { AcademyRepositoryBackupSnapshot };
export interface AcademyDocument { id: string }
export interface AcademyFilter { field: string; value: string | number | boolean | null }
export interface AcademyQuery { where?: readonly AcademyFilter[]; limit?: number; offset?: number; orderBy?: string; orderDirection?: 'asc' | 'desc' }
export interface AcademyTransaction {
  get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null>;
  list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query?: AcademyQuery): Promise<T[]>;
  create<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void>;
  update<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void>;
  delete(collection: AcademyCollection, id: string): Promise<void>;
}
export interface AcademyStorageAdapter {
  get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null>;
  list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query?: AcademyQuery): Promise<T[]>;
  runTransaction<T>(operation: (transaction: AcademyTransaction) => Promise<T>): Promise<T>;
  exportSnapshot(): Promise<AcademyRepositoryBackupSnapshot>;
  replaceSnapshot(snapshot: AcademyRepositoryBackupSnapshot): Promise<void>;
  setMaintenanceMode(enabled: boolean): Promise<void>;
  anonymizeUser(uid: string, anonymizedUid: string, identityNames?: readonly string[]): Promise<void>;
}
export interface AcademyDocumentMap {
  academy_material_categories: AcademyMaterialCategoryDoc;
  academy_material_category_assignments: AcademyMaterialCategoryAssignmentDoc;
  academy_material_document_types: AcademyMaterialDocumentTypeDoc;
  academy_material_document_type_assignments: AcademyMaterialDocumentTypeAssignmentDoc;
  academy_materials: AcademyMaterialMasterDoc;
  academy_material_drafts: AcademyMaterialDraftDoc;
  academy_material_versions: AcademyMaterialVersionDoc;
  academy_courses: AcademyCourseMasterDoc;
  academy_course_drafts: AcademyCourseDraftDoc;
  academy_course_versions: AcademyCourseVersionDoc;
  academy_programs: AcademyProgramMasterDoc;
  academy_program_drafts: AcademyProgramDraftDoc;
  academy_program_versions: AcademyProgramVersionDoc;
  academy_course_participations: AcademyCourseParticipationDoc;
  academy_program_participations: AcademyProgramParticipationDoc;
  academy_progress_evidence: AcademyProgressEvidenceDoc;
  academy_completion_corrections: AcademyCompletionCorrectionDoc;
  academy_private_notes: AcademyPrivateNoteDoc;
}
