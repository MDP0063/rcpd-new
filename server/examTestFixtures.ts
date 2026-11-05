/** Gemeinsame Testdaten für die examXxx.test.ts-Dateien (kein Test, wird nicht direkt ausgeführt). */
import type {
  AttemptStatus,
  AttemptSummary,
  ExamDefinition,
  ExamQuestion,
  FreeTextQuestion,
  MatchingQuestion,
  MultipleChoiceQuestion,
  SingleChoiceQuestion,
  TrueFalseQuestion
} from './examTypes.ts';

export const SECRET_EXPLANATION = 'GEHEIME-ERKLAERUNG';
export const SECRET_RUBRIC = 'GEHEIME-RUBRIK';

export const SC: SingleChoiceQuestion = {
  id: 'q1',
  type: 'single_choice',
  question: 'Single Choice?',
  pointsMilli: 1000,
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' }
  ],
  correctOptionId: 'b',
  explanation: SECRET_EXPLANATION
};

export const MC: MultipleChoiceQuestion = {
  id: 'q2',
  type: 'multiple_choice',
  question: 'Multiple Choice?',
  pointsMilli: 2000,
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
    { id: 'd', text: 'D' }
  ],
  correctOptionIds: ['a', 'c'],
  explanation: SECRET_EXPLANATION
};

export const TF: TrueFalseQuestion = {
  id: 'q3',
  type: 'true_false',
  question: 'Wahr oder falsch?',
  pointsMilli: 1000,
  correctBoolean: true,
  explanation: SECRET_EXPLANATION
};

export const MATCH: MatchingQuestion = {
  id: 'q4',
  type: 'matching',
  question: 'Ordne zu.',
  pointsMilli: 3000,
  matchingPairs: [
    { id: 'p1', prompt: 'Eins', targetId: 't1', targetText: 'One' },
    { id: 'p2', prompt: 'Zwei', targetId: 't2', targetText: 'Two' },
    { id: 'p3', prompt: 'Drei', targetId: 't3', targetText: 'Three' }
  ],
  explanation: SECRET_EXPLANATION
};

export const FT: FreeTextQuestion = {
  id: 'q5',
  type: 'free_text',
  question: 'Erkläre.',
  pointsMilli: 4000,
  gradingRubric: SECRET_RUBRIC,
  maxAnswerLength: 500,
  explanation: SECRET_EXPLANATION
};

export const AUTO_QUESTIONS: ExamQuestion[] = [SC, MC, TF, MATCH]; // 7000 Tausendstel-Punkte
export const ALL_QUESTIONS: ExamQuestion[] = [SC, MC, TF, MATCH, FT]; // 11000

export const ALL_CORRECT_AUTO = {
  q1: 'b',
  q2: ['a', 'c'],
  q3: true,
  q4: [
    { pairId: 'p1', targetId: 't1' },
    { pairId: 'p2', targetId: 't2' },
    { pairId: 'p3', targetId: 't3' }
  ]
};

export function validExam(overrides: Partial<ExamDefinition> = {}): ExamDefinition {
  return {
    title: 'Testprüfung',
    assessmentStage: 'test',
    timeLimitMinutes: 20,
    passingScoreBasisPoints: 7500,
    maxAttempts: null,
    assignedCourseCodes: ['SOP-01'],
    questions: structuredClone(ALL_QUESTIONS),
    ...overrides
  };
}

let counter = 0;
export function attempt(
  status: AttemptStatus,
  finalScoreBasisPoints: number | null,
  overrides: Partial<AttemptSummary> = {}
): AttemptSummary {
  counter += 1;
  const n = overrides.attemptNumber ?? counter;
  return {
    id: `att_${counter}`,
    userId: 'u1',
    examId: 'e1',
    attemptCourseCode: 'SOP-01',
    attemptNumber: n,
    status,
    startedAtIso: new Date(Date.UTC(2026, 0, 1, 10, n)).toISOString(),
    submittedAtIso: status === 'in_progress' ? null : new Date(Date.UTC(2026, 0, 1, 11, n)).toISOString(),
    finalScoreBasisPoints,
    ...overrides
  };
}
