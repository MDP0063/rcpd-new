/**
 * Transaktionssichere Anlage und Wiederaufnahme neuer Prüfungsversuche.
 * Grundlage: EXAM_WORKSHOP_ARCHITECTURE_V3.8, §§3.4, 6–8 und 11.
 */
import { randomUUID } from 'node:crypto';
import type { ExamRepository } from './examRepository.ts';
import type { ExamDocument, ExamQuery, ExamTransaction } from './examRepositoryTypes.ts';
import { normalizeCourseCode, isValidId } from './examValidate.ts';
import { defaultMaxAttempts, type ExamQuestion, type ExamPrerequisite } from './examTypes.ts';
import {
  createMatchingShuffleOrders,
  createMatchingPairOrders,
  createMatchingPresentationIds,
  projectAttemptAnswers,
  projectQuestionsForAttempt,
  type MatchingShuffleOrders,
  type MatchingPairOrders,
  type MatchingPresentationIds,
  type PublicExamQuestion
} from './examRunner.ts';

const MAX_ATTEMPT_HISTORY = 1000;

export interface ExamParticipant {
  uid: string;
  displayName: string;
  clearanceLevel: number;
}

export interface ExamAttemptRecord extends ExamDocument {
  userId: string;
  userName: string;
  examId: string;
  examVersionId: string;
  versionNumber: number;
  attemptCourseCode: string;
  assignedCourseCodesAtStart: string[];
  moduleCode: string;
  assessmentStage: 'test' | 'final_exam';
  attemptNumber: number;
  startedAtIso: string;
  deadlineIso: string | null;
  lastHeartbeatAtIso: string;
  currentRevision: number;
  status: 'in_progress' | 'passed' | 'failed' | 'pending_review' | 'invalidated_by_admin';
  answers: Record<string, unknown>;
  matchingShuffleOrders: MatchingShuffleOrders;
  matchingPairOrders?: MatchingPairOrders;
  matchingPresentationIds?: MatchingPresentationIds;
  totalPossiblePointsMilli: number;
  automaticallyEarnedPointsMilli: number;
  manuallyEarnedPointsMilli: number;
  preliminaryScoreBasisPoints: number | null;
  finalScoreBasisPoints: number | null;
}

export interface ExamVersionRecord extends ExamDocument {
  examId: string;
  versionNumber: number;
  assessmentStage: 'test' | 'final_exam';
  title: string;
  timeLimitMinutes: number;
  passingScoreBasisPoints: number;
  maxAttempts?: number | null;
  prerequisites?: ExamPrerequisite[];
  minClearance: number;
  questionsSnapshot: ExamQuestion[];
}

export interface PublicExamAttempt {
  id: string;
  examId: string;
  title: string;
  assessmentStage: 'test' | 'final_exam';
  attemptCourseCode: string;
  attemptNumber: number;
  startedAtIso: string;
  deadlineIso: string | null;
  lastHeartbeatAtIso: string;
  currentRevision: number;
  status: 'in_progress';
  answers: Record<string, unknown>;
  questions: PublicExamQuestion[];
  totalPossiblePointsMilli: number;
  passingScoreBasisPoints: number;
  serverTimeIso: string;
}

