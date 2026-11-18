export type ExamPrerequisite = {
  examId: string;
  mode: 'completed' | 'passed';
  minScoreBasisPoints?: number;
};

export type VisibleExamForPrerequisite = {
  id: string;
  title: string;
};

/**
 * Describes a configured prerequisite without exposing exams outside the
 * participant-visible catalog or claiming that the participant has met it.
 */
export function describeExamPrerequisite(
  prerequisite: ExamPrerequisite,
  visibleExams: VisibleExamForPrerequisite[]
): string {
  const visibleTitle = visibleExams.find(exam => exam.id === prerequisite.examId)?.title;
  const title = visibleTitle?.trim() || 'Eine vorherige Prüfung';

  if (prerequisite.mode === 'completed') {
    return `${title} muss abgeschlossen sein.`;
  }

  const score = prerequisite.minScoreBasisPoints;
  const hasValidMinimum = Number.isInteger(score) && score! >= 0 && score! <= 10_000;
  const minimum = hasValidMinimum
    ? ` (mindestens ${(score! / 100).toLocaleString('de-DE')}%)`
    : '';
  return `${title} muss bestanden sein${minimum}.`;
}
