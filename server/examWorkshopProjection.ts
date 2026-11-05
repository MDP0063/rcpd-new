import type { ExamDocument } from './examRepositoryTypes.ts';

const SAFE_QUESTION_FIELDS = [
  'id', 'type', 'question', 'pointsMilli', 'imageUrl', 'maxAnswerLength'
] as const;

/** Whitelist projection for delegated workshop users. Master documents and keys stay server-side. */
export function projectExamWorkshopMaster(master: ExamDocument, isAdmin: boolean): ExamDocument {
  if (isAdmin) return structuredClone(master);

  const safe: Record<string, unknown> = {};
  for (const key of [
    'id', 'title', 'moduleCode', 'assignedCourseCodes', 'assessmentStage', 'status',
    'minClearance', 'passingScoreBasisPoints', 'timeLimitMinutes', 'maxAttempts', 'prerequisites', 'examFormat',
    'isLegacyFormat', 'startable', 'authorUid', 'updatedIso', 'latestVersionNumber',
    'currentPublishedVersionId', 'workingRevision'
  ]) {
    if (Object.prototype.hasOwnProperty.call(master, key)) safe[key] = master[key];
  }

  safe.questions = Array.isArray(master.questions) ? master.questions.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const question = raw as Record<string, unknown>;
    const projected: Record<string, unknown> = {};
    for (const key of SAFE_QUESTION_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(question, key)) projected[key] = question[key];
    }
    if (Array.isArray(question.options)) {
      projected.options = question.options.flatMap(option => {
        if (!option || typeof option !== 'object' || Array.isArray(option)) return [];
        const item = option as Record<string, unknown>;
        return typeof item.id === 'string' && typeof item.text === 'string'
          ? [{ id: item.id, text: item.text }]
          : [];
      });
    }
    if (Array.isArray(question.matchingPairs)) {
      projected.matchingPairs = question.matchingPairs.flatMap(pair => {
        if (!pair || typeof pair !== 'object' || Array.isArray(pair)) return [];
        const item = pair as Record<string, unknown>;
        return typeof item.id === 'string' && typeof item.prompt === 'string' && typeof item.targetText === 'string'
          ? [{ id: item.id, prompt: item.prompt, targetText: item.targetText }]
          : [];
      });
    }
    return projected;
  }) : [];
  return safe as ExamDocument;
}
