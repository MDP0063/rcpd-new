import { createHash } from 'node:crypto';
import type { ExamRepository } from './examRepository.ts';
import type { ExamDocument } from './examRepositoryTypes.ts';
import { checkSnapshotSize, validateExamForPublication } from './examValidate.ts';
import { defaultMaxAttempts, EXAM_LIMITS } from './examTypes.ts';
import type { AssessmentStage, ExamPrerequisite, ExamQuestion } from './examTypes.ts';
import { normalizeCourseCode, isHttpsUrl, isPlainObject, isValidId } from './examValidate.ts';

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
  'matchingPairs', 'matchingTargets', 'gradingRubric', 'maxAnswerLength', 'legacyCorrectIndex'
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

function validateMatchingIntegrity(questions: ExamQuestion[]): void {
  for (const [index, rawQuestion] of (questions as unknown as Array<Record<string, unknown>>).entries()) {
    if (rawQuestion.type !== 'matching') continue;
    const pairs = rawQuestion.matchingPairs;
    if (!Array.isArray(pairs) || pairs.length < 1 || pairs.length > EXAM_LIMITS.maxMatchingPairs) {
      invalid(`questions[${index}].matchingPairs`);
    }
    const pairIds = new Set<string>();
    const targetIds = new Set<string>();
    for (const [pairIndex, rawPair] of pairs.entries()) {
      if (!isPlainObject(rawPair) || !isValidId(rawPair.id) || !isValidId(rawPair.targetId)) {
        invalid(`questions[${index}].matchingPairs[${pairIndex}]`);
      }
      if (pairIds.has(rawPair.id) || targetIds.has(rawPair.targetId) || pairIds.has(rawPair.targetId)) {
        invalid(`questions[${index}].matchingPairs[${pairIndex}]`);
      }
      if (
        typeof rawPair.prompt !== 'string' || !rawPair.prompt.trim() || rawPair.prompt.length > EXAM_LIMITS.maxOptionLength ||
        typeof rawPair.targetText !== 'string' || !rawPair.targetText.trim() || rawPair.targetText.length > EXAM_LIMITS.maxOptionLength
      ) invalid(`questions[${index}].matchingPairs[${pairIndex}]`);
      pairIds.add(rawPair.id);
      targetIds.add(rawPair.targetId);
    }
    if ([...targetIds].some(id => pairIds.has(id))) invalid(`questions[${index}].matchingPairs`);
  }
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

  const rawCourses = value.assignedCourseCodes === undefined
    ? (moduleCode ? [moduleCode] : [])
    : value.assignedCourseCodes;
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
      !isValidId(item.examId) ||
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
    // assignedCourseCodes is authoritative; moduleCode is retained only as a legacy compatibility field.
    moduleCode: assignedCourseCodes[0] || '',
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
    questions: input.questions.map(question => {
      const copy = { ...question } as ExamQuestion & { matchingTargets?: unknown };
      delete copy.matchingTargets;
      return copy;
    }),
    authorUid,
    updatedIso,
    latestVersionNumber: 0,
    workingRevision: 1
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
  validateMatchingIntegrity(input.questions);
  const master = toMaster(id, input, authorUid, nowIso);
  await repository.create('exam_masters', id, master);
  return master;
}

