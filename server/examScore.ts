/**
 * Serverseitige Bewertung gegen einen Prüfungs-Snapshot, ausschließlich mit Ganzzahlarithmetik (§9, §19.6).
 *
 * Verhalten bei fehlerhaften Antworten: Die Bewertung ist tolerant und vergibt für Ungültiges, Doppeltes
 * oder Fremdes nie Punkte. Strenge Ablehnung der Payload leistet `parseAnswerMap` (examAnswers.ts).
 */
import { hasOwn } from './examAnswers.ts';
import {
  mulDivHalfUpClamped,
  isNonNegativeSafeInteger,
  meetsPassingScore,
  scoreBasisPoints
} from './examMath.ts';
import type { AnswerMap, ExamQuestion, QuestionType } from './examTypes.ts';

/** Manuell vergebene Punkte je Freitext-Frage in Tausendstel-Punkten. */
export type ManualGrades = Record<string, number | undefined>;

export interface QuestionResult {
  questionId: string;
  type: QuestionType;
  maxPointsMilli: number;
  /** null, solange die Frage noch auf manuelle Bewertung wartet. */
  earnedPointsMilli: number | null;
  answered: boolean;
  needsManualReview: boolean;
}

export type ScoreStatus = 'passed' | 'failed' | 'pending_review';

export interface ExamScoreResult {
  questionResults: QuestionResult[];
  totalPossiblePointsMilli: number;
  autoEarnedPointsMilli: number;
  manualEarnedPointsMilli: number;
  openManualQuestionIds: string[];
  status: ScoreStatus;
  /** Bisher erzielte Punkte im Verhältnis zur Gesamtpunktzahl, in Basispunkten (nur Anzeige). */
  preliminaryScoreBasisPoints: number;
  /** Endgültiges Ergebnis in Basispunkten; null bei pending_review (§9). */
  finalScoreBasisPoints: number | null;
}

function uniqueStrings(value: unknown): Set<string> {
  const set = new Set<string>();
  if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') set.add(v);
  return set;
}

function isAnswered(question: ExamQuestion, value: unknown): boolean {
  switch (question.type) {
    case 'single_choice':
      return typeof value === 'string';
    case 'true_false':
      return typeof value === 'boolean';
    case 'multiple_choice':
    case 'matching':
      return Array.isArray(value) && value.length > 0;
    case 'free_text':
      return typeof value === 'string' && value.trim().length > 0;
  }
}

/** Punkte einer automatisch bewertbaren Frage in Tausendstel-Punkten (0 bis max). */
export function scoreAutoQuestion(question: ExamQuestion, answer: unknown): number {
  const max = question.pointsMilli;
  switch (question.type) {
    case 'single_choice':
      return answer === question.correctOptionId ? max : 0;

    case 'true_false':
      return typeof answer === 'boolean' && answer === question.correctBoolean ? max : 0;

    case 'multiple_choice': {
      const correct = new Set(question.correctOptionIds);
      const valid = new Set(question.options.map(o => o.id));
      if (correct.size === 0) return 0;
      let right = 0;
      let wrong = 0;
      for (const id of uniqueStrings(answer)) {
        if (!valid.has(id)) continue; // fremde IDs: weder Punkte noch Abzug
        if (correct.has(id)) right += 1;
        else wrong += 1;
      }
      // P = max(0, (R - F) / N * P_max)
      const net = Math.max(0, right - wrong);
      return mulDivHalfUpClamped(net, max, correct.size, max);
    }

    case 'matching': {
      const pairs = question.matchingPairs;
      if (pairs.length === 0 || !Array.isArray(answer)) return 0;
      const targetByPair = new Map(pairs.map(p => [p.id, p.targetId]));
      const validTargets = new Set(pairs.map(p => p.targetId));
      const usedPairs = new Set<string>();
      const usedTargets = new Set<string>();
      let correct = 0;
      for (const entry of answer) {
        if (typeof entry !== 'object' || entry === null) continue;
        const { pairId, targetId } = entry as { pairId?: unknown; targetId?: unknown };
        if (typeof pairId !== 'string' || typeof targetId !== 'string') continue;
        if (!targetByPair.has(pairId) || !validTargets.has(targetId)) continue;
        if (usedPairs.has(pairId) || usedTargets.has(targetId)) continue; // jede ID höchstens einmal
        usedPairs.add(pairId);
        usedTargets.add(targetId);
        if (targetByPair.get(pairId) === targetId) correct += 1;
      }
      // P = K / N * P_max
      return mulDivHalfUpClamped(correct, max, pairs.length, max);
    }

    case 'free_text':
      return 0; // wird manuell bewertet
  }
}

