import type { ExamRepository } from './examRepository.ts';
import { checkSnapshotSize, validateExamForPublication } from './examValidate.ts';
import { defaultMaxAttempts, EXAM_LIMITS } from './examTypes.ts';
import type { AssessmentStage, ExamPrerequisite, ExamQuestion } from './examTypes.ts';
import { normalizeCourseCode, isHttpsUrl, isPlainObject } from './examValidate.ts';

export interface ExamWorkshopDraftInput {
  title: string;
  moduleCode: string;
  assessmentStage: AssessmentStage;
  minClearance: number;
  timeLimitMinutes: number;
  passingScoreBasisPoints: number;
  maxAttempts: number | null;
  prerequisites: ExamPrerequisite[];
  assignedCourseCodes: string[];
  questions: ExamQuestion[];
}

const QUESTION_KEYS = new Set([
  'id', 'type', 'question', 'pointsMilli', 'explanation', 'imageUrl',
  'options', 'correctOptionId', 'correctOptionIds', 'correctBoolean',
  'matchingPairs', 'gradingRubric', 'maxAnswerLength', 'legacyCorrectIndex'
]);

function invalid(path: string): never {
  throw new Error(`EXAM_WORKSHOP_INPUT_INVALID:${path}`);
}

function boundedInteger(value: unknown, min: number, max: number, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    return invalid(path);
  }
  return value;
}

/** Validiert und begrenzt den speicherbaren Arbeitsstand, ohne unvollständige Entwürfe zu verbieten. */
export function parseExamWorkshopDraft(value: unknown): ExamWorkshopDraftInput {
  if (!isPlainObject(value)) return invalid('definition');

  const title = value.title;
  if (typeof title !== 'string' || title.length > EXAM_LIMITS.maxTitleLength) return invalid('title');

  const assessmentStage = value.assessmentStage;
  if (assessmentStage !== 'test' && assessmentStage !== 'final_exam') return invalid('assessmentStage');

  const moduleCode = typeof value.moduleCode === 'string' ? value.moduleCode.trim().toUpperCase() : '';
  if (moduleCode.length > 40 || (moduleCode && !normalizeCourseCode(moduleCode))) return invalid('moduleCode');

  const minClearance = boundedInteger(value.minClearance, 0, 10, 'minClearance');
  const timeLimitMinutes = boundedInteger(value.timeLimitMinutes, 0, EXAM_LIMITS.maxTimeLimitMinutes, 'timeLimitMinutes');
  const passingScoreBasisPoints = boundedInteger(value.passingScoreBasisPoints, 0, 10_000, 'passingScoreBasisPoints');

  const maxAttemptsValue = value.maxAttempts === undefined
    ? defaultMaxAttempts(assessmentStage)
    : value.maxAttempts;
  const maxAttempts = maxAttemptsValue === null
    ? null
    : boundedInteger(maxAttemptsValue, 0, Number.MAX_SAFE_INTEGER, 'maxAttempts');

  const rawCourses = value.assignedCourseCodes === undefined ? [] : value.assignedCourseCodes;
  if (!Array.isArray(rawCourses) || rawCourses.length > EXAM_LIMITS.maxCourseCodes) return invalid('assignedCourseCodes');
  const assignedCourseCodes: string[] = [];
  const seenCourses = new Set<string>();
  for (const raw of rawCourses) {
    const code = normalizeCourseCode(raw);
    if (!code || seenCourses.has(code)) return invalid('assignedCourseCodes');
    seenCourses.add(code);
    assignedCourseCodes.push(code);
  }

  const rawPrerequisites = value.prerequisites === undefined ? [] : value.prerequisites;
  if (!Array.isArray(rawPrerequisites) || rawPrerequisites.length > EXAM_LIMITS.maxPrerequisites) return invalid('prerequisites');
  const prerequisites = rawPrerequisites.map((item, index) => {
    if (!isPlainObject(item)) return invalid(`prerequisites[${index}]`);
    if (
      typeof item.examId !== 'string' ||
      !item.examId.trim() ||
      item.examId.length > EXAM_LIMITS.maxIdLength ||
      (item.mode !== 'completed' && item.mode !== 'passed') ||
      (item.minScoreBasisPoints !== undefined &&
        (typeof item.minScoreBasisPoints !== 'number' ||
          !Number.isSafeInteger(item.minScoreBasisPoints) ||
          item.minScoreBasisPoints < 0 ||
          item.minScoreBasisPoints > 10_000))
    ) return invalid(`prerequisites[${index}]`);
    return {
      examId: item.examId,
      mode: item.mode,
      ...(item.minScoreBasisPoints !== undefined ? { minScoreBasisPoints: item.minScoreBasisPoints } : {})
    } as ExamPrerequisite;
  });

  const rawQuestions = value.questions === undefined ? [] : value.questions;
  if (!Array.isArray(rawQuestions) || rawQuestions.length > EXAM_LIMITS.maxQuestions) return invalid('questions');
  const questions = rawQuestions.map((question, index) => {
    if (!isPlainObject(question)) return invalid(`questions[${index}]`);
    if (Object.keys(question).some(key => !QUESTION_KEYS.has(key))) return invalid(`questions[${index}]`);
    if (question.imageUrl !== undefined && !isHttpsUrl(question.imageUrl)) return invalid(`questions[${index}].imageUrl`);
    return structuredClone(question) as unknown as ExamQuestion;
  });

  const definition = {
    title,
    assessmentStage,
    timeLimitMinutes,
    passingScoreBasisPoints,
    maxAttempts,
    prerequisites,
    assignedCourseCodes,
    questions
  };
  if (!checkSnapshotSize(definition).ok) return invalid('definition_too_large');

  return {
    title,
    moduleCode: moduleCode || assignedCourseCodes[0] || '',
    assessmentStage,
    minClearance,
    timeLimitMinutes,
    passingScoreBasisPoints,
    maxAttempts,
    prerequisites,
    assignedCourseCodes,
    questions
  };
}