export async function updateExamDraft(
  repository: ExamRepository,
  id: string,
  editorUid: string,
  definition: unknown,
  nowIso = new Date().toISOString(),
  expectedRevision?: number,
  preserveSensitiveFields = false
) {
  const input = parseExamWorkshopDraft(definition);
  return repository.runTransaction(async transaction => {
    const current = await transaction.get('exam_masters', id);
    if (!current) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    if (current.status === 'archived') throw new Error('EXAM_MASTER_ARCHIVED');
    if (input.assessmentStage !== current.assessmentStage) {
      throw new Error('EXAM_ASSESSMENT_STAGE_IMMUTABLE');
    }
    const currentRevision = current.workingRevision === undefined ? 1 : current.workingRevision;
    if (
      typeof currentRevision !== 'number' ||
      !Number.isSafeInteger(currentRevision) ||
      currentRevision < 1 ||
      !Number.isSafeInteger(currentRevision + 1)
    ) throw new Error('EXAM_WORKING_REVISION_INVALID');
    if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
      throw new Error('EXAM_WORKING_REVISION_CONFLICT');
    }
    const existingQuestions = new Map((Array.isArray(current.questions) ? current.questions : [])
      .filter((question): question is Record<string, unknown> => Boolean(question) && typeof question === 'object')
      .map(question => [String(question.id || ''), question]));
    const editedMatchingTargetQuestions = new Set<string>();
    for (const [index, rawQuestion] of (input.questions as unknown as Array<Record<string, unknown>>).entries()) {
      if (rawQuestion.type !== 'matching') continue;
      const currentQuestion = existingQuestions.get(String(rawQuestion.id || ''));
      const oldPairs = Array.isArray(currentQuestion?.matchingPairs)
        ? currentQuestion.matchingPairs as Array<Record<string, unknown>>
        : [];
      if (preserveSensitiveFields && currentQuestion && !Array.isArray(rawQuestion.matchingTargets)) {
        invalid(`questions[${index}].matchingTargets`);
      }
      const targetItems = Array.isArray(rawQuestion.matchingTargets)
        ? rawQuestion.matchingTargets as Array<Record<string, unknown>>
        : [];
      const targetTexts = new Map<string, string>();
      for (const target of targetItems) {
        if (!isPlainObject(target) || !isValidId(target.id) || typeof target.text !== 'string' || !target.text.trim() || target.text.length > EXAM_LIMITS.maxOptionLength || targetTexts.has(target.id)) {
          invalid(`questions[${index}].matchingTargets`);
        }
        targetTexts.set(target.id, target.text);
      }
      if (!Array.isArray(rawQuestion.matchingPairs)) invalid(`questions[${index}].matchingPairs`);
      if (preserveSensitiveFields && currentQuestion) {
        if (oldPairs.some(pair => !isPlainObject(pair) || !isValidId(pair.id) || !isValidId(pair.targetId))) {
          invalid(`questions[${index}].matchingPairs`);
        }
        const oldPairsById = new Map(oldPairs.map(pair => [String(pair.id || ''), pair]));
        const oldTargetIds = new Set(oldPairs.map(pair => {
          if (!isValidId(pair.id) || !isValidId(pair.targetId)) invalid(`questions[${index}].matchingPairs`);
          return pair.targetId;
        }));
        const submittedPairs = rawQuestion.matchingPairs as Array<Record<string, unknown>>;
        const nextPairs: Array<Record<string, unknown>> = submittedPairs.map((pair, pairIndex) => {
          if (!isPlainObject(pair) || !isValidId(pair.id) || typeof pair.prompt !== 'string') invalid(`questions[${index}].matchingPairs[${pairIndex}]`);
          const old = oldPairsById.get(pair.id);
          const targetId = old ? old.targetId : pair.targetId;
          if (!isValidId(targetId)) invalid(`questions[${index}].matchingPairs[${pairIndex}]`);
          const targetText = targetTexts.get(targetId);
          if (typeof targetText !== 'string') invalid(`questions[${index}].matchingTargets`);
          return { ...pair, targetId, targetText };
        });
        const newTargetIds = nextPairs
          .filter(pair => !oldPairsById.has(String(pair.id)))
          .map(pair => pair.targetId as string);
        const expectedTargetIds = new Set([...oldTargetIds, ...newTargetIds]);
        if (expectedTargetIds.size !== oldTargetIds.size + newTargetIds.length || targetTexts.size !== expectedTargetIds.size || [...expectedTargetIds].some(targetId => !targetTexts.has(targetId))) {
          invalid(`questions[${index}].matchingTargets`);
        }
        if (newTargetIds.some(targetId => oldTargetIds.has(targetId))) invalid(`questions[${index}].matchingPairs`);
        const nextByPairId = new Map(nextPairs.map(pair => [String(pair.id), pair]));
        const retainedPairsInMasterOrder = oldPairs.flatMap(pair => {
          const nextPair = nextByPairId.get(String(pair.id));
          return nextPair ? [nextPair] : [];
        });
        const addedPairs = nextPairs.filter(pair => !oldPairsById.has(String(pair.id)));
        rawQuestion.matchingPairs = [...retainedPairsInMasterOrder, ...addedPairs];
        editedMatchingTargetQuestions.add(String(rawQuestion.id || ''));
      } else if (Array.isArray(rawQuestion.matchingTargets)) {
        const targetsById = targetTexts;
        const submittedPairs = rawQuestion.matchingPairs as Array<Record<string, unknown>>;
        rawQuestion.matchingPairs = submittedPairs.map((pair, pairIndex) => {
          if (!isPlainObject(pair) || !isValidId(pair.targetId)) invalid(`questions[${index}].matchingPairs[${pairIndex}]`);
          const targetText = targetsById.get(pair.targetId);
          if (typeof pair.prompt !== 'string' || typeof targetText !== 'string') invalid(`questions[${index}].matchingPairs[${pairIndex}]`);
          return { ...pair, targetText };
        });
        if (targetsById.size !== submittedPairs.length) invalid(`questions[${index}].matchingTargets`);
      }
    }
    if (preserveSensitiveFields) {
      for (const question of input.questions as unknown as Array<Record<string, unknown>>) {
        const previous = existingQuestions.get(String(question.id || ''));
        if (!previous) continue;
        for (const key of ['correctOptionId', 'correctOptionIds', 'correctBoolean', 'explanation', 'gradingRubric']) {
          if (Object.prototype.hasOwnProperty.call(previous, key)) question[key] = structuredClone(previous[key]);
        }
        if (Array.isArray(question.matchingPairs) && Array.isArray(previous.matchingPairs)) {
          const oldPairs = new Map((previous.matchingPairs as Array<Record<string, unknown>>).map(pair => [String(pair.id || ''), pair]));
          question.matchingPairs = (question.matchingPairs as Array<Record<string, unknown>>).map(pair => {
            const old = oldPairs.get(String(pair.id || ''));
            if (!old || !Object.prototype.hasOwnProperty.call(old, 'targetId')) return pair;
            return {
              ...pair,
              targetId: old.targetId,
              targetText: editedMatchingTargetQuestions.has(String(question.id || '')) && typeof pair.targetText === 'string'
                ? pair.targetText
                : old.targetText
            };
          });
        }
      }
      for (const question of input.questions as unknown as Array<Record<string, unknown>>) delete question.matchingTargets;
    } else {
      for (const question of input.questions as unknown as Array<Record<string, unknown>>) delete question.matchingTargets;
    }
    validateMatchingIntegrity(input.questions);
    const next: ExamDocument = {
      ...current,
      ...input,
      workingRevision: currentRevision + 1,
      title: input.title.trim(),
      status: current.currentPublishedVersionId ? 'published' : 'draft',
      examFormat: 'structured_quiz',
      isLegacyFormat: false,
      startable: current.currentPublishedVersionId ? current.startable !== false : false,
      updatedIso: nowIso,
      lastModifiedByUid: editorUid
    };
    await transaction.update('exam_masters', id, next);
    return next;
  });
}

