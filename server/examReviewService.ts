import type { ExamRepository } from './examRepository.ts';
import type { ExamAttemptRecord, ExamVersionRecord } from './examAttemptService.ts';
import { scoreExam } from './examScore.ts';
import { toPublicSubmission, type PublicExamSubmission } from './examSubmitService.ts';

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

export async function listOwnExamResults(repository: ExamRepository, uid: string): Promise<PublicExamSubmission[]> {
  const attempts = ensureBounded(await repository.list<ExamAttemptRecord>('exam_attempts', {
    where: [{ field: 'userId', value: uid }], limit: HISTORY_LIMIT
  }));
  const results: PublicExamSubmission[] = [];
  for (const attempt of attempts) {
    if (!['passed', 'failed', 'pending_review'].includes(attempt.status)) continue;
    const version = await repository.get<ExamVersionRecord>('exam_versions', attempt.examVersionId);
    if (!version || version.examId !== attempt.examId || version.versionNumber !== attempt.versionNumber) throw new Error('EXAM_ATTEMPT_SNAPSHOT_INVALID');
    results.push(toPublicSubmission(attempt, version));
  }
  return results.sort((left, right) => right.submittedAtIso.localeCompare(left.submittedAtIso));
}
