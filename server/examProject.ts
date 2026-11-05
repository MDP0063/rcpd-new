/**
 * Sichere Projektionen für Teilnehmer (§10, §12, §19.3).
 * Es werden ausschließlich explizit benannte Felder übernommen; kein Objekt-Spread von Fragen.
 * Lösungsschlüssel, Rubriken, Erklärungen und die Zuordnung der Matching-Paare verlassen den Server nie
 * über die Fragenprojektion.
 */
import { randomInt } from 'node:crypto';
import { hasOwn, parseAnswerMap } from './examAnswers.ts';
import { formatPercent } from './examMath.ts';
import type { ExamScoreResult, ScoreStatus } from './examScore.ts';
import type { AnswerMap, AssessmentStage, ExamOption, ExamQuestion, QuestionType } from './examTypes.ts';

/** Reihenfolge der Zielfelder je Matching-Frage (Fragen-ID -> Ziel-IDs). Wird im Versuch gespeichert. */
export type MatchingShuffle = Record<string, string[]>;

export interface ParticipantQuestion {
  id: string;
  type: QuestionType;
  question: string;
  pointsMilli: number;
  imageUrl?: string;
  options?: ExamOption[];
  matching?: {
    pairs: Array<{ id: string; prompt: string }>;
    targets: Array<{ id: string; text: string }>;
  };
  maxAnswerLength?: number;
}

export type RandomIndex = (maxExclusive: number) => number;

const cryptoIndex: RandomIndex = max => randomInt(max);

/** Fisher-Yates mit injizierbarer Zufallsquelle (Tests). */
export function shuffled<T>(items: readonly T[], randomIndex: RandomIndex = cryptoIndex): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Erzeugt für jede Matching-Frage eine zufällige Reihenfolge der Ziel-IDs. */
export function createMatchingShuffle(
  questions: ExamQuestion[],
  randomIndex: RandomIndex = cryptoIndex
): MatchingShuffle {
  const shuffle: MatchingShuffle = {};
  for (const q of questions) {
    if (q.type === 'matching') {
      shuffle[q.id] = shuffled(q.matchingPairs.map(p => p.targetId), randomIndex);
    }
  }
  return shuffle;
}

function isPermutation(order: unknown, expected: string[]): order is string[] {
  if (!Array.isArray(order) || order.length !== expected.length) return false;
  const set = new Set(expected);
  const seen = new Set<string>();
  for (const id of order) {
    if (typeof id !== 'string' || !set.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

/**
 * Projiziert eine Frage für den Prüfling. Matching-Fragen brauchen eine gespeicherte Reihenfolge,
 * weil die Zielfelder sonst in der Reihenfolge der Paare erschienen und die Lösung verrieten.
 */
export function projectQuestionForParticipant(
  question: ExamQuestion,
  shuffle: MatchingShuffle = {}
): ParticipantQuestion {
  const base: ParticipantQuestion = {
    id: question.id,
    type: question.type,
    question: question.question,
    pointsMilli: question.pointsMilli
  };
  if (question.imageUrl !== undefined) base.imageUrl = question.imageUrl;

  switch (question.type) {
    case 'single_choice':
    case 'multiple_choice':
      base.options = question.options.map(o => ({ id: o.id, text: o.text }));
      break;
    case 'true_false':
      break;
    case 'matching': {
      const order = hasOwn(shuffle, question.id) ? shuffle[question.id] : undefined;
      const targetIds = question.matchingPairs.map(p => p.targetId);
      if (!isPermutation(order, targetIds)) {
        throw new Error(`Für die Matching-Frage ${question.id} fehlt eine gültige Zufallsreihenfolge.`);
      }
      const textByTarget = new Map(question.matchingPairs.map(p => [p.targetId, p.targetText]));
      base.matching = {
        pairs: question.matchingPairs.map(p => ({ id: p.id, prompt: p.prompt })),
        targets: order.map(id => ({ id, text: textByTarget.get(id) as string }))
      };
      break;
    }
    case 'free_text':
      if (question.maxAnswerLength !== undefined) base.maxAnswerLength = question.maxAnswerLength;
      break;
  }
  return base;
}

export function projectExamForParticipant(
  questions: ExamQuestion[],
  shuffle: MatchingShuffle
): ParticipantQuestion[] {
  return questions.map(q => projectQuestionForParticipant(q, shuffle));
}

/** Gibt dem Prüfling nur gültige Antworten auf Fragen dieser Prüfung zurück (z. B. bei Wiederaufnahme). */
export function projectAnswersForParticipant(questions: ExamQuestion[], stored: unknown): AnswerMap {
  const out: AnswerMap = {};
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return out;
  for (const q of questions) {
    if (!hasOwn(stored, q.id)) continue;
    const parsed = parseAnswerMap([q], { [q.id]: (stored as Record<string, unknown>)[q.id] });
    if (parsed.ok && hasOwn(parsed.answers, q.id)) out[q.id] = parsed.answers[q.id];
  }
  return out;
}

export interface ParticipantResult {
  status: ScoreStatus;
  totalPossiblePointsMilli: number;
  earnedPointsMilli: number;
  preliminaryScoreBasisPoints: number;
  /** null bei pending_review. */
  finalScoreBasisPoints: number | null;
  /** Ganze Prozentzahl für die Anzeige; null bei pending_review. */
  displayPercent: number | null;
  /** Nur bei Übungstests. Bei Abschlussprüfungen bleibt die Aufschlüsselung dauerhaft verborgen (§12). */
  questions?: Array<{
    questionId: string;
    earnedPointsMilli: number | null;
    maxPointsMilli: number;
    explanation?: string;
  }>;
}

/** Ergebnisbericht für den Prüfling. Erklärungen nur bei Übungstests (§12); nie Lösungsschlüssel. */
export function projectResultForParticipant(args: {
  assessmentStage: AssessmentStage;
  questions: ExamQuestion[];
  score: ExamScoreResult;
}): ParticipantResult {
  const { assessmentStage, questions, score } = args;
  const result: ParticipantResult = {
    status: score.status,
    totalPossiblePointsMilli: score.totalPossiblePointsMilli,
    earnedPointsMilli: score.autoEarnedPointsMilli + score.manualEarnedPointsMilli,
    preliminaryScoreBasisPoints: score.preliminaryScoreBasisPoints,
    finalScoreBasisPoints: score.finalScoreBasisPoints,
    displayPercent: score.finalScoreBasisPoints === null ? null : formatPercent(score.finalScoreBasisPoints)
  };
  if (assessmentStage === 'test') {
    const byId = new Map(questions.map(q => [q.id, q]));
    result.questions = score.questionResults.map(r => {
      const entry: NonNullable<ParticipantResult['questions']>[number] = {
        questionId: r.questionId,
        earnedPointsMilli: r.earnedPointsMilli,
        maxPointsMilli: r.maxPointsMilli
      };
      const explanation = byId.get(r.questionId)?.explanation;
      if (typeof explanation === 'string' && explanation.length > 0) entry.explanation = explanation;
      return entry;
    });
  }
  return result;
}
