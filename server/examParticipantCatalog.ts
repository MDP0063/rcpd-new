import type { ExamRepository } from './examRepository.ts';
import type { ExamDocument } from './examRepositoryTypes.ts';
import { normalizeCourseCode, isValidId } from './examValidate.ts';
import type { ExamPrerequisite } from './examTypes.ts';

const MAX_CATALOG_MASTERS = 1000;

export interface ExamParticipantCatalogEntry {
  id: string;
  title: string;
  assessmentStage: 'test' | 'final_exam';
  assignedCourseCodes: string[];
  versionNumber: number;
  timeLimitMinutes: number;
  passingScoreBasisPoints: number;
  maxAttempts: number | null;
  prerequisites: ExamPrerequisite[];
  minClearance: number;
}

function toCatalogEntry(master: ExamDocument, version: ExamDocument): ExamParticipantCatalogEntry {
  if (
    version.examId !== master.id ||
    !Number.isSafeInteger(version.versionNumber) ||
    Number(version.versionNumber) < 1 ||
    typeof version.title !== 'string' ||
    !version.title.trim() ||
    (version.assessmentStage !== 'test' && version.assessmentStage !== 'final_exam') ||
    !Number.isSafeInteger(version.timeLimitMinutes) ||
    Number(version.timeLimitMinutes) < 0 ||
    Number(version.timeLimitMinutes) > 1440 ||
    !Number.isSafeInteger(version.passingScoreBasisPoints) ||
    Number(version.passingScoreBasisPoints) < 0 ||
    Number(version.passingScoreBasisPoints) > 10_000 ||
    !Number.isSafeInteger(version.minClearance) ||
    Number(version.minClearance) < 0 ||
    !Array.isArray(version.questionsSnapshot) ||
    version.questionsSnapshot.length === 0
  ) {
    throw new Error('EXAM_CATALOG_SNAPSHOT_INVALID');
  }

  const rawCourses = master.assignedCourseCodes;
  if (!Array.isArray(rawCourses) || rawCourses.length === 0) {
    throw new Error('EXAM_CATALOG_ASSIGNMENT_INVALID');
  }
  const assignedCourseCodes: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawCourses) {
    const code = normalizeCourseCode(raw);
    if (!code || seen.has(code)) throw new Error('EXAM_CATALOG_ASSIGNMENT_INVALID');
    seen.add(code);
    assignedCourseCodes.push(code);
  }

  const maxAttempts = version.maxAttempts === undefined ? null : version.maxAttempts;
  if (maxAttempts !== null && (!Number.isSafeInteger(maxAttempts) || Number(maxAttempts) < 0)) {
    throw new Error('EXAM_CATALOG_SNAPSHOT_INVALID');
  }
  const prerequisites = version.prerequisites === undefined ? [] : version.prerequisites;
  if (!Array.isArray(prerequisites)) throw new Error('EXAM_CATALOG_SNAPSHOT_INVALID');

  return {
    id: master.id,
    title: version.title.trim(),
    assessmentStage: version.assessmentStage,
    assignedCourseCodes,
    versionNumber: Number(version.versionNumber),
    timeLimitMinutes: Number(version.timeLimitMinutes),
    passingScoreBasisPoints: Number(version.passingScoreBasisPoints),
    maxAttempts: maxAttempts as number | null,
    prerequisites: structuredClone(prerequisites) as ExamPrerequisite[],
    minClearance: Number(version.minClearance)
  };
}

/**
 * Liefert ausschließlich freigegebene Metadaten veröffentlichter Prüfungen.
 * Fragen, Antworten, Erklärungen und Bewertungsrubriken bleiben vollständig serverseitig.
 */
export async function listParticipantExamCatalog(
  repository: ExamRepository,
  participantClearanceLevel: number
): Promise<ExamParticipantCatalogEntry[]> {
  if (!Number.isSafeInteger(participantClearanceLevel) || participantClearanceLevel < 0) {
    throw new Error('EXAM_PARTICIPANT_INVALID');
  }

  const masters = await repository.list('exam_masters', { limit: MAX_CATALOG_MASTERS });
  if (masters.length >= MAX_CATALOG_MASTERS) throw new Error('EXAM_CATALOG_LIMIT');

  const entries: ExamParticipantCatalogEntry[] = [];
  for (const master of masters) {
    if (master.status !== 'published' || master.startable !== true) continue;
    if (typeof master.currentPublishedVersionId !== 'string' || !isValidId(master.currentPublishedVersionId)) {
      throw new Error('EXAM_CATALOG_SNAPSHOT_INVALID');
    }
    const version = await repository.get('exam_versions', master.currentPublishedVersionId);
    if (!version) throw new Error('EXAM_CATALOG_SNAPSHOT_INVALID');
    const entry = toCatalogEntry(master, version);
    if (entry.minClearance <= participantClearanceLevel) entries.push(entry);
  }

  return entries.sort((a, b) =>
    a.assessmentStage.localeCompare(b.assessmentStage) ||
    a.title.localeCompare(b.title, 'de') ||
    a.id.localeCompare(b.id)
  );
}