export interface StartExamAttemptResult {
  attempt: ExamAttemptRecord;
  version: ExamVersionRecord;
  created: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireAttemptHistory<T extends ExamDocument>(documents: T[]): T[] {
  // The repository API caps a query at 1,000 documents. Never silently undercount attempts
  // or prerequisite history: fail closed until a bounded/paged query is available.
  if (documents.length >= MAX_ATTEMPT_HISTORY) {
    throw new Error('EXAM_ATTEMPT_HISTORY_LIMIT');
  }
  return documents;
}

function validVersion(master: ExamDocument, version: ExamDocument | null): ExamVersionRecord {
  if (
    !version ||
    version.examId !== master.id ||
    !Number.isSafeInteger(version.versionNumber) ||
    typeof version.title !== 'string' ||
    !Array.isArray(version.questionsSnapshot) ||
    version.questionsSnapshot.length === 0 ||
    !Number.isSafeInteger(version.timeLimitMinutes) ||
    Number(version.timeLimitMinutes) < 0 ||
    Number(version.timeLimitMinutes) > 1440 ||
    !Number.isSafeInteger(version.passingScoreBasisPoints) ||
    Number(version.passingScoreBasisPoints) < 0 ||
    Number(version.passingScoreBasisPoints) > 10_000 ||
    (version.assessmentStage !== 'test' && version.assessmentStage !== 'final_exam') ||
    !Number.isSafeInteger(version.minClearance) ||
    Number(version.minClearance) < 0
  ) {
    throw new Error('EXAM_PUBLISHED_VERSION_INVALID');
  }
  return version as unknown as ExamVersionRecord;
}

function getAttemptLimit(version: ExamVersionRecord): number | null {
  const configured = version.maxAttempts === undefined
    ? defaultMaxAttempts(version.assessmentStage)
    : version.maxAttempts;
  if (configured === null || configured === 0) return null;
  if (!Number.isSafeInteger(configured) || configured < 0) {
    throw new Error('EXAM_ATTEMPT_LIMIT_INVALID');
  }
  return configured;
}

function validateExtraAttempts(master: ExamDocument, uid: string): number {
  if (master.userExtraAttempts === undefined) return 0;
  if (!isRecord(master.userExtraAttempts)) throw new Error('EXAM_EXTRA_ATTEMPTS_INVALID');
  const value = master.userExtraAttempts[uid] ?? 0;
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error('EXAM_EXTRA_ATTEMPTS_INVALID');
  }
  return Number(value);
}

async function prerequisiteSatisfied(
  transaction: ExamTransaction,
  participantUid: string,
  prerequisite: ExamPrerequisite
): Promise<boolean> {
  if (
    !isValidId(prerequisite.examId) ||
    !['completed', 'passed'].includes(prerequisite.mode) ||
    (prerequisite.minScoreBasisPoints !== undefined &&
      (!Number.isSafeInteger(prerequisite.minScoreBasisPoints) ||
        prerequisite.minScoreBasisPoints < 0 || prerequisite.minScoreBasisPoints > 10_000))
  ) {
    throw new Error('EXAM_PREREQUISITE_INVALID');
  }
  const where: ExamQuery['where'] = [
    { field: 'userId', value: participantUid },
    { field: 'examId', value: prerequisite.examId }
  ];
  const attempts = requireAttemptHistory(await transaction.list('exam_attempts', { where, limit: MAX_ATTEMPT_HISTORY }));
  const minimum = prerequisite.minScoreBasisPoints ?? 0;

  if (prerequisite.mode === 'completed') {
    if (attempts.some(attempt =>
      ['passed', 'failed', 'pending_review'].includes(String(attempt.status)) &&
      typeof attempt.submittedAtIso === 'string'
    )) return true;

    const legacyProgress = await transaction.list('exam_progress', {
      where: [
        { field: 'userId', value: participantUid },
        { field: 'targetId', value: prerequisite.examId }
      ],
      limit: MAX_ATTEMPT_HISTORY
    });
    if (legacyProgress.length >= MAX_ATTEMPT_HISTORY) throw new Error('EXAM_ATTEMPT_HISTORY_LIMIT');
    return legacyProgress.some(progress =>
      ['completed', 'passed', 'failed'].includes(String(progress.status))
    );
  }

  if (attempts.some(attempt =>
    attempt.status === 'passed' &&
    Number.isSafeInteger(attempt.finalScoreBasisPoints) &&
    Number(attempt.finalScoreBasisPoints) >= minimum
  )) return true;

  const verifications = await transaction.list('exam_legacy_verifications', {
    where,
    limit: MAX_ATTEMPT_HISTORY
  });
  if (verifications.length >= MAX_ATTEMPT_HISTORY) throw new Error('EXAM_ATTEMPT_HISTORY_LIMIT');
  return verifications.some(verification =>
    verification.verifiedStatus === 'passed' &&
    Number.isSafeInteger(verification.verifiedScoreBasisPoints) &&
    Number(verification.verifiedScoreBasisPoints) >= minimum
  );
}

