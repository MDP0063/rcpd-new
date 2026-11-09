export interface ManualReviewGradeQuestion {
  questionId: string;
  pointsMilli: number;
}

export interface ManualReviewGrade {
  questionId: string;
  pointsEarnedMilli: number;
}

export type ManualReviewGradeParseResult =
  | { ok: true; grades: ManualReviewGrade[] }
  | { ok: false };

/** Parse reviewer input without silently turning an empty field into a zero-point grade. */
export function parseManualReviewGrades(
  questions: readonly ManualReviewGradeQuestion[],
  values: Readonly<Record<string, string>>
): ManualReviewGradeParseResult {
  const grades: ManualReviewGrade[] = [];
  for (const question of questions) {
    const raw = values[question.questionId];
    if (typeof raw !== 'string' || raw.trim().length === 0) return { ok: false };
    const numeric = Number(raw);
    const pointsEarnedMilli = Math.round(numeric * 1000);
    if (!Number.isFinite(numeric) ||
        !Number.isSafeInteger(pointsEarnedMilli) ||
        Math.abs(numeric * 1000 - pointsEarnedMilli) > 1e-7 ||
        pointsEarnedMilli < 0 ||
        pointsEarnedMilli > question.pointsMilli) {
      return { ok: false };
    }
    grades.push({ questionId: question.questionId, pointsEarnedMilli });
  }
  return { ok: true, grades };
}
