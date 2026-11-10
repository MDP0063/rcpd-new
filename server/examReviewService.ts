import type { ExamRepository } from './examRepository.ts';
import type { ExamAttemptRecord, ExamVersionRecord } from './examAttemptService.ts';
import { scoreExam } from './examScore.ts';
import { toParticipantSubmission, toPublicSubmission, type PublicExamSubmission } from './examSubmitService.ts';

const HISTORY_LIMIT = 1000;

function ensureBounded<T>(items: T[]): T[] {
  if (items.length >= HISTORY_LIMIT) throw new Error('EXAM_ATTEMPT_HISTORY_LIMIT');
  return items;
}

function pendingFreeTextQuestions(attempt: ExamAttemptRecord, version: ExamVersionRecord): Array<{ questionId: string; question: string; answer: string; pointsMilli: number; gradingRubric: string }> {
  return version.questionsSnapshot.flatMap(question => {
    if (question.type !== 'free_text') return [];
    const answer = attempt.answers?.[question.id];
    if (typeof answer !== 'string' || !answer.trim()) return [];
    const graded = Array.isArray(attempt.questionGrades) && attempt.questionGrades.some((grade: any) => grade?.questionId === question.id && grade?.requiresManualReview === false);
    if (graded) return [];
    return [{ questionId: question.id, question: question.question, answer, pointsMilli: question.pointsMilli, gradingRubric: question.gradingRubric || '' }];
  });
}

export interface ExamReviewItem {
  id: string;
  examId: string;
  examTitle: string;
  userName: string;
  attemptCourseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  questions: ReturnType<typeof pendingFreeTextQuestions>;
}

export async function listExamReviews(repository: ExamRepository, allowedCourseCodes: readonly string[]): Promise<ExamReviewItem[]> {
  const attempts = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'pending_review' }], limit: HISTORY_LIMIT
  }));
  const allowed = new Set(allowedCourseCodes.map(code => code.toUpperCase()));
  const results: ExamReviewItem[] = [];
  for (const attempt of attempts) {
    if (!allowed.has('*') && !allowed.has(attempt.attemptCourseCode.toUpperCase())) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    const questions = pendingFreeTextQuestions(attempt, version);
    if (questions.length) results.push({
      id: attempt.id, examId: attempt.examId, examTitle: version.title, userName: attempt.userName,
      attemptCourseCode: attempt.attemptCourseCode, submittedAtIso: String(attempt.submittedAtIso || ''),
      assessmentStage: version.assessmentStage, questions
    });
  }
  return results;
}

export async function gradeExamAttempt(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  gradesInput: unknown,
  nowIso = new Date().toISOString()
): Promise<PublicExamSubmission> {
  if (!reviewerUid) throw new Error('EXAM_REVIEWER_INVALID');
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.userId === reviewerUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    if (attempt.status !== 'pending_review') throw new Error('EXAM_REVIEW_NOT_PENDING');
    const version = await transaction.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId || version.versionNumber !== attempt.versionNumber || !Array.isArray(version.questionsSnapshot)) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    if (!Array.isArray(gradesInput)) throw new Error('EXAM_MANUAL_GRADES_INVALID');

    const openQuestions = pendingFreeTextQuestions(attempt, version);
    const openIds = new Set(openQuestions.map(question => question.questionId));
    const grades: Record<string, number> = {};
    for (const entry of gradesInput) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(key => key !== 'questionId' && key !== 'pointsEarnedMilli')) throw new Error('EXAM_MANUAL_GRADES_INVALID');
      const { questionId, pointsEarnedMilli } = entry as Record<string, unknown>;
      const question = openQuestions.find(item => item.questionId === questionId);
      if (!question || Object.prototype.hasOwnProperty.call(grades, String(questionId)) || !Number.isSafeInteger(pointsEarnedMilli) || Number(pointsEarnedMilli) < 0 || Number(pointsEarnedMilli) > question.pointsMilli) throw new Error('EXAM_MANUAL_GRADES_INVALID');
      grades[question.questionId] = Number(pointsEarnedMilli);
    }
    if (Object.keys(grades).length !== openIds.size) throw new Error('EXAM_MANUAL_GRADES_INCOMPLETE');

    const result = scoreExam(version.questionsSnapshot, attempt.answers as any, version.passingScoreBasisPoints, grades);
    const oldGrades = new Map((Array.isArray(attempt.questionGrades) ? attempt.questionGrades as Array<Record<string, unknown>> : []).map(grade => [String(grade.questionId), grade]));
    const questionGrades = result.questionResults.map(question => ({
      questionId: question.questionId,
      pointsEarnedMilli: question.earnedPointsMilli ?? 0,
      maxPointsMilli: question.maxPointsMilli,
      requiresManualReview: question.needsManualReview,
      ...(typeof oldGrades.get(question.questionId)?.correct === 'boolean' ? { correct: oldGrades.get(question.questionId)!.correct } : {})
    }));
    const finalized: ExamAttemptRecord = {
      ...attempt,
      status: result.status,
      manuallyEarnedPointsMilli: result.manualEarnedPointsMilli,
      preliminaryScoreBasisPoints: result.preliminaryScoreBasisPoints,
      finalScoreBasisPoints: result.finalScoreBasisPoints,
      questionGrades,
      reviewedByUid: reviewerUid,
      reviewedAtIso: nowIso
    };
    await transaction.update('exam_attempts', attemptId, finalized);
    return toPublicSubmission(finalized, version);
  });
}