async function assertPrerequisites(
  transaction: Parameters<Parameters<ExamRepository['runTransaction']>[0]>[0],
  master: ExamDocument,
  version: ExamVersionRecord,
  participantUid: string
): Promise<void> {
  const manualUnlocks = master.manualUnlockUserUids;
  if (manualUnlocks !== undefined && !Array.isArray(manualUnlocks)) {
    throw new Error('EXAM_MANUAL_UNLOCKS_INVALID');
  }
  if (Array.isArray(manualUnlocks) && manualUnlocks.includes(participantUid)) return;

  const prerequisites = version.prerequisites ?? [];
  if (!Array.isArray(prerequisites)) throw new Error('EXAM_PREREQUISITE_INVALID');
  for (const prerequisite of prerequisites) {
    if (!await prerequisiteSatisfied(transaction, participantUid, prerequisite)) {
      throw new Error('EXAM_PREREQUISITE_NOT_MET');
    }
  }
}

function sumQuestionPoints(questions: readonly ExamQuestion[]): number {
  let total = 0;
  for (const question of questions) {
    if (!Number.isSafeInteger(question.pointsMilli) || question.pointsMilli <= 0) {
      throw new Error('EXAM_PUBLISHED_VERSION_INVALID');
    }
    total += question.pointsMilli;
    if (!Number.isSafeInteger(total)) throw new Error('EXAM_PUBLISHED_VERSION_INVALID');
  }
  return total;
}

function toPublicAttempt(
  attempt: ExamAttemptRecord,
  version: ExamVersionRecord,
  serverTimeIso: string
): PublicExamAttempt {
  const presentationIds = attempt.matchingPresentationIds;
  if (!presentationIds) throw new Error('EXAM_MATCHING_PRESENTATION_INVALID');
  const answers = projectAttemptAnswers(attempt.answers, version.questionsSnapshot, presentationIds);
  return {
    id: attempt.id,
    examId: attempt.examId,
    title: version.title,
    assessmentStage: version.assessmentStage,
    attemptCourseCode: attempt.attemptCourseCode,
    attemptNumber: attempt.attemptNumber,
    startedAtIso: attempt.startedAtIso,
    deadlineIso: attempt.deadlineIso,
    lastHeartbeatAtIso: attempt.lastHeartbeatAtIso,
    currentRevision: attempt.currentRevision,
    status: 'in_progress',
    answers,
    questions: projectQuestionsForAttempt(version.questionsSnapshot, attempt.matchingShuffleOrders, presentationIds, attempt.matchingPairOrders || {}),
    totalPossiblePointsMilli: attempt.totalPossiblePointsMilli,
    passingScoreBasisPoints: version.passingScoreBasisPoints,
    serverTimeIso
  };
}

