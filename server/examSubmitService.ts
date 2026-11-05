/**
 * Transaktionssichere Abgabe und serverseitige Auswertung eines Prüfungsversuchs.
 * Grundlage: EXAM_WORKSHOP_ARCHITECTURE_V3.8, §§3.4, 9, 11, 12 und 19.6.
 */
import type { ExamRepository } from './examRepository.ts';
import type { ExamDocument } from './examRepositoryTypes.ts';
import { evaluateExamAnswers, parseAttemptAnswers } from './examRunner.ts';
import type { ExamAttemptRecord, ExamVersionRecord } from './examAttemptService.ts';
import type { ExamQuestion } from './examTypes.ts';
import { isValidId } from './examValidate.ts';

export interface PublicExamSubmission {
  id: string;
  examId: string;
  title: string;
  assessmentStage: 'test' | 'final_exam';
  attemptCourseCode: string;
  attemptNumber: number;
  submittedAtIso: string;
  status: 'passed' | 'failed' | 'pending_review';
  totalPossiblePointsMilli: number;
  automaticallyEarnedPointsMilli: number;
  manuallyEarnedPointsMilli: number;
  preliminaryScoreBasisPoints: number;
  finalScoreBasisPoints: number | null;
  requiresManualReview: boolean;
  questionResults: Array<{
    questionId: string;
    pointsEarnedMilli: number;
    maxPointsMilli: number;
    requiresManualReview: boolean;
    correct?: boolean;
    explanation?: string;
  }>;
}

export interface SubmitExamAttemptResult {
  submission: PublicExamSubmission;
  expired: boolean;
  alreadySubmitted: boolean;
}

function validAttemptVersion(
  examId: string,
  attempt: ExamAttemptRecord,
  version: ExamDocument | null
): ExamVersionRecord {
  if (
    !version ||
    version.id !== attempt.examVersionId ||
    version.examId !== examId ||
    version.versionNumber !== attempt.versionNumber ||
    (version.assessmentStage !== 'test' && version.assessmentStage !== 'final_exam') ||
    version.assessmentStage !== attempt.assessmentStage ||
    !Array.isArray(version.questionsSnapshot) ||
    version.questionsSnapshot.length === 0 ||
    !Number.isSafeInteger(version.passingScoreBasisPoints) ||
    Number(version.passingScoreBasisPoints) < 0 ||
    Number(version.passingScoreBasisPoints) > 10_000 ||
    typeof version.title !== 'string'
  ) {
    throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
  }
  return version as unknown as ExamVersionRecord;
}

function toPublicSubmission(
  attempt: ExamAttemptRecord,
  version: ExamVersionRecord
): PublicExamSubmission {
  const grades = Array.isArray(attempt.questionGrades) ? attempt.questionGrades as Array<{
    questionId: string;
    pointsEarnedMilli: number;
    maxPointsMilli: number;
    requiresManualReview: boolean;
    correct?: boolean;
  }> : [];
  const questionsById = new Map<string, ExamQuestion>(version.questionsSnapshot.map(question => [question.id, question] as const));
  return {
    id: attempt.id,
    examId: attempt.examId,
    title: version.title,
    assessmentStage: version.assessmentStage,
    attemptCourseCode: attempt.attemptCourseCode,
    attemptNumber: attempt.attemptNumber,
    submittedAtIso: String(attempt.submittedAtIso),
    status: attempt.status as 'passed' | 'failed' | 'pending_review',
    totalPossiblePointsMilli: attempt.totalPossiblePointsMilli,
    automaticallyEarnedPointsMilli: attempt.automaticallyEarnedPointsMilli,
    manuallyEarnedPointsMilli: attempt.manuallyEarnedPointsMilli,
    preliminaryScoreBasisPoints: Number(attempt.preliminaryScoreBasisPoints ?? 0),
    finalScoreBasisPoints: typeof attempt.finalScoreBasisPoints === 'number'
      ? attempt.finalScoreBasisPoints
      : null,
    requiresManualReview: attempt.status === 'pending_review',
    questionResults: version.assessmentStage === 'final_exam' ? [] : grades.map(grade => {
      const question = questionsById.get(grade.questionId);
      const result: PublicExamSubmission['questionResults'][number] = {
        questionId: grade.questionId,
        pointsEarnedMilli: grade.pointsEarnedMilli,
        maxPointsMilli: grade.maxPointsMilli,
        requiresManualReview: grade.requiresManualReview
      };
      // Lösungshinweise und Richtig/Falsch-Angaben sind ausschließlich bei Übungstests sichtbar.
      if (version.assessmentStage === 'test') {
        if (typeof grade.correct === 'boolean') result.correct = grade.correct;
        if (question?.explanation) result.explanation = question.explanation;
      }
      return result;
    })
  };
}

