/**
 * Serverseitiger Kern des neuen Prüfungs-Runners.
 *
 * Verantwortlich für:
 * - sichere Prüflingsprojektionen ohne Lösungsschlüssel oder Bewertungsrubriken,
 * - persistierbare Matching-Zufallsreihenfolgen,
 * - strikte Validierung typisierter Antworten,
 * - deterministische automatische Bewertung in Ganzzahleinheiten.
 *
 * HTTP-Routen und Persistenz bleiben bewusst außerhalb dieses Moduls.
 */
import { randomInt } from 'node:crypto';
import { mulDivHalfUpClamped, meetsPassingScore, scoreBasisPoints } from './examMath.ts';
import type {
  AnswerMap,
  AnswerValue,
  ExamQuestion,
  MatchingAnswerEntry,
  MatchingQuestion
} from './examTypes.ts';

export interface PublicOption {
  id: string;
  text: string;
}

export interface PublicSingleChoiceQuestion {
  id: string;
  type: 'single_choice';
  question: string;
  pointsMilli: number;
  imageUrl?: string;
  options: PublicOption[];
}

export interface PublicMultipleChoiceQuestion {
  id: string;
  type: 'multiple_choice';
  question: string;
  pointsMilli: number;
  imageUrl?: string;
  options: PublicOption[];
}

export interface PublicTrueFalseQuestion {
  id: string;
  type: 'true_false';
  question: string;
  pointsMilli: number;
  imageUrl?: string;
}

export interface PublicMatchingQuestion {
  id: string;
  type: 'matching';
  question: string;
  pointsMilli: number;
  imageUrl?: string;
  pairs: Array<{ id: string; prompt: string }>;
  targets: Array<{ id: string; text: string }>;
}

export interface PublicFreeTextQuestion {
  id: string;
  type: 'free_text';
  question: string;
  pointsMilli: number;
  imageUrl?: string;
  maxAnswerLength: number;
}

export type PublicExamQuestion =
  | PublicSingleChoiceQuestion
  | PublicMultipleChoiceQuestion
  | PublicTrueFalseQuestion
  | PublicMatchingQuestion
  | PublicFreeTextQuestion;

export type MatchingShuffleOrders = Record<string, string[]>;

export interface QuestionGrade {
  questionId: string;
  pointsEarnedMilli: number;
  maxPointsMilli: number;
  requiresManualReview: boolean;
  correct?: boolean;
}

