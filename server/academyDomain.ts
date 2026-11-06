import type {
  AcademyCourseMasterDoc,
  AcademyCourseDraftDoc,
  AcademyCourseVersionDoc,
  AcademyProgramMasterDoc,
  AcademyProgramDraftDoc,
  AcademyProgramVersionDoc,
  AcademyCourseParticipationDoc,
  AcademyProgramParticipationDoc,
  AcademyPrivateNoteDoc
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
  if (participation.status === 'completed' && !isNonEmpty(participation.completedIso)) {
    return invalid('ACADEMY_COMPLETION_TIMESTAMP_MISSING', 'Ein Kursabschluss benötigt einen Abschlusszeitpunkt.');
  }
  if (['voluntarily_ended', 'administratively_ended'].includes(participation.status) &&
      (!isNonEmpty(participation.endedIso) || !isNonEmpty(participation.endReason))) {
    return invalid('ACADEMY_PARTICIPATION_END_AUDIT_MISSING', 'Eine beendete Teilnahme benötigt Zeitpunkt und Begründung.');
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