function finalizeAttempt(
  attempt: ExamAttemptRecord,
  version: ExamVersionRecord,
  requestReceivedAtMs: number,
  expired: boolean
): ExamAttemptRecord {
  const answers = parseAttemptAnswers(attempt.answers, version.questionsSnapshot);
  const grade = evaluateExamAnswers(
    version.questionsSnapshot,
    answers,
    version.passingScoreBasisPoints
  );
  if (
    grade.totalPossiblePointsMilli !== attempt.totalPossiblePointsMilli ||
    grade.questionGrades.length !== version.questionsSnapshot.length
  ) {
    throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
  }
  const submittedAtMs = expired && attempt.deadlineIso !== null
    ? Date.parse(attempt.deadlineIso)
    : requestReceivedAtMs;
  if (!Number.isFinite(submittedAtMs)) throw new Error('EXAM_ATTEMPT_DEADLINE_INVALID');

  return {
    ...attempt,
    status: grade.status,
    submittedAtIso: new Date(submittedAtMs).toISOString(),
    ...(expired ? { autoFinalizedAtIso: new Date(requestReceivedAtMs).toISOString() } : {}),
    submissionReason: expired ? 'time_expired' : 'submitted',
    automaticallyEarnedPointsMilli: grade.automaticallyEarnedPointsMilli,
    manuallyEarnedPointsMilli: 0,
    preliminaryScoreBasisPoints: grade.preliminaryScoreBasisPoints,
    finalScoreBasisPoints: grade.finalScoreBasisPoints,
    questionGrades: grade.questionGrades
  };
}

/**
 * Die Abgabe verwendet ausschließlich den letzten rechtzeitig gespeicherten Autosave-Stand.
 * Eine Transaktion macht Abgabe, Ablaufabschluss und parallele Autosaves gegenseitig eindeutig.
 */
export async function submitExamAttempt(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  participantUid: string,
  requestReceivedAtMs = Date.now()
): Promise<SubmitExamAttemptResult> {
  if (!isValidId(examId) || !isValidId(attemptId) || typeof participantUid !== 'string' || !participantUid) {
    throw new Error('EXAM_PARTICIPANT_INVALID');
  }
  if (!Number.isSafeInteger(requestReceivedAtMs) || requestReceivedAtMs < 0) {
    throw new Error('EXAM_REQUEST_TIME_INVALID');
  }

  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.userId !== participantUid) throw new Error('EXAM_ATTEMPT_FORBIDDEN');

    const version = validAttemptVersion(
      examId,
      attempt,
      await transaction.get('exam_versions', attempt.examVersionId)
    );

    // Wiederholte Abgaben sind idempotent: Sie liefern dasselbe gespeicherte Ergebnis zurück.
    if (attempt.status === 'passed' || attempt.status === 'failed' || attempt.status === 'pending_review') {
      if (typeof attempt.submittedAtIso !== 'string' || !Array.isArray(attempt.questionGrades)) {
        throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
      }
      return {
        submission: toPublicSubmission(attempt, version),
        expired: attempt.submissionReason === 'time_expired',
        alreadySubmitted: true
      };
    }
    if (attempt.status !== 'in_progress') throw new Error('EXAM_ATTEMPT_NOT_ACTIVE');

    let expired = false;
    if (attempt.deadlineIso !== null) {
      const deadlineMs = Date.parse(attempt.deadlineIso);
      if (!Number.isFinite(deadlineMs)) throw new Error('EXAM_ATTEMPT_DEADLINE_INVALID');
      expired = requestReceivedAtMs > deadlineMs;
    }

    const finalized = finalizeAttempt(attempt, version, requestReceivedAtMs, expired);
    await transaction.update('exam_attempts', attemptId, finalized);
    return {
      submission: toPublicSubmission(finalized, version),
      expired,
      alreadySubmitted: false
    };
  });
}
