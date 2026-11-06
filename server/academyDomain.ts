import type {
  AcademyCourseMasterDoc,
  AcademyCourseDraftDoc,
  AcademyCourseVersionDoc,
  AcademyProgramMasterDoc,
  AcademyProgramDraftDoc,
  AcademyProgramVersionDoc,
  AcademyCourseParticipationDoc,
  AcademyProgressEvidenceDoc,
  AcademyCompletionCorrectionDoc,
  AcademyProgramParticipationDoc,
  AcademyPrivateNoteDoc,
  AcademyMaterialCategoryDoc,
  AcademyMaterialCategoryAssignmentDoc,
  AcademyMaterialDocumentTypeDoc,
  AcademyMaterialDocumentTypeAssignmentDoc,
  AcademyMaterialMasterDoc,
  AcademyMaterialDraftDoc,
  AcademyMaterialVersionDoc
} from '../src/types/academy.ts';

export type AcademyValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

function invalid(code: string, message: string): AcademyValidationResult {
  return { ok: false, code, message };
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasUniqueIds(values: Array<{ id: string }>): boolean {
  return new Set(values.map(value => value.id)).size === values.length;
}

export function validateMaterialCategoryAssignment(
  assignment: AcademyMaterialCategoryAssignmentDoc
): AcademyValidationResult {
  if (!isRecord(assignment) || !isNonEmpty(assignment.id) ||
      !isNonEmpty(assignment.materialId) || !isNonEmpty(assignment.categoryId) ||
      (assignment.materialVersionId !== undefined
        ? (!isNonEmpty(assignment.materialVersionId) || assignment.id !== assignment.materialVersionId || !assignment.materialVersionId.startsWith(assignment.materialId + '__'))
        : assignment.id !== assignment.materialId) ||
      !Number.isSafeInteger(assignment.revision) || assignment.revision < 1 ||
      !isNonEmpty(assignment.createdIso) || !isNonEmpty(assignment.createdByUid) ||
      !isNonEmpty(assignment.updatedIso) || !isNonEmpty(assignment.updatedByUid)) {
    return invalid('ACADEMY_MATERIAL_CATEGORY_ASSIGNMENT_INVALID', 'Material-Kategorie-Zuordnung und Änderungsmetadaten müssen gültig sein.');
  }
  return { ok: true };
}

export function validateMaterialCategory(category: AcademyMaterialCategoryDoc): AcademyValidationResult {
  if (!isRecord(category) || !isNonEmpty(category.id) || !isNonEmpty(category.name) ||
      category.name.trim().length > 80 || !['active', 'archived'].includes(category.status) ||
      !Number.isSafeInteger(category.revision) || category.revision < 1 ||
      !isNonEmpty(category.createdIso) || !isNonEmpty(category.createdByUid) ||
      !isNonEmpty(category.updatedIso) || !isNonEmpty(category.updatedByUid)) {
    return invalid('ACADEMY_MATERIAL_CATEGORY_INVALID', 'Kategorie, Name, Status, Revision und Änderungsmetadaten müssen gültig sein.');
  }
  if (category.description !== undefined &&
      (typeof category.description !== 'string' || category.description.length > 300)) {
    return invalid('ACADEMY_MATERIAL_CATEGORY_DESCRIPTION_INVALID', 'Die Kategorienbeschreibung darf höchstens 300 Zeichen enthalten.');
  }
  if (category.status === 'archived' &&
      (!isNonEmpty(category.archivedIso) || !isNonEmpty(category.archivedByUid))) {
    return invalid('ACADEMY_MATERIAL_CATEGORY_ARCHIVE_AUDIT_MISSING', 'Eine archivierte Kategorie benötigt Zeitpunkt und verantwortliche Person.');
  }
  if (category.status === 'active' && (category.archivedIso !== undefined || category.archivedByUid !== undefined)) {
    return invalid('ACADEMY_MATERIAL_CATEGORY_ARCHIVE_STATE_INVALID', 'Eine aktive Kategorie darf keine Archivierungsmetadaten enthalten.');
  }
  return { ok: true };
}

export function validateMaterialDocumentTypeAssignment(
  assignment: AcademyMaterialDocumentTypeAssignmentDoc
): AcademyValidationResult {
  if (!isRecord(assignment) || !isNonEmpty(assignment.id) ||
      !isNonEmpty(assignment.materialId) || !isNonEmpty(assignment.documentTypeId) ||
      (assignment.materialVersionId !== undefined
        ? (!isNonEmpty(assignment.materialVersionId) || assignment.id !== assignment.materialVersionId || !assignment.materialVersionId.startsWith(assignment.materialId + '__'))
        : assignment.id !== assignment.materialId) ||
      !Number.isSafeInteger(assignment.revision) || assignment.revision < 1 ||
      !isNonEmpty(assignment.createdIso) || !isNonEmpty(assignment.createdByUid) ||
      !isNonEmpty(assignment.updatedIso) || !isNonEmpty(assignment.updatedByUid)) {
    return invalid('ACADEMY_MATERIAL_DOCUMENT_TYPE_ASSIGNMENT_INVALID', 'Material-Dokumenttyp-Zuordnung und Änderungsmetadaten müssen gültig sein.');
  }
  return { ok: true };
}

export function validateMaterialDocumentType(documentType: AcademyMaterialDocumentTypeDoc): AcademyValidationResult {
  if (!isRecord(documentType) || !isNonEmpty(documentType.id) || !isNonEmpty(documentType.name) ||
      documentType.name.trim().length > 80 || !['active', 'archived'].includes(documentType.status) ||
      !Number.isSafeInteger(documentType.revision) || documentType.revision < 1 ||
      !isNonEmpty(documentType.createdIso) || !isNonEmpty(documentType.createdByUid) ||
      !isNonEmpty(documentType.updatedIso) || !isNonEmpty(documentType.updatedByUid)) {
    return invalid('ACADEMY_MATERIAL_DOCUMENT_TYPE_INVALID', 'Dokumenttyp, Name, Status, Revision und Änderungsmetadaten müssen gültig sein.');
  }
  if (documentType.description !== undefined &&
      (typeof documentType.description !== 'string' || documentType.description.length > 300)) {
    return invalid('ACADEMY_MATERIAL_DOCUMENT_TYPE_DESCRIPTION_INVALID', 'Die Dokumenttypbeschreibung darf höchstens 300 Zeichen enthalten.');
  }
  if (documentType.status === 'archived' &&
      (!isNonEmpty(documentType.archivedIso) || !isNonEmpty(documentType.archivedByUid))) {
    return invalid('ACADEMY_MATERIAL_DOCUMENT_TYPE_ARCHIVE_AUDIT_MISSING', 'Ein archivierter Dokumenttyp benötigt Zeitpunkt und verantwortliche Person.');
  }
  if (documentType.status === 'active' && (documentType.archivedIso !== undefined || documentType.archivedByUid !== undefined)) {
    return invalid('ACADEMY_MATERIAL_DOCUMENT_TYPE_ARCHIVE_STATE_INVALID', 'Ein aktiver Dokumenttyp darf keine Archivierungsmetadaten enthalten.');
  }
  return { ok: true };
}


const materialRoles = new Set(['admin', 'colonel', 'officer', 'rookie', 'trainee']);
const materialContentMaxLength = 200_000;

function validateMaterialContentFields(material: {
  title: string;
  description?: string;
  categoryId: string;
  documentTypeId: string;
  requiredRole?: string;
  contentFormat: string;
  content: string;
  codeLanguage?: string;
}): AcademyValidationResult {
  if (!isNonEmpty(material.title) || material.title.trim().length > 200) {
    return invalid('ACADEMY_MATERIAL_TITLE_INVALID', 'Der Materialtitel muss zwischen 1 und 200 Zeichen enthalten.');
  }
  if (material.description !== undefined &&
      (typeof material.description !== 'string' || material.description.length > 2000)) {
    return invalid('ACADEMY_MATERIAL_DESCRIPTION_INVALID', 'Die optionale Beschreibung darf höchstens 2.000 Zeichen enthalten.');
  }
  if (!isNonEmpty(material.categoryId) || !isNonEmpty(material.documentTypeId)) {
    return invalid('ACADEMY_MATERIAL_METADATA_REQUIRED', 'Kategorie und Dokumenttyp sind Pflichtangaben.');
  }
  if (material.requiredRole !== undefined && !materialRoles.has(material.requiredRole)) {
    return invalid('ACADEMY_MATERIAL_REQUIRED_ROLE_INVALID', 'Der erforderliche Rang ist ungültig.');
  }
  if (!['markdown', 'code'].includes(material.contentFormat)) {
    return invalid('ACADEMY_MATERIAL_FORMAT_INVALID', 'Das Inhaltsformat muss Markdown oder Code sein.');
  }
  if (typeof material.content !== 'string' || !material.content.trim() || material.content.length > materialContentMaxLength) {
    return invalid('ACADEMY_MATERIAL_CONTENT_INVALID', 'Der Inhalt muss Text enthalten und darf höchstens 200.000 Zeichen umfassen.');
  }
  if (material.codeLanguage !== undefined &&
      (material.contentFormat !== 'code' || typeof material.codeLanguage !== 'string' ||
       material.codeLanguage.length > 40 || !/^[A-Za-z0-9_+#.-]{1,40}$/.test(material.codeLanguage))) {
    return invalid('ACADEMY_MATERIAL_CODE_LANGUAGE_INVALID', 'Die optionale Sprachkennung ist ungültig.');
  }
  return { ok: true };
}

export function validateMaterialMaster(master: AcademyMaterialMasterDoc): AcademyValidationResult {
  if (!isRecord(master) || !isNonEmpty(master.id) || !isNonEmpty(master.code) ||
      !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(master.code) || !isNonEmpty(master.ownerUid) ||
      !['draft', 'published', 'archived'].includes(master.publicationStatus) ||
      !Number.isSafeInteger(master.latestVersionNumber) || master.latestVersionNumber < 0 ||
      !Number.isSafeInteger(master.workingRevision) || master.workingRevision < 1 ||
      !isNonEmpty(master.createdIso) || !isNonEmpty(master.updatedIso)) {
    return invalid('ACADEMY_MATERIAL_MASTER_INVALID', 'Materialstamm, Kennung, Status, Revision und Änderungsmetadaten müssen gültig sein.');
  }
  if (master.responsibleCourseCode !== undefined &&
      (typeof master.responsibleCourseCode !== 'string' || !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(master.responsibleCourseCode))) {
    return invalid('ACADEMY_MATERIAL_COURSE_SCOPE_INVALID', 'Die Kurszuständigkeit muss eine gültige Kurskennung sein.');
  }
  if (master.publicationStatus === 'published' &&
      (!isNonEmpty(master.currentPublishedVersionId) || master.latestVersionNumber < 1)) {
    return invalid('ACADEMY_MATERIAL_PUBLISHED_VERSION_MISSING', 'Ein veröffentlichtes Material benötigt eine konkrete veröffentlichte Version.');
  }
  if (master.lastPublishedWorkingRevision !== undefined &&
      (!Number.isSafeInteger(master.lastPublishedWorkingRevision) || master.lastPublishedWorkingRevision < 1 ||
       master.lastPublishedWorkingRevision > master.workingRevision || master.latestVersionNumber < 1)) {
    return invalid('ACADEMY_MATERIAL_PUBLISHED_REVISION_INVALID', 'Die zuletzt veröffentlichte Arbeitsrevision ist ungültig.');
  }
  if (master.publicationStatus === 'archived' &&
      (!isNonEmpty(master.archivedIso) || !isNonEmpty(master.archivedByUid) ||
       !isNonEmpty(master.archiveReason) || master.archiveReason.length > 1000)) {
    return invalid('ACADEMY_MATERIAL_ARCHIVE_AUDIT_MISSING', 'Ein archiviertes Material benötigt Zeitpunkt, verantwortliche Person und Begründung.');
  }
  if (master.publicationStatus !== 'archived' &&
      (master.archivedIso !== undefined || master.archivedByUid !== undefined || master.archiveReason !== undefined)) {
    return invalid('ACADEMY_MATERIAL_ARCHIVE_STATE_INVALID', 'Nur archivierte Materialien dürfen Archivierungsmetadaten enthalten.');
  }
  return { ok: true };
}

export function validateMaterialDraft(materialId: string, draft: AcademyMaterialDraftDoc): AcademyValidationResult {
  if (!isRecord(draft) || !isNonEmpty(materialId) || draft.id !== materialId || draft.materialId !== materialId ||
      !Number.isSafeInteger(draft.workingRevision) || draft.workingRevision < 1 ||
      !isNonEmpty(draft.createdIso) || !isNonEmpty(draft.createdByUid) ||
      !isNonEmpty(draft.updatedIso) || !isNonEmpty(draft.updatedByUid)) {
    return invalid('ACADEMY_MATERIAL_DRAFT_INVALID', 'Materialentwurf, Revision und Änderungsmetadaten müssen gültig sein.');
  }
  return validateMaterialContentFields(draft);
}

export function validateMaterialVersion(materialId: string, version: AcademyMaterialVersionDoc): AcademyValidationResult {
  if (!isRecord(version) || !isNonEmpty(materialId) || version.materialId !== materialId ||
      !isNonEmpty(version.id) || !Number.isSafeInteger(version.versionNumber) || version.versionNumber < 1 ||
      !Number.isSafeInteger(version.workingRevision) || version.workingRevision < 1 ||
      !isNonEmpty(version.publishedIso) || !isNonEmpty(version.publishedByUid) ||
      !isNonEmpty(version.createdIso) || !isNonEmpty(version.createdByUid) ||
      version.id !== materialId + '__v' + version.versionNumber) {
    return invalid('ACADEMY_MATERIAL_VERSION_INVALID', 'Materialversion, Versionskennung und Veröffentlichungsmetadaten müssen gültig sein.');
  }
  return validateMaterialContentFields(version);
}

export function validateCourseVersion(
  courseId: string,
  version: AcademyCourseVersionDoc
): AcademyValidationResult {
  if (!isRecord(version) || !isNonEmpty(courseId) || version.courseId !== courseId) {
    return invalid('ACADEMY_COURSE_VERSION_OWNER_MISMATCH', 'Die Kursversion gehört nicht zu diesem Kurs.');
  }
  if (!isNonEmpty(version.title) || version.title.trim().length > 200) {
    return invalid('ACADEMY_COURSE_TITLE_INVALID', 'Der Kurstitel muss zwischen 1 und 200 Zeichen lang sein.');
  }
  if (!Number.isSafeInteger(version.versionNumber) || version.versionNumber < 1) {
    return invalid('ACADEMY_COURSE_VERSION_INVALID', 'Die Kursversionsnummer ist ungültig.');
  }
  if (!Array.isArray(version.learningObjectives) || !version.learningObjectives.every(value => isRecord(value)) ||
      !Array.isArray(version.chapters) || !version.chapters.every(value => isRecord(value)) ||
      !Array.isArray(version.completionRequirements) || !version.completionRequirements.every(value => isRecord(value))) {
    return invalid('ACADEMY_COURSE_STRUCTURE_INVALID', 'Lernziele, Kapitel und Abschlussbedingungen müssen gültige Listen sein.');
  }
  if (!hasUniqueIds(version.learningObjectives) ||
      !hasUniqueIds(version.chapters) ||
      !hasUniqueIds(version.completionRequirements)) {
    return invalid('ACADEMY_COURSE_DUPLICATE_CHILD_ID', 'Lernziele, Kapitel und Abschlussbedingungen benötigen eindeutige IDs.');
  }
  if (version.learningObjectives.some(objective =>
    !isNonEmpty(objective.id) || !isNonEmpty(objective.description) || objective.description.length > 500
  )) {
    return invalid('ACADEMY_COURSE_OBJECTIVE_INVALID', 'Jedes Lernziel benötigt eine ID und eine konkrete Beschreibung (maximal 500 Zeichen).');
  }
  for (const chapter of version.chapters) {
    if (!isNonEmpty(chapter.id) || !isNonEmpty(chapter.title) ||
        chapter.title.length > 200 ||
        (chapter.description !== undefined && chapter.description.length > 1000) ||
        !Array.isArray(chapter.materialReferences) || !chapter.materialReferences.every(value => isRecord(value)) ||
        typeof chapter.required !== 'boolean' ||
        !Number.isSafeInteger(chapter.order) || chapter.order < 0) {
      return invalid('ACADEMY_COURSE_CHAPTER_INVALID', 'Jedes Kapitel benötigt gültige ID, Titel, Reihenfolge, Pflichtstatus und Materialliste.');
    }
    const refs = chapter.materialReferences;
    if (new Set(refs.map(ref => ref.materialId)).size !== refs.length) {
      return invalid('ACADEMY_COURSE_DUPLICATE_MATERIAL', 'Ein Material darf innerhalb eines Kapitels nur einmal referenziert werden.');
    }
    if (refs.some(ref =>
      !isNonEmpty(ref.materialId) ||
      !isNonEmpty(ref.materialVersionId) ||
      typeof ref.required !== 'boolean' ||
      !Number.isSafeInteger(ref.order) || ref.order < 0
    )) {
      return invalid('ACADEMY_COURSE_MATERIAL_VERSION_REQUIRED', 'Kursmaterialien müssen auf eine konkrete Materialversion verweisen und gültige Reihenfolgen besitzen.');
    }
  }
  const allowedEvidenceTypes = new Set([
    'required_chapter',
    'required_material',
    'required_assessment',
    'practical_task',
    'instructor_confirmation',
    'accepted_self_confirmation'
  ]);
  if (version.completionRequirements.some(requirement =>
    !isNonEmpty(requirement.id) ||
    !isNonEmpty(requirement.targetId) ||
    !allowedEvidenceTypes.has(requirement.type) ||
    typeof requirement.required !== 'boolean' ||
    (requirement.description !== undefined && requirement.description.length > 1000)
  )) {
    return invalid('ACADEMY_COURSE_COMPLETION_REQUIREMENT_INVALID', 'Abschlussbedingungen benötigen einen gültigen Typ, ein Ziel und einen Pflichtstatus.');
  }
  if (version.completionRequirements.some(requirement =>
    (requirement.type === 'required_chapter' && !version.chapters.some(chapter => chapter.id === requirement.targetId)) ||
    (requirement.type === 'required_material' && !version.chapters.some(chapter =>
      chapter.materialReferences.some(reference => reference.materialId === requirement.targetId)
    ))
  )) {
    return invalid('ACADEMY_COURSE_COMPLETION_TARGET_MISSING', 'Kapitel- und Material-Abschlussbedingungen müssen auf tatsächlich enthaltene Kursinhalte verweisen.');
  }
  return { ok: true };
}

export function validateCourseDraft(courseId: string, draft: AcademyCourseDraftDoc): AcademyValidationResult {
  if (!isRecord(draft)) return invalid('ACADEMY_COURSE_DRAFT_INVALID', 'Der Kursentwurf ist ungültig.');
  if (!isNonEmpty(courseId) || draft.id !== courseId || draft.courseId !== courseId ||
      !Number.isSafeInteger(draft.workingRevision) || draft.workingRevision < 1 ||
      !isNonEmpty(draft.updatedIso) || !isNonEmpty(draft.updatedByUid)) {
    return invalid('ACADEMY_COURSE_DRAFT_INVALID', 'Kursentwurf, Revision und Änderungsmetadaten sind ungültig.');
  }
  return validateCourseVersion(courseId, {
    ...draft,
    id: `${courseId}__v1`,
    versionNumber: 1,
    createdIso: draft.updatedIso,
    createdByUid: draft.updatedByUid
  });
}

export function validateProgramVersion(
  programId: string,
  version: AcademyProgramVersionDoc
): AcademyValidationResult {
  if (!isRecord(version) || !isNonEmpty(programId) || version.programId !== programId) {
    return invalid('ACADEMY_PROGRAM_VERSION_OWNER_MISMATCH', 'Die Programmversion gehört nicht zu diesem Programm.');
  }
  if (!isNonEmpty(version.title) || version.title.trim().length > 200) {
    return invalid('ACADEMY_PROGRAM_TITLE_INVALID', 'Der Programmname muss zwischen 1 und 200 Zeichen lang sein.');
  }
  if (!Array.isArray(version.learningObjectives) || !version.learningObjectives.every(value => isRecord(value)) || version.learningObjectives.length < 3 || version.learningObjectives.length > 6) {
    return invalid('ACADEMY_PROGRAM_OBJECTIVES_COUNT', 'Ein Programm benötigt drei bis sechs konkrete Lernziele.');
  }
  if (version.learningObjectives.some(objective => !isNonEmpty(objective.description))) {
    return invalid('ACADEMY_PROGRAM_OBJECTIVE_INVALID', 'Alle Lernziele benötigen eine konkrete Beschreibung.');
  }
  if (!Array.isArray(version.courseReferences) || !version.courseReferences.every(value => isRecord(value)) ||
      !hasUniqueIds(version.learningObjectives) ||
      version.learningObjectives.some(objective => !isNonEmpty(objective.id) || !isNonEmpty(objective.description))) {
    return invalid('ACADEMY_PROGRAM_STRUCTURE_INVALID', 'Programmziele und Kurszuordnungen müssen gültige Listen mit eindeutigen IDs sein.');
  }
  if (new Set(version.courseReferences.map(ref => ref.courseId)).size !== version.courseReferences.length) {
    return invalid('ACADEMY_PROGRAM_DUPLICATE_COURSE', 'Ein Kurs darf innerhalb einer Programmversion nur einmal zugeordnet sein.');
  }
  if (version.courseReferences.some(ref =>
    !isNonEmpty(ref.courseId) ||
    !['required', 'recommended'].includes(ref.requirement) ||
    !Number.isSafeInteger(ref.order) || ref.order < 0
  )) {
    return invalid('ACADEMY_PROGRAM_COURSE_REFERENCE_INVALID', 'Jede Kurszuordnung benötigt einen gültigen Kurs, eine Reihenfolge und die Einstufung erforderlich oder empfohlen.');
  }
  return { ok: true };
}

export function validateProgramDraft(programId: string, draft: AcademyProgramDraftDoc): AcademyValidationResult {
  if (!isRecord(draft)) return invalid('ACADEMY_PROGRAM_DRAFT_INVALID', 'Der Programmentwurf ist ungültig.');
  if (!isNonEmpty(programId) || draft.id !== programId || draft.programId !== programId ||
      !Number.isSafeInteger(draft.workingRevision) || draft.workingRevision < 1 ||
      !isNonEmpty(draft.updatedIso) || !isNonEmpty(draft.updatedByUid)) {
    return invalid('ACADEMY_PROGRAM_DRAFT_INVALID', 'Programmentwurf, Revision und Änderungsmetadaten sind ungültig.');
  }
  return validateProgramVersion(programId, {
    ...draft,
    id: `${programId}__v1`,
    versionNumber: 1,
    createdIso: draft.updatedIso,
    createdByUid: draft.updatedByUid
  });
}

export function validateCourseMaster(master: AcademyCourseMasterDoc): AcademyValidationResult {
  if (!isRecord(master)) return invalid('ACADEMY_COURSE_MASTER_INVALID', 'Der Kursstammsatz ist ungültig.');
  if (!['draft', 'published', 'archived'].includes(master.publicationStatus) || !['available', 'unavailable'].includes(master.availability)) {
    return invalid('ACADEMY_COURSE_STATE_INVALID', 'Veröffentlichungsstatus oder Verfügbarkeit des Kurses ist ungültig.');
  }
  if (master.publicationStatus === 'archived' && (!isNonEmpty(master.archivedIso) || !isNonEmpty(master.archivedByUid) || !isNonEmpty(master.archiveReason))) {
    return invalid('ACADEMY_COURSE_ARCHIVE_AUDIT_MISSING', 'Ein archivierter Kurs benötigt Zeitpunkt, verantwortliche Person und Begründung.');
  }
  if (!isRecord(master) || !isNonEmpty(master.id) || !isNonEmpty(master.code) || !isNonEmpty(master.ownerUid)) {
    return invalid('ACADEMY_COURSE_MASTER_INVALID', 'Kurs-ID, Kurskennung und verantwortlicher Nutzer sind erforderlich.');
  }
  if (!Number.isSafeInteger(master.workingRevision) || master.workingRevision < 1 ||
      !Number.isSafeInteger(master.latestVersionNumber) || master.latestVersionNumber < 0) {
    return invalid('ACADEMY_COURSE_REVISION_INVALID', 'Kursrevision oder Versionszähler ist ungültig.');
  }
  if (master.publicationStatus === 'published' && !isNonEmpty(master.currentPublishedVersionId)) {
    return invalid('ACADEMY_COURSE_PUBLISHED_VERSION_MISSING', 'Ein veröffentlichter Kurs benötigt eine konkrete veröffentlichte Version.');
  }
  return { ok: true };
}

export function validateProgramMaster(master: AcademyProgramMasterDoc): AcademyValidationResult {
  if (!isRecord(master)) return invalid('ACADEMY_PROGRAM_MASTER_INVALID', 'Der Programmstammsatz ist ungültig.');
  if (!['draft', 'published', 'archived'].includes(master.publicationStatus) || !['available', 'unavailable'].includes(master.availability)) {
    return invalid('ACADEMY_PROGRAM_STATE_INVALID', 'Veröffentlichungsstatus oder Verfügbarkeit des Programms ist ungültig.');
  }
  if (master.publicationStatus === 'archived' && (!isNonEmpty(master.archivedIso) || !isNonEmpty(master.archivedByUid) || !isNonEmpty(master.archiveReason))) {
    return invalid('ACADEMY_PROGRAM_ARCHIVE_AUDIT_MISSING', 'Ein archiviertes Programm benötigt Zeitpunkt, verantwortliche Person und Begründung.');
  }
  if (!isRecord(master) || !isNonEmpty(master.id) || !isNonEmpty(master.code) || !isNonEmpty(master.ownerUid)) {
    return invalid('ACADEMY_PROGRAM_MASTER_INVALID', 'Programm-ID, Programmkennung und verantwortlicher Nutzer sind erforderlich.');
  }
  if (!Number.isSafeInteger(master.workingRevision) || master.workingRevision < 1 ||
      !Number.isSafeInteger(master.latestVersionNumber) || master.latestVersionNumber < 0) {
    return invalid('ACADEMY_PROGRAM_REVISION_INVALID', 'Programmrevision oder Versionszähler ist ungültig.');
  }
  if (master.publicationStatus === 'published' && !isNonEmpty(master.currentPublishedVersionId)) {
    return invalid('ACADEMY_PROGRAM_PUBLISHED_VERSION_MISSING', 'Ein veröffentlichtes Programm benötigt eine konkrete veröffentlichte Version.');
  }
  return { ok: true };
}

export function validateCourseParticipation(
  participation: AcademyCourseParticipationDoc
): AcademyValidationResult {
  if (!isNonEmpty(participation.id) || !isNonEmpty(participation.userUid) ||
      !isNonEmpty(participation.courseId) || !isNonEmpty(participation.courseVersionId)) {
    return invalid('ACADEMY_PARTICIPATION_REFERENCE_MISSING', 'Teilnahme, Nutzer, Kurs und Kursversion müssen eindeutig referenziert sein.');
  }
  if (!['in_progress', 'completed', 'voluntarily_ended', 'administratively_ended'].includes(participation.status) ||
      !isNonEmpty(participation.createdIso) || !isNonEmpty(participation.updatedIso)) {
    return invalid('ACADEMY_PARTICIPATION_STATE_INVALID', 'Teilnahmestatus und Zeitstempel müssen gültig sein.');
  }
  if (participation.status === 'completed' && !isNonEmpty(participation.completedIso)) {
    return invalid('ACADEMY_COMPLETION_TIMESTAMP_MISSING', 'Ein Kursabschluss benötigt Start- und Abschlusszeitpunkt.');
  }
  if (['voluntarily_ended', 'administratively_ended'].includes(participation.status) &&
      (!isNonEmpty(participation.endedIso) || !isNonEmpty(participation.endReason))) {
    return invalid('ACADEMY_PARTICIPATION_END_AUDIT_MISSING', 'Eine beendete Teilnahme benötigt Zeitpunkt und Begründung.');
  }
  return { ok: true };
}

export function validateProgressEvidence(evidence: AcademyProgressEvidenceDoc): AcademyValidationResult {
  if (!isRecord(evidence) || !isNonEmpty(evidence.id) ||
      !isNonEmpty(evidence.participationId) || !isNonEmpty(evidence.requirementId) ||
      !isNonEmpty(evidence.sourceId) || !isNonEmpty(evidence.recordedByUid) ||
      !isNonEmpty(evidence.recordedIso) ||
      !['required_chapter', 'required_material', 'required_assessment', 'practical_task', 'instructor_confirmation', 'accepted_self_confirmation'].includes(evidence.evidenceType)) {
    return invalid('ACADEMY_PROGRESS_EVIDENCE_INVALID', 'Der Fortschrittsnachweis enthält ungültige Referenzen oder Metadaten.');
  }
  if (evidence.details !== undefined && (typeof evidence.details !== 'string' || evidence.details.length > 2000)) {
    return invalid('ACADEMY_PROGRESS_EVIDENCE_DETAILS_INVALID', 'Die Nachweisdetails dürfen höchstens 2000 Zeichen enthalten.');
  }
  return { ok: true };
}

export function validateCompletionCorrection(correction: AcademyCompletionCorrectionDoc): AcademyValidationResult {
  if (!isRecord(correction) || !isNonEmpty(correction.id) || !isNonEmpty(correction.participationId) ||
      !isNonEmpty(correction.reason) || correction.reason.trim().length < 10 ||
      correction.reason.length > 1000 || !isNonEmpty(correction.actorUid) || !isNonEmpty(correction.correctedIso) ||
      !['in_progress', 'completed'].includes(correction.previousStatus) ||
      !['in_progress', 'completed'].includes(correction.correctedStatus) ||
      correction.previousStatus === correction.correctedStatus) {
    return invalid('ACADEMY_COMPLETION_CORRECTION_INVALID', 'Eine Abschlusskorrektur benötigt einen gültigen Statuswechsel, eine Begründung und einen verantwortlichen Administrator.');
  }
  if (correction.invalidatedEvidenceIds !== undefined &&
      (!Array.isArray(correction.invalidatedEvidenceIds) ||
       correction.invalidatedEvidenceIds.some(id => !isNonEmpty(id)) ||
       new Set(correction.invalidatedEvidenceIds).size !== correction.invalidatedEvidenceIds.length ||
       correction.invalidatedEvidenceIds.length > 100)) {
    return invalid('ACADEMY_COMPLETION_CORRECTION_EVIDENCE_INVALID', 'Ungültige oder doppelte Nachweisreferenzen in der Abschlusskorrektur.');
  }
  if (correction.correctedStatus === 'completed' && (correction.invalidatedEvidenceIds?.length ?? 0) > 0) {
    return invalid('ACADEMY_COMPLETION_CORRECTION_EVIDENCE_INVALID', 'Eine Korrektur auf abgeschlossen darf keine Nachweise gleichzeitig entwerten.');
  }
  return { ok: true };
}

export function validatePrivateNote(note: AcademyPrivateNoteDoc): AcademyValidationResult {
  if (!isRecord(note)) return invalid('ACADEMY_NOTE_INVALID', 'Die private Notiz ist ungültig.');
  if (note.kind !== 'note' && note.kind !== 'bookmark') {
    return invalid('ACADEMY_NOTE_KIND_INVALID', 'Der Notiztyp ist ungültig.');
  }
  if (!isNonEmpty(note.id) || !isNonEmpty(note.ownerUid) ||
      !isNonEmpty(note.materialId) || !isNonEmpty(note.materialVersionId)) {
    return invalid('ACADEMY_NOTE_REFERENCE_MISSING', 'Notiz, Eigentümer und konkrete Materialversion müssen referenziert sein.');
  }
  if (note.kind === 'bookmark' && (note.content || '').trim().length > 0) {
    return invalid('ACADEMY_BOOKMARK_CONTENT_NOT_ALLOWED', 'Ein Lesezeichen darf keinen Notiztext enthalten.');
  }
  if (!Array.isArray(note.tags) || note.tags.some(tag => !isNonEmpty(tag) || tag.length > 40)) {
    return invalid('ACADEMY_NOTE_TAGS_INVALID', 'Notiz-Tags müssen gültige kurze Texte sein.');
  }
  if ((note.content || '').length > 20_000) {
    return invalid('ACADEMY_NOTE_CONTENT_TOO_LONG', 'Der Notiztext überschreitet die zulässige Länge.');
  }
  return { ok: true };
}

export function validateProgramParticipation(participation: AcademyProgramParticipationDoc): AcademyValidationResult {
  if (!isRecord(participation) || !isNonEmpty(participation.id) || !isNonEmpty(participation.userUid) ||
      !isNonEmpty(participation.programId) || !isNonEmpty(participation.programVersionId) ||
      !isNonEmpty(participation.createdIso) || !isNonEmpty(participation.updatedIso) ||
      !Array.isArray(participation.requiredCoursePins) ||
      !participation.requiredCoursePins.every(pin => isRecord(pin) && isNonEmpty(pin.courseId) &&
        isNonEmpty(pin.courseVersionId) && isNonEmpty(pin.courseParticipationId))) {
    return invalid('ACADEMY_PROGRAM_PARTICIPATION_INVALID', 'Programmteilnahme und alle gepinnten Pflichtkursversionen müssen gültig referenziert sein.');
  }
  if (new Set(participation.requiredCoursePins.map(pin => pin.courseId)).size !== participation.requiredCoursePins.length ||
      new Set(participation.requiredCoursePins.map(pin => pin.courseParticipationId)).size !== participation.requiredCoursePins.length) {
    return invalid('ACADEMY_PROGRAM_PARTICIPATION_DUPLICATE_PIN', 'Ein Pflichtkurs und eine Kursteilnahme dürfen innerhalb einer Programmteilnahme nur einmal gepinnt sein.');
  }
  return { ok: true };
}
