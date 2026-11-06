import type {
  AcademyCourseMasterDoc,
  AcademyCourseVersionDoc,
  AcademyProgramMasterDoc,
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

function hasUniqueIds(values: Array<{ id: string }>): boolean {
  return new Set(values.map(value => value.id)).size === values.length;
}

export function validateCourseVersion(
  courseId: string,
  version: AcademyCourseVersionDoc
): AcademyValidationResult {
  if (!isNonEmpty(courseId) || version.courseId !== courseId) {
    return invalid('ACADEMY_COURSE_VERSION_OWNER_MISMATCH', 'Die Kursversion gehört nicht zu diesem Kurs.');
  }
  if (!isNonEmpty(version.title) || version.title.trim().length > 200) {
    return invalid('ACADEMY_COURSE_TITLE_INVALID', 'Der Kurstitel muss zwischen 1 und 200 Zeichen lang sein.');
  }
  if (!Number.isSafeInteger(version.versionNumber) || version.versionNumber < 1) {
    return invalid('ACADEMY_COURSE_VERSION_INVALID', 'Die Kursversionsnummer ist ungültig.');
  }
  if (!Array.isArray(version.chapters) || !Array.isArray(version.completionRequirements)) {
    return invalid('ACADEMY_COURSE_STRUCTURE_INVALID', 'Kapitel und Abschlussbedingungen müssen gültige Listen sein.');
  }
  if (!hasUniqueIds(version.chapters) || !hasUniqueIds(version.completionRequirements)) {
    return invalid('ACADEMY_COURSE_DUPLICATE_CHILD_ID', 'Kapitel und Abschlussbedingungen benötigen eindeutige IDs.');
  }
  for (const chapter of version.chapters) {
    if (!isNonEmpty(chapter.title) || !Array.isArray(chapter.materialReferences)) {
      return invalid('ACADEMY_COURSE_CHAPTER_INVALID', 'Jedes Kapitel benötigt einen Titel und eine Materialliste.');
    }
    const refs = chapter.materialReferences;
    if (new Set(refs.map(ref => ref.materialId)).size !== refs.length) {
      return invalid('ACADEMY_COURSE_DUPLICATE_MATERIAL', 'Ein Material darf innerhalb eines Kapitels nur einmal referenziert werden.');
    }
    if (refs.some(ref => !isNonEmpty(ref.materialId) || !isNonEmpty(ref.materialVersionId))) {
      return invalid('ACADEMY_COURSE_MATERIAL_VERSION_REQUIRED', 'Kursmaterialien müssen auf eine konkrete Materialversion verweisen.');
    }
  }
  return { ok: true };
}

export function validateProgramVersion(
  programId: string,
  version: AcademyProgramVersionDoc
): AcademyValidationResult {
  if (!isNonEmpty(programId) || version.programId !== programId) {
    return invalid('ACADEMY_PROGRAM_VERSION_OWNER_MISMATCH', 'Die Programmversion gehört nicht zu diesem Programm.');
  }
  if (!isNonEmpty(version.title) || version.title.trim().length > 200) {
    return invalid('ACADEMY_PROGRAM_TITLE_INVALID', 'Der Programmname muss zwischen 1 und 200 Zeichen lang sein.');
  }
  if (!Array.isArray(version.learningObjectives) || version.learningObjectives.length < 3 || version.learningObjectives.length > 6) {
    return invalid('ACADEMY_PROGRAM_OBJECTIVES_COUNT', 'Ein Programm benötigt drei bis sechs konkrete Lernziele.');
  }
  if (version.learningObjectives.some(objective => !isNonEmpty(objective.description))) {
    return invalid('ACADEMY_PROGRAM_OBJECTIVE_INVALID', 'Alle Lernziele benötigen eine konkrete Beschreibung.');
  }
  if (!Array.isArray(version.courseReferences) || !hasUniqueIds(version.learningObjectives)) {
    return invalid('ACADEMY_PROGRAM_STRUCTURE_INVALID', 'Programmziele und Kurszuordnungen müssen gültige Listen sein.');
  }
  if (new Set(version.courseReferences.map(ref => ref.courseId)).size !== version.courseReferences.length) {
    return invalid('ACADEMY_PROGRAM_DUPLICATE_COURSE', 'Ein Kurs darf innerhalb einer Programmversion nur einmal zugeordnet sein.');
  }
  if (version.courseReferences.some(ref => !isNonEmpty(ref.courseId) || !['required', 'recommended'].includes(ref.requirement))) {
    return invalid('ACADEMY_PROGRAM_COURSE_REFERENCE_INVALID', 'Jede Kurszuordnung benötigt einen gültigen Kurs und die Einstufung erforderlich oder empfohlen.');
  }
  return { ok: true };
}

export function validateCourseMaster(master: AcademyCourseMasterDoc): AcademyValidationResult {
  if (!isNonEmpty(master.id) || !isNonEmpty(master.code) || !isNonEmpty(master.ownerUid)) {
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
  if (!isNonEmpty(master.id) || !isNonEmpty(master.code) || !isNonEmpty(master.ownerUid)) {
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