export interface CompletedManualReviewItem extends ExamReviewItem {
  status: 'passed' | 'failed';
  finalScoreBasisPoints: number | null;
  reviewedAtIso: string;
  reviewedByUid: string;
  reviewCorrections: Array<{
    reviewerUid: string; atIso: string; reason: string;
    previousReviewerUid: string; previousReviewedAtIso: string;
    previousManualPointsMilli: number; nextManualPointsMilli: number;
    previousStatus: 'passed' | 'failed'; nextStatus: 'passed' | 'failed';
    previousScoreBasisPoints: number | null; nextScoreBasisPoints: number | null;
    previousGrades: Array<{ questionId: string; pointsEarnedMilli: number }>;
    nextGrades: Array<{ questionId: string; pointsEarnedMilli: number }>;
  }>;
  questions: Array<ReturnType<typeof pendingFreeTextQuestions>[number] & { pointsEarnedMilli: number }>;
}

function completedFreeTextQuestions(attempt: ExamAttemptRecord, version: ExamVersionRecord) {
  const grades = new Map(
    (Array.isArray(attempt.questionGrades) ? attempt.questionGrades : [])
      .map((grade: any) => [String(grade?.questionId || ''), grade])
  );
  return version.questionsSnapshot.flatMap(question => {
    if (question.type !== 'free_text') return [];
    const answer = attempt.answers?.[question.id];
    const grade = grades.get(question.id) as Record<string, unknown> | undefined;
    if (typeof answer !== 'string' || !answer.trim() || !grade || grade.requiresManualReview !== false) return [];
    const pointsEarnedMilli = grade.pointsEarnedMilli;
    if (!Number.isSafeInteger(pointsEarnedMilli) || Number(pointsEarnedMilli) < 0 || Number(pointsEarnedMilli) > question.pointsMilli) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    return [{
      questionId: question.id, question: question.question, answer,
      pointsMilli: question.pointsMilli, gradingRubric: question.gradingRubric || '',
      pointsEarnedMilli: Number(pointsEarnedMilli)
    }];
  });
}

export async function listCompletedManualReviews(repository: ExamRepository): Promise<CompletedManualReviewItem[]> {
  const passed = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'passed' }], limit: HISTORY_LIMIT
  }));
  const failed = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'failed' }], limit: HISTORY_LIMIT
  }));
  const attempts = [...passed, ...failed].sort((a, b) =>
    String(b.submittedAtIso || '').localeCompare(String(a.submittedAtIso || ''))
  );
  const results: CompletedManualReviewItem[] = [];
  for (const attempt of attempts) {
    if (!attempt.reviewedByUid || !attempt.reviewedAtIso) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    const questions = completedFreeTextQuestions(attempt, version);
    if (questions.length) results.push({
      id: attempt.id, examId: attempt.examId, examTitle: version.title, userName: attempt.userName,
      attemptCourseCode: attempt.attemptCourseCode, submittedAtIso: String(attempt.submittedAtIso || ''),
      assessmentStage: version.assessmentStage, status: attempt.status as 'passed' | 'failed',
      finalScoreBasisPoints: Number.isSafeInteger(attempt.finalScoreBasisPoints) ? Number(attempt.finalScoreBasisPoints) : null,
      reviewedAtIso: String(attempt.reviewedAtIso), reviewedByUid: String(attempt.reviewedByUid),
      reviewCorrections: Array.isArray(attempt.reviewCorrections) ? attempt.reviewCorrections as CompletedManualReviewItem['reviewCorrections'] : [], questions
    });
  }
  return results;
}

