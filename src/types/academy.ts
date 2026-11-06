import type { OfficerRole } from './portal.ts';

/**
 * Fachliche Academy-Domänenmodelle.
 *
 * Master-Datensätze enthalten stabile Identität und Lebenszyklussteuerung.
 * Versionen sind unveränderliche fachliche Snapshots; Teilnahmen pinnen eine
 * konkrete Kursversion. Persönliche Notizen sind ausschließlich serverseitig
 * zu speichern und dürfen nie Bestandteil des öffentlichen Portal-State sein.
 */

export type AcademyPublicationStatus = 'draft' | 'published' | 'archived';
export type AcademyAvailability = 'available' | 'unavailable';
export type AcademyParticipationStatus =
  | 'in_progress'
  | 'completed'
  | 'voluntarily_ended'
  | 'administratively_ended';
export type AcademyProgramCourseRequirement = 'required' | 'recommended';
export type AcademyMaterialCategoryStatus = 'active' | 'archived';

export interface AcademyMaterialCategoryDoc {
  id: string;
  name: string;
  description?: string;
  status: AcademyMaterialCategoryStatus;
  revision: number;
  createdIso: string;
  createdByUid: string;
  updatedIso: string;
  updatedByUid: string;
  archivedIso?: string;
  archivedByUid?: string;
}

/** Stable material-to-category link; id is the material master ID. */
export interface AcademyMaterialCategoryAssignmentDoc {
  id: string;
  materialId: string;
  categoryId: string;
  /** Set only for immutable references retained by a published material version. */
  materialVersionId?: string;
  revision: number;
  createdIso: string;
  createdByUid: string;
  updatedIso: string;
  updatedByUid: string;
}

export type AcademyMaterialDocumentTypeStatus = 'active' | 'archived';

export interface AcademyMaterialDocumentTypeDoc {
  id: string;
  name: string;
  description?: string;
  status: AcademyMaterialDocumentTypeStatus;
  revision: number;
  createdIso: string;
  createdByUid: string;
  updatedIso: string;
  updatedByUid: string;
  archivedIso?: string;
  archivedByUid?: string;
}

/** Stable material-to-document-type link; id is the material master ID. */
export interface AcademyMaterialDocumentTypeAssignmentDoc {
  id: string;
  materialId: string;
  documentTypeId: string;
  /** Set only for immutable references retained by a published material version. */
  materialVersionId?: string;
  revision: number;
  createdIso: string;
  createdByUid: string;
  updatedIso: string;
  updatedByUid: string;
}

export type AcademyMaterialContentFormat = 'markdown' | 'code';

export interface AcademyMaterialMasterDoc {
  id: string;
  code: string;
  ownerUid: string;
  /** Separate course scope used for delegated instructor permissions; never the generated material code. */
  responsibleCourseCode?: string;
  publicationStatus: AcademyPublicationStatus;
  currentPublishedVersionId?: string;
  latestVersionNumber: number;
  workingRevision: number;
  lastPublishedWorkingRevision?: number;
  createdIso: string;
  updatedIso: string;
  archivedIso?: string;
  archivedByUid?: string;
  archiveReason?: string;
}

export interface AcademyMaterialDraftDoc {
  id: string;
  materialId: string;
  title: string;
  description?: string;
  categoryId: string;
  documentTypeId: string;
  requiredRole?: OfficerRole;
  contentFormat: AcademyMaterialContentFormat;
  content: string;
  /** Optional syntax-highlighting hint; code is stored only and is never executed. */
  codeLanguage?: string;
  workingRevision: number;
  createdIso: string;
  createdByUid: string;
  updatedIso: string;
  updatedByUid: string;
}

export interface AcademyMaterialVersionDoc {
  id: string;
  materialId: string;
  versionNumber: number;
  title: string;
  description?: string;
  categoryId: string;
  documentTypeId: string;
  requiredRole?: OfficerRole;
  contentFormat: AcademyMaterialContentFormat;
  content: string;
  codeLanguage?: string;
  publishedIso: string;
  publishedByUid: string;
  createdIso: string;
  createdByUid: string;
  workingRevision: number;
}

export type AcademyMaterialReaderContent = Pick<AcademyMaterialVersionDoc, 'title' | 'description' | 'contentFormat' | 'content' | 'codeLanguage'>;

export interface AcademyMaterialVersionSummary {
  id: string;
  materialId: string;
  versionNumber: number;
  title: string;
  contentFormat: AcademyMaterialContentFormat;
  publishedIso: string;
  publishedByUid: string;
}

export interface AcademyMaterialListItem {
  master: AcademyMaterialMasterDoc;
  draft: Pick<AcademyMaterialDraftDoc, 'title' | 'categoryId' | 'documentTypeId' | 'contentFormat' | 'workingRevision' | 'updatedIso'> | null;
  currentVersion: AcademyMaterialVersionSummary | null;
}

export type AcademyCompletionEvidenceType =
  | 'required_chapter'
  | 'required_material'
  | 'required_assessment'
  | 'practical_task'
  | 'instructor_confirmation'
  | 'accepted_self_confirmation';

export interface AcademyLearningObjective {
  id: string;
  description: string;
}