function toMaster(
  id: string,
  input: ExamWorkshopDraftInput,
  authorUid: string,
  updatedIso: string
) {
  return {
    id,
    title: input.title.trim(),
    moduleCode: input.moduleCode,
    assignedCourseCodes: input.assignedCourseCodes,
    assessmentStage: input.assessmentStage,
    status: 'draft',
    minClearance: input.minClearance,
    passingScoreBasisPoints: input.passingScoreBasisPoints,
    timeLimitMinutes: input.timeLimitMinutes,
    maxAttempts: input.maxAttempts,
    prerequisites: input.prerequisites,
    examFormat: 'structured_quiz',
    isLegacyFormat: false,
    startable: false,
    questions: input.questions,
    authorUid,
    updatedIso,
    latestVersionNumber: 0
  };
}

export async function createExamDraft(
  repository: ExamRepository,
  id: string,
  authorUid: string,
  definition: unknown,
  nowIso = new Date().toISOString()
) {
  const input = parseExamWorkshopDraft(definition);
  const master = toMaster(id, input, authorUid, nowIso);
  await repository.create('exam_masters', id, master);
  return master;
}

export async function updateExamDraft(
  repository: ExamRepository,
  id: string,
  editorUid: string,
  definition: unknown,
  nowIso = new Date().toISOString()
) {
  const current = await repository.get('exam_masters', id);
  if (!current) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
  if (current.status === 'archived') throw new Error('EXAM_MASTER_ARCHIVED');

  const input = parseExamWorkshopDraft(definition);
  const next = {
    ...current,
    ...input,
    title: input.title.trim(),
    // A published snapshot remains active while the admin edits the next working version.
    status: current.currentPublishedVersionId ? 'published' : 'draft',
    examFormat: 'structured_quiz',
    isLegacyFormat: false,
    startable: current.currentPublishedVersionId ? current.startable !== false : false,
    updatedIso: nowIso,
    lastModifiedByUid: editorUid
  };
  await repository.update('exam_masters', id, next);
  return next;
}

export async function publishExamDraft(
  repository: ExamRepository,
  id: string,
  publisherUid: string,
  nowIso = new Date().toISOString()
) {
  const current = await repository.get('exam_masters', id);
  if (!current) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
  if (current.status === 'archived') throw new Error('EXAM_MASTER_ARCHIVED');
  if (current.examFormat === 'interactive_code' || current.isLegacyFormat === true) {
    throw new Error('EXAM_LEGACY_FORMAT_NOT_PUBLISHABLE');
  }

  const definition = {
    title: current.title,
    assessmentStage: current.assessmentStage,
    timeLimitMinutes: current.timeLimitMinutes,
    passingScoreBasisPoints: current.passingScoreBasisPoints,
    maxAttempts: current.maxAttempts,
    prerequisites: current.prerequisites ?? [],
    assignedCourseCodes: current.assignedCourseCodes ?? [],
    questions: current.questions ?? []
  };
  const validation = validateExamForPublication(definition);
  if (!validation.ok) {
    const error = new Error('EXAM_PUBLICATION_VALIDATION_FAILED') as Error & { validation?: typeof validation };
    error.validation = validation;
    throw error;
  }

  const latestVersionNumber = current.latestVersionNumber ?? 0;
  if (!Number.isSafeInteger(latestVersionNumber) || latestVersionNumber < 0) {
    throw new Error('EXAM_VERSION_SEQUENCE_INVALID');
  }
  const versionNumber = latestVersionNumber + 1;
  if (!Number.isSafeInteger(versionNumber)) throw new Error('EXAM_VERSION_SEQUENCE_INVALID');

  const version = {
    id: `${id}__v${versionNumber}`,
    examId: id,
    versionNumber,
    publishedAtIso: nowIso,
    publishedByUid: publisherUid,
    title: current.title,
    moduleCode: current.moduleCode,
    historicalAssignedCourseCodes: current.assignedCourseCodes ?? [],
    assessmentStage: current.assessmentStage,
    passingScoreBasisPoints: current.passingScoreBasisPoints,
    minClearance: current.minClearance,
    timeLimitMinutes: current.timeLimitMinutes,
    maxAttempts: current.maxAttempts ?? null,
    prerequisites: current.prerequisites ?? [],
    examFormat: 'structured_quiz',
    isLegacyFormat: false,
    startable: true,
    questionsSnapshot: current.questions ?? []
  };
  const size = checkSnapshotSize(version);
  if (!size.ok) throw new Error('EXAM_SNAPSHOT_TOO_LARGE');

  const nextMaster = {
    ...current,
    status: 'published',
    examFormat: 'structured_quiz',
    isLegacyFormat: false,
    startable: true,
    latestVersionNumber: versionNumber,
    currentPublishedVersionId: version.id,
    updatedIso: nowIso,
    lastPublishedByUid: publisherUid,
    lastPublishedAtIso: nowIso
  };
  await repository.publishVersion(id, version, nextMaster);
  return { master: nextMaster, version };
}