/** Startet atomar einen Versuch oder gibt den bereits aktiven Versuch idempotent zurück. */
export async function startExamAttempt(
  repository: ExamRepository,
  examId: string,
  participant: ExamParticipant,
  rawAttemptCourseCode: unknown,
  requestReceivedAtMs = Date.now(),
  createId: () => string = () => randomUUID()
): Promise<StartExamAttemptResult> {
  if (!isValidId(examId) || !participant.uid || !participant.displayName) {
    throw new Error('EXAM_PARTICIPANT_INVALID');
  }
  if (!Number.isSafeInteger(requestReceivedAtMs) || requestReceivedAtMs < 0) {
    throw new Error('EXAM_REQUEST_TIME_INVALID');
  }
  if (!Number.isSafeInteger(participant.clearanceLevel) || participant.clearanceLevel < 0) {
    throw new Error('EXAM_PARTICIPANT_INVALID');
  }
  const attemptCourseCode = normalizeCourseCode(rawAttemptCourseCode);
  if (!attemptCourseCode) throw new Error('EXAM_ATTEMPT_COURSE_INVALID');
  const nowIso = new Date(requestReceivedAtMs).toISOString();

  return repository.runTransaction(async transaction => {
    const master = await transaction.get('exam_masters', examId);
    if (!master) throw new Error('EXAM_DOCUMENT_NOT_FOUND');

    const query = {
      where: [
        { field: 'userId', value: participant.uid },
        { field: 'examId', value: examId }
      ],
      limit: MAX_ATTEMPT_HISTORY
    } satisfies ExamQuery;
    const userAttempts = requireAttemptHistory(
      await transaction.list<ExamAttemptRecord>('exam_attempts', query)
    );
    const activeAttempts = userAttempts.filter(attempt => attempt.status === 'in_progress');
    if (activeAttempts.length > 1) throw new Error('EXAM_MULTIPLE_ACTIVE_ATTEMPTS');
    const active = activeAttempts[0];
    if (active) {
      if (active.attemptCourseCode !== attemptCourseCode) {
        throw new Error('ACTIVE_ATTEMPT_DIFFERENT_COURSE');
      }
      // Ein laufender Versuch bleibt an seinen ursprünglichen unveränderlichen Snapshot gebunden,
      // auch wenn zwischenzeitlich eine neue Version veröffentlicht oder die Zuweisung geändert wurde.
      const activeVersion = validVersion(master, await transaction.get('exam_versions', active.examVersionId));
      if (activeVersion.versionNumber !== active.versionNumber) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
      const resumed = active.matchingPresentationIds && active.matchingPairOrders ? active : {
        ...active,
        matchingPresentationIds: active.matchingPresentationIds || createMatchingPresentationIds(activeVersion.questionsSnapshot),
        matchingPairOrders: active.matchingPairOrders || createMatchingPairOrders(activeVersion.questionsSnapshot)
      };
      if (resumed !== active) await transaction.update('exam_attempts', active.id, resumed);
      return { attempt: resumed, version: activeVersion, created: false };
    }

    if (master.status !== 'published' || master.startable !== true) {
      throw new Error('EXAM_NOT_STARTABLE');
    }
    const assigned = master.assignedCourseCodes;
    if (!Array.isArray(assigned) || !assigned.includes(attemptCourseCode)) {
      throw new Error('EXAM_COURSE_NOT_ASSIGNED');
    }
    const versionId = master.currentPublishedVersionId;
    if (typeof versionId !== 'string' || !isValidId(versionId)) {
      throw new Error('EXAM_PUBLISHED_VERSION_INVALID');
    }
    const version = validVersion(master, await transaction.get('exam_versions', versionId));
    if (participant.clearanceLevel < version.minClearance) {
      throw new Error('EXAM_CLEARANCE_INSUFFICIENT');
    }

    await assertPrerequisites(transaction, master, version, participant.uid);
    const extraAttempts = validateExtraAttempts(master, participant.uid);
    const attemptLimit = getAttemptLimit(version);
    const allCourseAttempts = userAttempts.filter(attempt => attempt.attemptCourseCode === attemptCourseCode);
    const countableCourseAttempts = allCourseAttempts.filter(attempt => attempt.status !== 'invalidated_by_admin');
    if (attemptLimit !== null) {
      const effectiveLimit = attemptLimit + extraAttempts;
      if (!Number.isSafeInteger(effectiveLimit)) throw new Error('EXAM_ATTEMPT_LIMIT_INVALID');
      if (countableCourseAttempts.length >= effectiveLimit) {
        throw new Error('EXAM_ATTEMPT_LIMIT_REACHED');
      }
    }
    const attemptNumber = allCourseAttempts.length + 1;
    if (!Number.isSafeInteger(attemptNumber)) throw new Error('EXAM_ATTEMPT_LIMIT_INVALID');

    const timeLimitMinutes = version.timeLimitMinutes;
    const deadlineMs = timeLimitMinutes === 0
      ? null
      : requestReceivedAtMs + timeLimitMinutes * 60_000;
    if (deadlineMs !== null && !Number.isSafeInteger(deadlineMs)) {
      throw new Error('EXAM_TIME_LIMIT_INVALID');
    }
    const questions = version.questionsSnapshot;
    const matchingShuffleOrders = createMatchingShuffleOrders(questions);
    const matchingPairOrders = createMatchingPairOrders(questions);
    const matchingPresentationIds = createMatchingPresentationIds(questions);
    const attemptId = createId();
    if (!isValidId(attemptId)) throw new Error('EXAM_ATTEMPT_ID_INVALID');
    const totalPossiblePointsMilli = sumQuestionPoints(questions);
    const document: ExamAttemptRecord = {
      id: attemptId,
      userId: participant.uid,
      userName: participant.displayName.slice(0, 200),
      examId,
      examVersionId: versionId,
      versionNumber: version.versionNumber,
      attemptCourseCode,
      assignedCourseCodesAtStart: [...assigned],
      moduleCode: attemptCourseCode,
      assessmentStage: version.assessmentStage,
      attemptNumber,
      startedAtIso: nowIso,
      deadlineIso: deadlineMs === null ? null : new Date(deadlineMs).toISOString(),
      lastHeartbeatAtIso: nowIso,
      currentRevision: 0,
      status: 'in_progress',
      answers: {},
      matchingShuffleOrders,
      matchingPairOrders,
      matchingPresentationIds,
      totalPossiblePointsMilli,
      automaticallyEarnedPointsMilli: 0,
      manuallyEarnedPointsMilli: 0,
      preliminaryScoreBasisPoints: 0,
      finalScoreBasisPoints: null
    };
    await transaction.create('exam_attempts', attemptId, document);
    return { attempt: document, version, created: true };
  });
}