export function getExamWorkshopDefinitionHash(master: ExamDocument): string {
  const definition = {
    title: master.title,
    moduleCode: master.moduleCode,
    assignedCourseCodes: master.assignedCourseCodes ?? [],
    assessmentStage: master.assessmentStage,
    minClearance: master.minClearance,
    passingScoreBasisPoints: master.passingScoreBasisPoints,
    timeLimitMinutes: master.timeLimitMinutes,
    maxAttempts: master.maxAttempts ?? null,
    prerequisites: master.prerequisites ?? [],
    questions: master.questions ?? []
  };
  return createHash('sha256').update(JSON.stringify(definition), 'utf8').digest('hex');
}

export async function publishExamDraft(
  repository: ExamRepository,
  id: string,
  publisherUid: string,
  nowIso = new Date().toISOString(),
  publicationReview?: { requestId: string; reviewerName: string; reviewComment?: string },
  expectedRevision?: number
) {
  const current = await repository.get('exam_masters', id);
  if (!current) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
  if (current.status === 'archived') throw new Error('EXAM_MASTER_ARCHIVED');
  const currentRevision = current.workingRevision === undefined ? 1 : current.workingRevision;
  if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
    throw new Error('EXAM_WORKING_REVISION_CONFLICT');
  }
  if (current.examFormat === 'interactive_code' || current.isLegacyFormat === true) {
    throw new Error('EXAM_LEGACY_FORMAT_NOT_PUBLISHABLE');
  }

  let nextPublicationRequest: ExamDocument | undefined;
  if (publicationReview) {
    const request = await repository.get('exam_publication_requests', publicationReview.requestId);
    const revision = current.workingRevision === undefined ? 1 : current.workingRevision;
    if (
      !request ||
      request.status !== 'pending' ||
      request.examId !== id ||
      request.submittedRevision !== revision ||
      request.submittedHash !== getExamWorkshopDefinitionHash(current)
    ) throw new Error('EXAM_PUBLICATION_REQUEST_REVISION_CONFLICT');
    nextPublicationRequest = {
      ...request,
      status: 'published',
      reviewedByUid: publisherUid,
      reviewedByName: publicationReview.reviewerName.trim().slice(0, 120),
      reviewedAtIso: nowIso,
      reviewComment: (publicationReview.reviewComment || '').trim().slice(0, 1000),
      updatedIso: nowIso
    };
  } else {
    // A direct publication closes any pending review in the same repository transaction.
    const pending = await repository.list<ExamDocument & { status?: string; examId?: string; submittedRevision?: number }>(
      'exam_publication_requests',
      { where: [{ field: 'examId', value: id }, { field: 'status', value: 'pending' }], limit: 2 }
    );
    if (pending.length > 1) throw new Error('EXAM_PUBLICATION_REQUEST_DUPLICATE_PENDING');
    if (pending[0]) {
      if (pending[0].submittedRevision !== currentRevision) throw new Error('EXAM_PUBLICATION_REQUEST_REVISION_CONFLICT');
      nextPublicationRequest = {
        ...pending[0], status: 'published', reviewedByUid: publisherUid,
        reviewedAtIso: nowIso, reviewComment: 'Der Prüfungsstand wurde direkt veröffentlicht.', updatedIso: nowIso
      };
    }
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

  const rawLatestVersionNumber = current.latestVersionNumber;
  const latestVersionNumber = rawLatestVersionNumber === undefined ? 0 : rawLatestVersionNumber;
  if (
    typeof latestVersionNumber !== 'number' ||
    !Number.isSafeInteger(latestVersionNumber) ||
    latestVersionNumber < 0
  ) throw new Error('EXAM_VERSION_SEQUENCE_INVALID');
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
  if (!checkSnapshotSize(version).ok) throw new Error('EXAM_SNAPSHOT_TOO_LARGE');

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
  if (nextPublicationRequest) nextPublicationRequest.publishedVersionId = version.id;
  await repository.publishVersion(
    id,
    version,
    nextMaster,
    nextPublicationRequest
      ? { id: String(nextPublicationRequest.id), document: nextPublicationRequest }
      : undefined
  );
  return { master: nextMaster, version };
}