export interface AcademyCourseMaterialReference {
  materialId: string;
  materialVersionId: string;
  required: boolean;
  order: number;
}

export interface AcademyCourseChapter {
  id: string;
  title: string;
  description?: string;
  materialReferences: AcademyCourseMaterialReference[];
  required: boolean;
  order: number;
}

export interface AcademyCourseMaterialReaderItem {
  chapterId: string; chapterTitle: string; chapterOrder: number;
  materialId: string; materialVersionId: string; required: boolean; order: number;
  accessStatus: 'available' | 'restricted' | 'unavailable';
  materialCode?: string; title?: string; versionNumber?: number; contentFormat?: AcademyMaterialContentFormat;
}

export interface AcademyCourseCompletionRequirement {
  id: string;
  type: AcademyCompletionEvidenceType;
  targetId: string;
  required: boolean;
  description?: string;
}

export interface AcademyCourseMasterDoc {
  id: string;
  code: string;
  ownerUid: string;
  publicationStatus: AcademyPublicationStatus;
  availability: AcademyAvailability;
  currentPublishedVersionId?: string;
  latestVersionNumber: number;
  workingRevision: number;
  createdIso: string;
  updatedIso: string;
  archivedIso?: string;
  archivedByUid?: string;
  archiveReason?: string;
}

export interface AcademyCourseDraftDoc {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  learningObjectives: AcademyLearningObjective[];
  chapters: AcademyCourseChapter[];
  completionRequirements: AcademyCourseCompletionRequirement[];
  workingRevision: number;
  updatedIso: string;
  updatedByUid: string;
}

export interface AcademyProgramDraftDoc {
  id: string;
  programId: string;
  title: string;
  summary: string;
  learningObjectives: AcademyLearningObjective[];
  courseReferences: AcademyProgramCourseReference[];
  workingRevision: number;
  updatedIso: string;
  updatedByUid: string;
}

export interface AcademyCourseVersionDoc {
  id: string;
  courseId: string;
  versionNumber: number;
  title: string;
  summary: string;
  learningObjectives: AcademyLearningObjective[];
  chapters: AcademyCourseChapter[];
  completionRequirements: AcademyCourseCompletionRequirement[];
  publishedIso?: string;
  publishedByUid?: string;
  createdIso: string;
  createdByUid: string;
  /** Revision des bearbeiteten Entwurfs; schützt vor Lost Updates. */
  workingRevision: number;
}

export interface AcademyProgramCourseReference {
  courseId: string;
  requirement: AcademyProgramCourseRequirement;
  order: number;
}

export interface AcademyProgramMasterDoc {
  id: string;
  code: string;
  ownerUid: string;
  publicationStatus: AcademyPublicationStatus;
  availability: AcademyAvailability;
  currentPublishedVersionId?: string;
  latestVersionNumber: number;
  workingRevision: number;
  createdIso: string;
  updatedIso: string;
  archivedIso?: string;
  archivedByUid?: string;
  archiveReason?: string;
}

export interface AcademyProgramVersionDoc {
  id: string;
  programId: string;
  versionNumber: number;
  title: string;
  summary: string;
  learningObjectives: AcademyLearningObjective[];
  courseReferences: AcademyProgramCourseReference[];
  publishedIso?: string;
  publishedByUid?: string;
  createdIso: string;
  createdByUid: string;
  workingRevision: number;
}

export interface AcademyCourseParticipationDoc {
  id: string;
  userUid: string;
  courseId: string;
  courseVersionId: string;
  status: AcademyParticipationStatus;
  startedIso?: string;
  lastActivityIso?: string;
  completedIso?: string;
  endedIso?: string;
  endedByUid?: string;
  endReason?: string;
  createdIso: string;
  updatedIso: string;
}

export interface AcademyProgressEvidenceDoc {
  id: string;
  participationId: string;
  requirementId: string;
  evidenceType: AcademyCompletionEvidenceType;
  sourceId: string;
  recordedByUid: string;
  recordedIso: string;
  details?: string;
}

export interface AcademyCompletionCorrectionDoc {
  id: string;
  participationId: string;
  previousStatus: AcademyParticipationStatus;
  correctedStatus: AcademyParticipationStatus;
  reason: string;
  actorUid: string;
  correctedIso: string;
  /** Evidence remains append-only; corrections may explicitly invalidate selected records. */
  invalidatedEvidenceIds?: string[];
}

export interface AcademyProgramCoursePin {
  courseId: string;
  courseVersionId: string;
  courseParticipationId: string;
}

export interface AcademyProgramParticipationDoc {
  id: string;
  userUid: string;
  programId: string;
  programVersionId: string;
  /** Required courses only; each pin binds the program to an exact course version and participation. */
  requiredCoursePins: AcademyProgramCoursePin[];
  createdIso: string;
  updatedIso: string;
}

export interface AcademyPrivateNoteDoc {
  id: string;
  ownerUid: string;
  materialId: string;
  materialVersionId: string;
  kind: 'note' | 'bookmark';
  title?: string;
  content?: string;
  tags: string[];
  /** Page/text anchoring intentionally omitted until a stable PDF anchor strategy is selected. */
  createdIso: string;
  updatedIso: string;
}