export async function correctCompletedExamReview(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  reviewerUid: string,
  gradesInput: unknown,
  reasonInput: unknown,
  nowIso = new Date().toISOString()
): Promise<PublicExamSubmission> {
  if (!reviewerUid) throw new Error('EXAM_REVIEWER_INVALID');
  const reason = typeof reasonInput === 'string' ? reasonInput.trim() : '';
  if (reason.length < 10 || reason.length > 1000) throw new Error('EXAM_REVIEW_CORRECTION_REASON_INVALID');
  if (Number.isNaN(Date.parse(nowIso))) throw new Error('EXAM_REVIEW_CORRECTION_TIME_INVALID');

  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.userId === reviewerUid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
    if (attempt.status !== 'passed' && attempt.status !== 'failed') throw new Error('EXAM_REVIEW_CORRECTION_NOT_COMPLETED');
    if (!attempt.reviewedByUid || !attempt.reviewedAtIso) throw new Error('EXAM_REVIEW_CORRECTION_NOT_COMPLETED');
    const version = await transaction.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId || version.versionNumber !== attempt.versionNumber || !Array.isArray(version.questionsSnapshot)) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    if (!Array.isArray(gradesInput)) throw new Error('EXAM_MANUAL_GRADES_INVALID');

    const questions = completedFreeTextQuestions(attempt, version);
    if (!questions.length) throw new Error('EXAM_REVIEW_CORRECTION_NOT_COMPLETED');
    const grades: Record<string, number> = {};
    for (const entry of gradesInput) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
          Object.keys(entry).some(key => key !== 'questionId' && key !== 'pointsEarnedMilli')) {
        throw new Error('EXAM_MANUAL_GRADES_INVALID');
      }
      const { questionId, pointsEarnedMilli } = entry as Record<string, unknown>;
      const question = questions.find(item => item.questionId === questionId);
      if (!question || Object.prototype.hasOwnProperty.call(grades, String(questionId)) ||
          !Number.isSafeInteger(pointsEarnedMilli) || Number(pointsEarnedMilli) < 0 ||
          Number(pointsEarnedMilli) > question.pointsMilli) {
        throw new Error('EXAM_MANUAL_GRADES_INVALID');
      }
      grades[question.questionId] = Number(pointsEarnedMilli);
    }
    if (Object.keys(grades).length !== questions.length) throw new Error('EXAM_MANUAL_GRADES_INCOMPLETE');

    const result = scoreExam(version.questionsSnapshot, attempt.answers as any, version.passingScoreBasisPoints, grades);
    const oldGrades = new Map((Array.isArray(attempt.questionGrades) ? attempt.questionGrades as Array<Record<string, unknown>> : []).map(grade => [String(grade.questionId), grade]));
    const questionGrades = result.questionResults.map(question => ({
      questionId: question.questionId,
      pointsEarnedMilli: question.earnedPointsMilli ?? 0,
      maxPointsMilli: question.maxPointsMilli,
      requiresManualReview: question.needsManualReview,
      ...(typeof oldGrades.get(question.questionId)?.correct === 'boolean' ? { correct: oldGrades.get(question.questionId)!.correct } : {})
    }));
    const previousCorrectionHistory = Array.isArray(attempt.reviewCorrections) ? attempt.reviewCorrections : [];
    if (previousCorrectionHistory.length >= 100) throw new Error('EXAM_REVIEW_CORRECTION_LIMIT');
    const correction = {
      reviewerUid, atIso: nowIso, reason,
      previousReviewerUid: attempt.reviewedByUid,
      previousReviewedAtIso: attempt.reviewedAtIso,
      previousManualPointsMilli: attempt.manuallyEarnedPointsMilli,
      nextManualPointsMilli: result.manualEarnedPointsMilli,
      previousStatus: attempt.status,
      nextStatus: result.status,
      previousScoreBasisPoints: attempt.finalScoreBasisPoints ?? null,
      nextScoreBasisPoints: result.finalScoreBasisPoints,
      previousGrades: questions.map(question => ({ questionId: question.questionId, pointsEarnedMilli: question.pointsEarnedMilli })),
      nextGrades: questions.map(question => ({ questionId: question.questionId, pointsEarnedMilli: grades[question.questionId] }))
    };
    const corrected: ExamAttemptRecord = {
      ...attempt,
      status: result.status,
      manuallyEarnedPointsMilli: result.manualEarnedPointsMilli,
      preliminaryScoreBasisPoints: result.preliminaryScoreBasisPoints,
      finalScoreBasisPoints: result.finalScoreBasisPoints,
      questionGrades,
      reviewedByUid: reviewerUid,
      reviewedAtIso: nowIso,
      reviewCorrections: [...previousCorrectionHistory, correction],
      ...(attempt.resultReleaseStatus === 'released' ? { resultReleaseStatus: 'pending_rerelease' as const } : {})
    };
    await transaction.update('exam_attempts', attemptId, corrected);
    return toPublicSubmission(corrected, version);
  });
}

