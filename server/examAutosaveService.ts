/**
 * Revisionsgesicherter Autosave für laufende Prüfungsversuche.
 * Grundlage: EXAM_WORKSHOP_ARCHITECTURE_V3.8, §§11 und 19.4.
 */
import type { ExamRepository } from './examRepository.ts';
import type { ExamDocument } from './examRepositoryTypes.ts';
import { parseAttemptAnswers, projectQuestionsForAttempt } from './examRunner.ts';
import type { ExamAttemptRecord, ExamVersionRecord, PublicExamAttempt } from './examAttemptService.ts';
import { isValidId } from './examValidate.ts';

const MAX_AUTOSAVE_BODY_BYTES = 64 * 1024;
const MAX_REVISION_JUMP = 100;

export interface SaveExamAttemptAnswersResult {
  attempt: PublicExamAttempt;
  saved: boolean;
  stale: boolean;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validAttemptVersion(
  examId: string,
  attempt: ExamAttemptRecord,
  version: ExamDocument | null
): ExamVersionRecord {
  if (
    !version ||
    version.examId !== examId ||
    version.id !== attempt.examVersionId ||
    version.versionNumber !== attempt.versionNumber ||
    !Array.isArray(version.questionsSnapshot) ||
    version.questionsSnapshot.length === 0 ||
    !Number.isSafeInteger(version.passingScoreBasisPoints) ||
    Number(version.passingScoreBasisPoints) < 0 ||
    Number(version.passingScoreBasisPoints) > 10_000 ||
    (version.assessmentStage !== 'test' && version.assessmentStage !== 'final_exam') ||
    typeof version.title !== 'string'
  ) {
    throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
  }
  return version as unknown as ExamVersionRecord;
}

function publicProjection(
  attempt: ExamAttemptRecord,
  version: ExamVersionRecord,
  serverTimeMs: number
): PublicExamAttempt {
  const answers = parseAttemptAnswers(attempt.answers, version.questionsSnapshot);
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
    matchingShuffleOrders: attempt.matchingShuffleOrders,
    questions: projectQuestionsForAttempt(version.questionsSnapshot, attempt.matchingShuffleOrders),
    totalPossiblePointsMilli: attempt.totalPossiblePointsMilli,
    passingScoreBasisPoints: version.passingScoreBasisPoints,
    serverTimeIso: new Date(serverTimeMs).toISOString()
  };
}

/**
 * Speichert nur den vollständigen, gegen den ursprünglichen Snapshot validierten Antwortstand.
 * Die Repository-Transaktion serialisiert konkurrierende Writes; veraltete Revisionen überschreiben
 * niemals einen neueren Stand.
 */
export async function saveExamAttemptAnswers(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  participantUid: string,
  rawRevision: unknown,
  rawAnswers: unknown,
  requestReceivedAtMs = Date.now()
): Promise<SaveExamAttemptAnswersResult> {
  if (!isValidId(examId) || !isValidId(attemptId) || typeof participantUid !== 'string' || !participantUid) {
    throw new Error('EXAM_PARTICIPANT_INVALID');
  }
  if (!Number.isSafeInteger(requestReceivedAtMs) || requestReceivedAtMs < 0) {
    throw new Error('EXAM_REQUEST_TIME_INVALID');
  }
  if (typeof rawRevision !== 'number' || !Number.isSafeInteger(rawRevision) || rawRevision < 1) {
    throw new Error('EXAM_REVISION_INVALID');
  }
  if (!isPlainRecord(rawAnswers)) throw new Error('EXAM_ANSWERS_INVALID');

  let serialized: string;
  try {
    serialized = JSON.stringify({ revision: rawRevision, answers: rawAnswers });
  } catch {
    throw new Error('EXAM_ANSWERS_INVALID');
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_AUTOSAVE_BODY_BYTES) {
    throw new Error('EXAM_AUTOSAVE_TOO_LARGE');
  }

  const revision = Number(rawRevision);
  const serverTimeIso = new Date(requestReceivedAtMs).toISOString();

  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.userId !== participantUid) throw new Error('EXAM_ATTEMPT_FORBIDDEN');
    if (attempt.status !== 'in_progress') throw new Error('EXAM_ATTEMPT_NOT_ACTIVE');

    const version = validAttemptVersion(
      examId,
      attempt,
      await transaction.get('exam_versions', attempt.examVersionId)
    );

    if (!Number.isSafeInteger(attempt.currentRevision) || attempt.currentRevision < 0) {
      throw new Error('EXAM_ATTEMPT_REVISION_INVALID');
    }
    if (attempt.deadlineIso !== null) {
      const deadlineMs = Date.parse(attempt.deadlineIso);
      if (!Number.isFinite(deadlineMs)) throw new Error('EXAM_ATTEMPT_DEADLINE_INVALID');
      if (requestReceivedAtMs > deadlineMs) throw new Error('EXAM_ATTEMPT_EXPIRED');
    }

    // Ein verspätet eintreffender älterer Autosave darf den neueren Serverstand nicht überschreiben.
    if (revision <= attempt.currentRevision) {
      return {
        attempt: publicProjection(attempt, version, requestReceivedAtMs),
        saved: false,
        stale: true
      };
    }
    if (revision > attempt.currentRevision + MAX_REVISION_JUMP) {
      throw new Error('EXAM_REVISION_JUMP_INVALID');
    }

    const answers = parseAttemptAnswers(rawAnswers, version.questionsSnapshot);
    const currentAnswers = parseAttemptAnswers(attempt.answers, version.questionsSnapshot);
    if (JSON.stringify(answers) === JSON.stringify(currentAnswers)) {
      return {
        attempt: publicProjection(attempt, version, requestReceivedAtMs),
        saved: false,
        stale: false
      };
    }

    const updated: ExamAttemptRecord = {
      ...attempt,
      answers,
      currentRevision: revision,
      lastHeartbeatAtIso: serverTimeIso
    };
    await transaction.update('exam_attempts', attemptId, updated);

    return {
      attempt: publicProjection(updated, version, requestReceivedAtMs),
      saved: true,
      stale: false
    };
  });
}
