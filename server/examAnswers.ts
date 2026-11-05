/**
 * Strenge Prüfung der Teilnehmerantworten (§19.6). Gedacht für Autosave und Abgabe in späteren Phasen:
 * Eine Antwort mit ungültiger Struktur wird abgelehnt, statt still umgedeutet zu werden.
 * Die Bewertung (examScore.ts) ist zusätzlich tolerant und vergibt für Ungültiges nie Punkte.
 */
import { isPlainObject, isValidId } from './examValidate.ts';
import { EXAM_LIMITS } from './examTypes.ts';
import type { AnswerMap, AnswerValue, ExamQuestion, MatchingAnswerEntry } from './examTypes.ts';

export interface AnswerIssue {
  questionId: string;
  code: string;
  message: string;
}

export type AnswerParseResult =
  | { ok: true; answers: AnswerMap }
  | { ok: false; errors: AnswerIssue[] };

// eslint-disable-next-line no-control-regex
const FORBIDDEN_TEXT_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function freeTextLimit(question: { maxAnswerLength?: number }): number {
  return Math.min(question.maxAnswerLength ?? EXAM_LIMITS.maxFreeTextLength, EXAM_LIMITS.maxFreeTextLength);
}

/** Gibt einen Fehlercode zurück oder null, wenn der Wert für diese Frage zulässig ist. */
export function validateAnswerValue(question: ExamQuestion, value: unknown): string | null {
  if (value === undefined) return null; // unbeantwortet
  switch (question.type) {
    case 'single_choice':
      if (value === null) return null;
      return typeof value === 'string' && question.options.some(o => o.id === value)
        ? null
        : 'answer_option_invalid';
    case 'multiple_choice': {
      if (!Array.isArray(value)) return 'answer_not_array';
      const valid = new Set(question.options.map(o => o.id));
      const seen = new Set<string>();
      for (const id of value) {
        if (typeof id !== 'string' || !valid.has(id)) return 'answer_option_invalid';
        if (seen.has(id)) return 'answer_option_duplicate';
        seen.add(id);
      }
      return null;
    }
    case 'true_false':
      return value === null || typeof value === 'boolean' ? null : 'answer_not_boolean';
    case 'matching': {
      if (!Array.isArray(value)) return 'answer_not_array';
      if (value.length > question.matchingPairs.length) return 'answer_too_many_entries';
      const pairIds = new Set(question.matchingPairs.map(p => p.id));
      const targetIds = new Set(question.matchingPairs.map(p => p.targetId));
      const usedPairs = new Set<string>();
      const usedTargets = new Set<string>();
      for (const entry of value) {
        if (!isPlainObject(entry) || typeof entry.pairId !== 'string' || typeof entry.targetId !== 'string') {
          return 'answer_entry_invalid';
        }
        if (!pairIds.has(entry.pairId) || !targetIds.has(entry.targetId)) return 'answer_id_unknown';
        if (usedPairs.has(entry.pairId) || usedTargets.has(entry.targetId)) return 'answer_id_duplicate';
        usedPairs.add(entry.pairId);
        usedTargets.add(entry.targetId);
      }
      return null;
    }
    case 'free_text':
      if (typeof value !== 'string') return 'answer_not_string';
      if (value.length > freeTextLimit(question)) return 'answer_too_long';
      return FORBIDDEN_TEXT_CHARS.test(value) ? 'answer_chars_invalid' : null;
  }
}

function canonical(question: ExamQuestion, value: unknown): AnswerValue | undefined {
  if (value === undefined) return undefined;
  if (question.type === 'matching' && Array.isArray(value)) {
    return (value as MatchingAnswerEntry[]).map(e => ({ pairId: e.pairId, targetId: e.targetId }));
  }
  return value as AnswerValue;
}

/**
 * Prüft eine komplette Antwort-Map gegen die Fragen und gibt eine bereinigte Kopie zurück
 * (nur bekannte Fragen, bei Zuordnungen nur pairId/targetId). Unbekannte Fragen-IDs werden abgelehnt.
 */
export function parseAnswerMap(questions: ExamQuestion[], raw: unknown): AnswerParseResult {
  if (!isPlainObject(raw)) {
    return { ok: false, errors: [{ questionId: '', code: 'answers_not_object', message: 'Die Antworten haben ein ungültiges Format.' }] };
  }
  const errors: AnswerIssue[] = [];
  const known = new Map<string, ExamQuestion>();
  for (const q of questions) known.set(q.id, q);

  for (const key of Object.keys(raw)) {
    if (!isValidId(key) || !known.has(key)) {
      errors.push({ questionId: key, code: 'answer_unknown_question', message: 'Die Antwort gehört zu keiner Frage dieser Prüfung.' });
    }
  }
  const answers: AnswerMap = {};
  for (const q of questions) {
    if (!hasOwn(raw, q.id)) continue;
    const code = validateAnswerValue(q, raw[q.id]);
    if (code) {
      errors.push({ questionId: q.id, code, message: 'Die Antwort ist für diese Frage ungültig.' });
      continue;
    }
    const value = canonical(q, raw[q.id]);
    if (value !== undefined) answers[q.id] = value;
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, answers };
}
