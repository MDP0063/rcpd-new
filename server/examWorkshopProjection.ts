import type { ExamDocument } from './examRepositoryTypes.ts';
import { randomInt } from 'node:crypto';
import { createHmac } from 'node:crypto';

const SAFE_QUESTION_FIELDS = [
  'id', 'type', 'question', 'pointsMilli', 'imageUrl', 'maxAnswerLength'
] as const;

/** Whitelist projection for delegated workshop users. Master documents and keys stay server-side. */
function matchingAlias(secret: string, examId: string, questionId: string, kind: 'pair' | 'target', id: string): string {
  return createHmac('sha256', secret)
    .update(JSON.stringify(['exam-workshop', examId, questionId, kind, id]))
    .digest('base64url')
    .slice(0, 32);
}

/** Converts projected aliases back to private IDs before a delegated definition is validated. */
export function restoreDelegatedMatchingIds(definition: unknown, master: ExamDocument, secret: string): unknown {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) return definition;
  const restored = structuredClone(definition) as Record<string, unknown>;
  if (!Array.isArray(restored.questions) || !Array.isArray(master.questions)) return restored;
  const existingByQuestion = new Map(master.questions.flatMap(raw =>
    raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).type === 'matching'
      ? [[String((raw as Record<string, unknown>).id), raw as Record<string, unknown>]]
      : []
  ));
  restored.questions = restored.questions.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const question = raw as Record<string, unknown>;
    const existing = existingByQuestion.get(String(question.id));
    if (!existing || !Array.isArray(existing.matchingPairs)) return question;
    const pairAliases = new Map<string, string>();
    const targetAliases = new Map<string, string>();
    for (const rawPair of existing.matchingPairs) {
      if (!rawPair || typeof rawPair !== 'object' || Array.isArray(rawPair)) continue;
      const pair = rawPair as Record<string, unknown>;
      if (typeof pair.id === 'string') pairAliases.set(matchingAlias(secret, master.id, String(question.id), 'pair', pair.id), pair.id);
      if (typeof pair.targetId === 'string') targetAliases.set(matchingAlias(secret, master.id, String(question.id), 'target', pair.targetId), pair.targetId);
    }
    if (Array.isArray(question.matchingPairs)) question.matchingPairs = question.matchingPairs.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const pair = item as Record<string, unknown>;
      return typeof pair.id === 'string' && pairAliases.has(pair.id) ? { ...pair, id: pairAliases.get(pair.id) } : pair;
    });
    if (Array.isArray(question.matchingTargets)) question.matchingTargets = question.matchingTargets.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const target = item as Record<string, unknown>;
      return typeof target.id === 'string' && targetAliases.has(target.id) ? { ...target, id: targetAliases.get(target.id) } : target;
    });
    return question;
  });
  return restored;
}

export function projectExamWorkshopMaster(master: ExamDocument, isAdmin: boolean, aliasSecret = 'test-only-secret'): ExamDocument {
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
      const prompts = question.matchingPairs.flatMap(pair => {
        if (!pair || typeof pair !== 'object' || Array.isArray(pair)) return [];
        const item = pair as Record<string, unknown>;
        return typeof item.id === 'string' && typeof item.prompt === 'string'
          ? [{ id: matchingAlias(aliasSecret, master.id, String(question.id), 'pair', item.id), prompt: item.prompt }]
          : [];
      });
      // Shuffle prompts independently so the source pair order cannot act as a side channel.
      for (let index = prompts.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInt(index + 1);
        [prompts[index], prompts[swapIndex]] = [prompts[swapIndex], prompts[index]];
      }
      projected.matchingPairs = prompts;
      const targets = question.matchingPairs.flatMap(pair => {
        if (!pair || typeof pair !== 'object' || Array.isArray(pair)) return [];
        const item = pair as Record<string, unknown>;
        return typeof item.targetId === 'string' && typeof item.targetText === 'string'
          ? [{ id: matchingAlias(aliasSecret, master.id, String(question.id), 'target', item.targetId), text: item.targetText }]
          : [];
      });
      // A random non-zero cyclic offset is a derangement: every option leaves its source index.
      if (targets.length > 1) {
        const offset = randomInt(1, targets.length);
        projected.matchingTargets = [...targets.slice(offset), ...targets.slice(0, offset)];
      } else {
        projected.matchingTargets = targets;
      }
    }
    return projected;
  }) : [];
  return safe as ExamDocument;
}