/**
 * Bewertet eine ganze Prüfung.
 * - Unbeantwortete Fragen erhalten 0 Punkte.
 * - Beantwortete Freitext-Fragen ohne manuelle Note lassen den Versuch auf `pending_review`.
 *   Ein leerer Freitext gilt als unbeantwortet (0 Punkte) und braucht keine Korrektur.
 * - Bestehen: earned * 10000 >= total * passingScoreBasisPoints (examMath.meetsPassingScore).
 */
export function scoreExam(
  questions: ExamQuestion[],
  answers: AnswerMap,
  passingScoreBasisPoints: number,
  manualGrades: ManualGrades = {}
): ExamScoreResult {
  if (questions.length === 0) throw new RangeError('Eine Prüfung ohne Fragen kann nicht bewertet werden.');

  const questionResults: QuestionResult[] = [];
  const openManual: string[] = [];
  let total = 0;
  let auto = 0;
  let manual = 0;

  for (const q of questions) {
    if (!isNonNegativeSafeInteger(q.pointsMilli) || q.pointsMilli === 0) {
      throw new RangeError(`Ungültige Punktzahl bei Frage ${q.id}.`);
    }
    total += q.pointsMilli;
    if (!Number.isSafeInteger(total)) throw new RangeError('Die Gesamtpunktzahl überschreitet den zulässigen Bereich.');
    const answer = hasOwn(answers, q.id) ? answers[q.id] : undefined;
    const answered = isAnswered(q, answer);

    if (q.type !== 'free_text') {
      const earned = scoreAutoQuestion(q, answer);
      auto += earned;
      questionResults.push({
        questionId: q.id,
        type: q.type,
        maxPointsMilli: q.pointsMilli,
        earnedPointsMilli: earned,
        answered,
        needsManualReview: false
      });
      continue;
    }

    if (!answered) {
      questionResults.push({
        questionId: q.id, type: q.type, maxPointsMilli: q.pointsMilli,
        earnedPointsMilli: 0, answered: false, needsManualReview: false
      });
      continue;
    }
    const grade = hasOwn(manualGrades, q.id) ? manualGrades[q.id] : undefined;
    if (grade === undefined) {
      openManual.push(q.id);
      questionResults.push({
        questionId: q.id, type: q.type, maxPointsMilli: q.pointsMilli,
        earnedPointsMilli: null, answered: true, needsManualReview: true
      });
      continue;
    }
    if (!isNonNegativeSafeInteger(grade) || grade > q.pointsMilli) {
      throw new RangeError(`Ungültige manuelle Bewertung bei Frage ${q.id}.`);
    }
    manual += grade;
    questionResults.push({
      questionId: q.id, type: q.type, maxPointsMilli: q.pointsMilli,
      earnedPointsMilli: grade, answered: true, needsManualReview: false
    });
  }

  const earned = auto + manual;
  const preliminary = scoreBasisPoints(earned, total);
  const pending = openManual.length > 0;
  const status: ScoreStatus = pending
    ? 'pending_review'
    : meetsPassingScore(earned, total, passingScoreBasisPoints)
      ? 'passed'
      : 'failed';

  return {
    questionResults,
    totalPossiblePointsMilli: total,
    autoEarnedPointsMilli: auto,
    manualEarnedPointsMilli: manual,
    openManualQuestionIds: openManual,
    status,
    preliminaryScoreBasisPoints: preliminary,
    finalScoreBasisPoints: pending ? null : preliminary
  };
}