export interface ExamGradeResult {
  status: 'passed' | 'failed' | 'pending_review';
  totalPossiblePointsMilli: number;
  automaticallyEarnedPointsMilli: number;
  preliminaryScoreBasisPoints: number;
  finalScoreBasisPoints: number | null;
  requiresManualReview: boolean;
  questionGrades: QuestionGrade[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function baseProjection(question: ExamQuestion) {
  return {
    id: question.id,
    question: question.question,
    pointsMilli: question.pointsMilli,
    ...(question.imageUrl ? { imageUrl: question.imageUrl } : {})
  };
}

/** Erstellt je Matching-Frage eine zufällige, einmalig zu speichernde Zielreihenfolge. */
export function createMatchingShuffleOrders(
  questions: readonly ExamQuestion[],
  chooseIndex: (exclusiveUpperBound: number) => number = upperBound => randomInt(upperBound)
): MatchingShuffleOrders {
  const orders: MatchingShuffleOrders = {};
  for (const question of questions) {
    if (question.type !== 'matching') continue;
    const ids = question.matchingPairs.map(pair => pair.targetId);
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const targetIndex = chooseIndex(index + 1);
      if (!Number.isSafeInteger(targetIndex) || targetIndex < 0 || targetIndex > index) {
        throw new Error('EXAM_MATCHING_SHUFFLE_INVALID');
      }
      [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    }
    orders[question.id] = ids;
  }
  return orders;
}

function getValidatedTargetOrder(question: MatchingQuestion, order: unknown): string[] {
  const expected = new Set(question.matchingPairs.map(pair => pair.targetId));
  if (
    !Array.isArray(order) ||
    order.length !== expected.size ||
    order.some(id => typeof id !== 'string' || !expected.has(id)) ||
    new Set(order).size !== expected.size
  ) {
    throw new Error('EXAM_MATCHING_SHUFFLE_INVALID');
  }
  return [...order] as string[];
}

/**
 * Erstellt ausschließlich die für die Teilnahme nötigen Felder.
 * Insbesondere werden Lösungsschlüssel, Erklärungen und Freitext-Rubriken ausgelassen.
 */
export function projectQuestionsForAttempt(
  questions: readonly ExamQuestion[],
  matchingShuffleOrders: MatchingShuffleOrders
): PublicExamQuestion[] {
  if (!isPlainRecord(matchingShuffleOrders)) throw new Error('EXAM_MATCHING_SHUFFLE_INVALID');
  return questions.map(question => {
    switch (question.type) {
      case 'single_choice':
        return {
          ...baseProjection(question),
          type: question.type,
          options: question.options.map(option => ({ id: option.id, text: option.text }))
        };
      case 'multiple_choice':
        return {
          ...baseProjection(question),
          type: question.type,
          options: question.options.map(option => ({ id: option.id, text: option.text }))
        };
      case 'true_false':
        return { ...baseProjection(question), type: question.type };
      case 'matching': {
        const targetOrder = getValidatedTargetOrder(question, matchingShuffleOrders[question.id]);
        const targetById = new Map(question.matchingPairs.map(pair => [pair.targetId, pair.targetText]));
        return {
          ...baseProjection(question),
          type: question.type,
          pairs: question.matchingPairs.map(pair => ({ id: pair.id, prompt: pair.prompt })),
          targets: targetOrder.map(id => ({ id, text: targetById.get(id)! }))
        };
      }
      case 'free_text':
        return {
          ...baseProjection(question),
          type: question.type,
          maxAnswerLength: question.maxAnswerLength ?? 4000
        };
    }
  });
}

/** Validiert die vollständige Antwortmap gegen genau die Fragen des veröffentlichten Snapshots. */
export function parseAttemptAnswers(
  rawAnswers: unknown,
  questions: readonly ExamQuestion[]
): AnswerMap {
  if (!isPlainRecord(rawAnswers)) throw new Error('EXAM_ANSWERS_INVALID');
  const questionsById = new Map(questions.map(question => [question.id, question]));
  for (const key of Object.keys(rawAnswers)) {
    if (!questionsById.has(key)) throw new Error('EXAM_ANSWER_QUESTION_UNKNOWN');
  }

  const answers: AnswerMap = {};
  for (const question of questions) {
    const raw = rawAnswers[question.id];
    if (raw === undefined || raw === null) {
      answers[question.id] = null;
      continue;
    }

    switch (question.type) {
      case 'single_choice': {
        if (typeof raw !== 'string' || !question.options.some(option => option.id === raw)) {
          throw new Error('EXAM_ANSWER_INVALID');
        }
        answers[question.id] = raw;
        break;
      }
      case 'multiple_choice': {
        if (
          !Array.isArray(raw) ||
          raw.length > question.options.length ||
          raw.some(id => typeof id !== 'string' || !question.options.some(option => option.id === id)) ||
          new Set(raw).size !== raw.length
        ) {
          throw new Error('EXAM_ANSWER_INVALID');
        }
        answers[question.id] = [...raw] as string[];
        break;
      }
      case 'true_false':
        if (typeof raw !== 'boolean') throw new Error('EXAM_ANSWER_INVALID');
        answers[question.id] = raw;
        break;
      case 'matching': {
        if (!Array.isArray(raw) || raw.length > question.matchingPairs.length) {
          throw new Error('EXAM_ANSWER_INVALID');
        }
        const pairIds = new Set(question.matchingPairs.map(pair => pair.id));
        const targetIds = new Set(question.matchingPairs.map(pair => pair.targetId));
        const seenPairs = new Set<string>();
        const seenTargets = new Set<string>();
        const entries: MatchingAnswerEntry[] = [];
        for (const entry of raw) {
          if (
            !isPlainRecord(entry) ||
            Object.keys(entry).some(key => key !== 'pairId' && key !== 'targetId') ||
            typeof entry.pairId !== 'string' ||
            typeof entry.targetId !== 'string' ||
            !pairIds.has(entry.pairId) ||
            !targetIds.has(entry.targetId) ||
            seenPairs.has(entry.pairId) ||
            seenTargets.has(entry.targetId)
          ) {
            throw new Error('EXAM_ANSWER_INVALID');
          }
          seenPairs.add(entry.pairId);
          seenTargets.add(entry.targetId);
          entries.push({ pairId: entry.pairId, targetId: entry.targetId });
        }
        answers[question.id] = entries;
        break;
      }
      case 'free_text': {
        const maxLength = question.maxAnswerLength ?? 4000;
        if (typeof raw !== 'string' || raw.length > maxLength) {
          throw new Error('EXAM_ANSWER_INVALID');
        }
        answers[question.id] = raw;
        break;
      }
    }
  }
  return answers;
}

function gradeObjectiveQuestion(question: ExamQuestion, answer: AnswerValue | undefined): QuestionGrade {
  const max = question.pointsMilli;
  switch (question.type) {
    case 'single_choice': {
      const correct = typeof answer === 'string' && answer === question.correctOptionId;
      return { questionId: question.id, pointsEarnedMilli: correct ? max : 0, maxPointsMilli: max, requiresManualReview: false, correct };
    }
    case 'multiple_choice': {
      const selected = Array.isArray(answer) ? answer as string[] : [];
      const correctIds = new Set(question.correctOptionIds);
      if (correctIds.size === 0) throw new Error('EXAM_GRADING_INPUT_INVALID');
      const right = selected.filter(id => correctIds.has(id)).length;
      const wrong = selected.length - right;
      const earned = mulDivHalfUpClamped(Math.max(0, right - wrong), max, correctIds.size, max);
      return { questionId: question.id, pointsEarnedMilli: earned, maxPointsMilli: max, requiresManualReview: false, correct: earned === max };
    }
    case 'true_false': {
      const correct = typeof answer === 'boolean' && answer === question.correctBoolean;
      return { questionId: question.id, pointsEarnedMilli: correct ? max : 0, maxPointsMilli: max, requiresManualReview: false, correct };
    }
    case 'matching': {
      const entries = Array.isArray(answer) ? answer as MatchingAnswerEntry[] : [];
      if (question.matchingPairs.length === 0) throw new Error('EXAM_GRADING_INPUT_INVALID');
      const correctByPair = new Map(question.matchingPairs.map(pair => [pair.id, pair.targetId]));
      const correctCount = entries.filter(entry => correctByPair.get(entry.pairId) === entry.targetId).length;
      const earned = mulDivHalfUpClamped(correctCount, max, question.matchingPairs.length, max);
      return { questionId: question.id, pointsEarnedMilli: earned, maxPointsMilli: max, requiresManualReview: false, correct: earned === max };
    }
    case 'free_text': {
      const answered = typeof answer === 'string' && answer.trim().length > 0;
      return { questionId: question.id, pointsEarnedMilli: 0, maxPointsMilli: max, requiresManualReview: answered };
    }
  }
}

/** Bewertet nur anhand des unveränderlichen Snapshots; Freitext bleibt bis zur Korrektur offen. */
export function evaluateExamAnswers(
  questions: readonly ExamQuestion[],
  answers: AnswerMap,
  passingScoreBasisPoints: number
): ExamGradeResult {
  if (!Array.isArray(questions) || questions.length === 0) throw new Error('EXAM_GRADING_INPUT_INVALID');
  let totalPossiblePointsMilli = 0;
  let automaticallyEarnedPointsMilli = 0;
  let requiresManualReview = false;
  const questionGrades = questions.map(question => {
    if (!Number.isSafeInteger(question.pointsMilli) || question.pointsMilli <= 0) {
      throw new Error('EXAM_GRADING_INPUT_INVALID');
    }
    totalPossiblePointsMilli += question.pointsMilli;
    const grade = gradeObjectiveQuestion(question, answers[question.id]);
    automaticallyEarnedPointsMilli += grade.pointsEarnedMilli;
    requiresManualReview ||= grade.requiresManualReview;
    return grade;
  });

  if (
    !Number.isSafeInteger(totalPossiblePointsMilli) ||
    totalPossiblePointsMilli <= 0 ||
    !Number.isSafeInteger(automaticallyEarnedPointsMilli) ||
    !Number.isSafeInteger(passingScoreBasisPoints) ||
    passingScoreBasisPoints < 0 ||
    passingScoreBasisPoints > 10_000
  ) {
    throw new Error('EXAM_GRADING_INPUT_INVALID');
  }

  const preliminaryScoreBasisPoints = scoreBasisPoints(
    automaticallyEarnedPointsMilli,
    totalPossiblePointsMilli
  );
  if (requiresManualReview) {
    return {
      status: 'pending_review',
      totalPossiblePointsMilli,
      automaticallyEarnedPointsMilli,
      preliminaryScoreBasisPoints,
      finalScoreBasisPoints: null,
      requiresManualReview: true,
      questionGrades
    };
  }

  const passed = meetsPassingScore(
    automaticallyEarnedPointsMilli,
    totalPossiblePointsMilli,
    passingScoreBasisPoints
  );
  return {
    status: passed ? 'passed' : 'failed',
    totalPossiblePointsMilli,
    automaticallyEarnedPointsMilli,
    preliminaryScoreBasisPoints,
    finalScoreBasisPoints: preliminaryScoreBasisPoints,
    requiresManualReview: false,
    questionGrades
  };
}