/** Lädt ausschließlich den eigenen aktiven Versuch; keine Lösungsschlüssel werden zurückgegeben. */
export async function getActiveExamAttempt(
  repository: ExamRepository,
  examId: string,
  participantUid: string,
  rawAttemptCourseCode: unknown,
  serverTimeMs = Date.now()
): Promise<PublicExamAttempt | null> {
  if (!isValidId(examId) || !participantUid) throw new Error('EXAM_PARTICIPANT_INVALID');
  const attemptCourseCode = normalizeCourseCode(rawAttemptCourseCode);
  if (!attemptCourseCode) throw new Error('EXAM_ATTEMPT_COURSE_INVALID');
  const attempts = requireAttemptHistory(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [
      { field: 'userId', value: participantUid },
      { field: 'examId', value: examId }
    ],
    limit: MAX_ATTEMPT_HISTORY
  }));
  const active = attempts.filter(attempt => attempt.status === 'in_progress');
  if (active.length > 1) throw new Error('EXAM_MULTIPLE_ACTIVE_ATTEMPTS');
  if (active.length === 0) return null;
  if (active[0].attemptCourseCode !== attemptCourseCode) {
    throw new Error('ACTIVE_ATTEMPT_DIFFERENT_COURSE');
  }
  const version = validVersion(
    { id: examId },
    await repository.get('exam_versions', active[0].examVersionId)
  );
  if (version.versionNumber !== active[0].versionNumber) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
  let attempt = active[0];
  if (!attempt.matchingPresentationIds || !attempt.matchingPairOrders) {
    attempt = await repository.runTransaction(async transaction => {
      const current = await transaction.get<ExamAttemptRecord>('exam_attempts', attempt.id);
      if (!current || current.userId !== participantUid || current.examId !== examId || current.status !== 'in_progress') {
        throw new Error('EXAM_ATTEMPT_NOT_ACTIVE');
      }
      if (current.matchingPresentationIds && current.matchingPairOrders) return current;
      const updated = {
        ...current,
        matchingPresentationIds: current.matchingPresentationIds || createMatchingPresentationIds(version.questionsSnapshot),
        matchingPairOrders: current.matchingPairOrders || createMatchingPairOrders(version.questionsSnapshot)
      };
      await transaction.update('exam_attempts', current.id, updated);
      return updated;
    });
  }
  return toPublicAttempt(attempt, version, new Date(serverTimeMs).toISOString());
}

/** Sichere Teilnehmerprojektion eines neu gestarteten oder idempotent gefundenen Versuchs. */
export function projectStartedExamAttempt(
  result: StartExamAttemptResult,
  serverTimeMs = Date.now()
): PublicExamAttempt {
  return toPublicAttempt(result.attempt, result.version, new Date(serverTimeMs).toISOString());
}