export async function listOwnExamResults(repository: ExamRepository, uid: string): Promise<PublicExamSubmission[]> {
  const attempts = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'userId', value: uid }], limit: HISTORY_LIMIT
  }));
  const results: PublicExamSubmission[] = [];
  for (const attempt of attempts) {
    if (!['passed', 'failed', 'pending_review'].includes(attempt.status)) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    results.push(toParticipantSubmission(attempt, version));
  }
  return results.sort((left, right) => right.submittedAtIso.localeCompare(left.submittedAtIso));
}


export interface ExamResultReleaseQueueItem {
  id: string;
  examId: string;
  examTitle: string;
  userName: string;
  attemptCourseCode: string;
  submittedAtIso: string;
  assessmentStage: 'test' | 'final_exam';
  status: 'passed' | 'failed';
  finalScoreBasisPoints: number | null;
  resultReleaseStatus: 'unreleased' | 'pending_rerelease';
  resultReleaseHistory: Array<{ releasedByUid: string; releasedAtIso: string; status: 'passed' | 'failed'; finalScoreBasisPoints: number | null }>;
}

export async function listPendingExamResultReleases(repository: ExamRepository): Promise<ExamResultReleaseQueueItem[]> {
  const passed = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'passed' }], limit: HISTORY_LIMIT
  }));
  const failed = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'status', value: 'failed' }], limit: HISTORY_LIMIT
  }));
  if (passed.length + failed.length >= HISTORY_LIMIT) throw new Error('EXAM_ATTEMPT_HISTORY_LIMIT');
  const attempts = [...passed, ...failed];
  const results: ExamResultReleaseQueueItem[] = [];
  for (const attempt of attempts) {
    if (attempt.status !== 'passed' && attempt.status !== 'failed') continue;
    if (attempt.resultReleaseStatus === 'released') continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    // Historische oder beschädigte Versuche ohne exakt passende unveränderliche Version
    // dürfen nicht zur Freigabe angeboten werden.
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) continue;
    results.push({
      id: attempt.id, examId: attempt.examId, examTitle: version.title, userName: attempt.userName,
      attemptCourseCode: attempt.attemptCourseCode, submittedAtIso: String(attempt.submittedAtIso || ''),
      assessmentStage: version.assessmentStage, status: attempt.status,
      finalScoreBasisPoints: Number.isSafeInteger(attempt.finalScoreBasisPoints) ? Number(attempt.finalScoreBasisPoints) : null,
      resultReleaseStatus: attempt.resultReleaseStatus === 'pending_rerelease' ? 'pending_rerelease' : 'unreleased',
      resultReleaseHistory: Array.isArray(attempt.resultReleaseHistory) ? attempt.resultReleaseHistory : []
    });
  }
  return results.sort((a, b) => a.submittedAtIso.localeCompare(b.submittedAtIso));
}

export async function releaseExamResult(
  repository: ExamRepository,
  examId: string,
  attemptId: string,
  releasedByUid: string,
  releasedAtIso = new Date().toISOString()
): Promise<PublicExamSubmission> {
  if (!releasedByUid) throw new Error('EXAM_RESULT_RELEASE_ACTOR_INVALID');
  if (!Number.isFinite(Date.parse(releasedAtIso))) throw new Error('EXAM_RESULT_RELEASE_TIME_INVALID');
  return repository.runTransaction(async transaction => {
    const attempt = await transaction.get<ExamAttemptRecord>('exam_attempts', attemptId);
    if (!attempt || attempt.examId !== examId) throw new Error('EXAM_ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'passed' && attempt.status !== 'failed') throw new Error('EXAM_RESULT_NOT_FINAL');
    const version = await transaction.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== examId || version.versionNumber !== attempt.versionNumber) {
      throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    }
    if (attempt.resultReleaseStatus === 'released') return toPublicSubmission(attempt, version);
    const history = Array.isArray(attempt.resultReleaseHistory) ? attempt.resultReleaseHistory : [];
    if (history.length >= 100) throw new Error('EXAM_RESULT_RELEASE_HISTORY_LIMIT');
    const updated: ExamAttemptRecord = {
      ...attempt,
      resultReleaseStatus: 'released',
      resultReleaseHistory: [...history, {
        releasedByUid,
        releasedAtIso,
        status: attempt.status,
        finalScoreBasisPoints: Number.isSafeInteger(attempt.finalScoreBasisPoints) ? Number(attempt.finalScoreBasisPoints) : null
      }]
    };
    await transaction.update('exam_attempts', attemptId, updated);
    return toPublicSubmission(updated, version);
  });
}
