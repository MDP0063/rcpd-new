export type AnswerPersistenceState = 'open' | 'saved' | 'pending' | 'error';

export function hasAnswer(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'boolean';
}

export function areAnswerValuesEqual(left: unknown, right: unknown): boolean {
  const leftHasAnswer = hasAnswer(left);
  const rightHasAnswer = hasAnswer(right);
  if (!leftHasAnswer || !rightHasAnswer) return leftHasAnswer === rightHasAnswer;

  if (Array.isArray(left) && Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return Object.is(left, right);
}

export function areAnswerMapsEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  const questionIds = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...questionIds].every(questionId => areAnswerValuesEqual(left[questionId], right[questionId]));
}

export function countConfirmedAnswers(
  questionIds: readonly string[],
  confirmedAnswers: Record<string, unknown>
): number {
  return questionIds.filter(questionId => hasAnswer(confirmedAnswers[questionId])).length;
}

export function countPendingAnswers(
  questionIds: readonly string[],
  localAnswers: Record<string, unknown>,
  confirmedAnswers: Record<string, unknown>
): number {
  return questionIds.filter(questionId =>
    !areAnswerValuesEqual(localAnswers[questionId], confirmedAnswers[questionId])
  ).length;
}

export function answerPersistenceState(
  localAnswer: unknown,
  confirmedAnswer: unknown,
  saveState: 'saved' | 'saving' | 'error'
): AnswerPersistenceState {
  if (!areAnswerValuesEqual(localAnswer, confirmedAnswer)) {
    return saveState === 'error' ? 'error' : 'pending';
  }
  return hasAnswer(confirmedAnswer) ? 'saved' : 'open';
}
