/**
 * Versuchsaggregation und Kontingent (§7, §19.5).
 *
 * Standardregel "best": Der beste abgeschlossene Versuch bestimmt, ob bestanden ist. "last" wird immer
 * zusätzlich ausgewiesen. Die Auswahlregel ist ein Parameter (`AttemptSelectionRule`) und lässt sich über
 * `SELECTORS` um weitere Regeln ergänzen, ohne die übrige Logik zu ändern.
 */
import { isNonNegativeSafeInteger, isPositiveSafeInteger } from './examMath.ts';
import { DEFAULT_ATTEMPT_SELECTION } from './examTypes.ts';
import type { AssessmentStage, AttemptSelectionRule, AttemptSummary } from './examTypes.ts';

export type AggregateStatus = 'passed' | 'failed' | 'pending_review' | 'in_progress' | 'none';

export interface AttemptAggregate {
  userId: string;
  examId: string;
  attemptCourseCode: string;
  rule: AttemptSelectionRule;
  best: AttemptSummary | null;
  last: AttemptSummary | null;
  /** Der Versuch, den die gewählte Regel für das aktuelle Ergebnis heranzieht. */
  effective: AttemptSummary | null;
  status: AggregateStatus;
  passed: boolean;
  /** Alle nicht invalidierten Versuche (auch laufende), wie in §7 für das Kontingent. */
  countedAttempts: number;
  hasInProgress: boolean;
}

function isCounted(a: AttemptSummary): boolean {
  return a.status !== 'invalidated_by_admin';
}

function isFinal(a: AttemptSummary): boolean {
  return a.status === 'passed' || a.status === 'failed';
}

function timeOf(a: AttemptSummary): number {
  const t = Date.parse(a.submittedAtIso || a.startedAtIso);
  return Number.isNaN(t) ? 0 : t;
}

/** > 0, wenn a besser ist als b: bestanden vor nicht bestanden, dann Ergebnis, dann neuerer Versuch. */
function compareBest(a: AttemptSummary, b: AttemptSummary): number {
  const pa = a.status === 'passed' ? 1 : 0;
  const pb = b.status === 'passed' ? 1 : 0;
  if (pa !== pb) return pa - pb;
  const sa = a.finalScoreBasisPoints ?? -1;
  const sb = b.finalScoreBasisPoints ?? -1;
  if (sa !== sb) return sa - sb;
  if (timeOf(a) !== timeOf(b)) return timeOf(a) - timeOf(b);
  return a.attemptNumber - b.attemptNumber;
}

function compareRecent(a: AttemptSummary, b: AttemptSummary): number {
  if (timeOf(a) !== timeOf(b)) return timeOf(a) - timeOf(b);
  return a.attemptNumber - b.attemptNumber;
}

function maxBy(items: AttemptSummary[], compare: (a: AttemptSummary, b: AttemptSummary) => number): AttemptSummary | null {
  let best: AttemptSummary | null = null;
  for (const item of items) if (best === null || compare(item, best) > 0) best = item;
  return best;
}

/** Bester endgültig bewerteter Versuch (bestanden oder nicht bestanden); invalidierte zählen nicht. */
export function pickBest(attempts: AttemptSummary[]): AttemptSummary | null {
  return maxBy(attempts.filter(isFinal), compareBest);
}

/** Zuletzt abgegebener Versuch (auch pending_review); laufende und invalidierte zählen nicht. */
export function pickLast(attempts: AttemptSummary[]): AttemptSummary | null {
  return maxBy(
    attempts.filter(a => isCounted(a) && a.status !== 'in_progress'),
    compareRecent
  );
}

type Selector = (attempts: AttemptSummary[]) => AttemptSummary | null;

/** Eine neue Auswahlregel ist ein zusätzlicher Eintrag hier plus der Typ in examTypes.ts. */
const SELECTORS: Record<AttemptSelectionRule, Selector> = {
  // Ohne endgültig bewerteten Versuch zeigt "best" einen offenen pending_review-Versuch an.
  best: attempts => pickBest(attempts) ?? maxBy(attempts.filter(a => a.status === 'pending_review'), compareRecent),
  last: attempts => pickLast(attempts)
};

export function selectEffectiveAttempt(
  attempts: AttemptSummary[],
  rule: AttemptSelectionRule = DEFAULT_ATTEMPT_SELECTION
): AttemptSummary | null {
  return SELECTORS[rule](attempts);
}

/** Aggregat für eine Menge von Versuchen (der Aufrufer legt die Gruppe fest: Nutzer, Prüfung, Lehrgang). */
export function aggregateAttempts(
  attempts: AttemptSummary[],
  rule: AttemptSelectionRule = DEFAULT_ATTEMPT_SELECTION,
  identity?: { userId: string; examId: string; attemptCourseCode: string }
): AttemptAggregate {
  const counted = attempts.filter(isCounted);
  const effective = selectEffectiveAttempt(counted, rule);
  const first = counted[0] ?? attempts[0];
  const hasInProgress = counted.some(a => a.status === 'in_progress');

  let status: AggregateStatus = 'none';
  if (effective) {
    status = effective.status === 'passed' ? 'passed' : effective.status === 'failed' ? 'failed' : 'pending_review';
  } else if (hasInProgress) {
    status = 'in_progress';
  }

  return {
    userId: identity?.userId ?? first?.userId ?? '',
    examId: identity?.examId ?? first?.examId ?? '',
    attemptCourseCode: identity?.attemptCourseCode ?? first?.attemptCourseCode ?? '',
    rule,
    best: pickBest(counted),
    last: pickLast(counted),
    effective,
    status,
    passed: status === 'passed',
    countedAttempts: counted.length,
    hasInProgress
  };
}

/** Schlüssel des Aggregats: Nutzer, Prüfung und Lehrgang (§19.5). */
export function aggregateKey(userId: string, examId: string, attemptCourseCode: string): string {
  return JSON.stringify([userId, examId, attemptCourseCode]);
}

/** Gruppiert alle Versuche nach (Nutzer, Prüfung, Lehrgang); zwei Lehrgänge fallen nie zusammen. */
export function buildAggregates(
  attempts: AttemptSummary[],
  rule: AttemptSelectionRule = DEFAULT_ATTEMPT_SELECTION
): AttemptAggregate[] {
  const groups = new Map<string, AttemptSummary[]>();
  for (const a of attempts) {
    const key = aggregateKey(a.userId, a.examId, a.attemptCourseCode);
    const list = groups.get(key);
    if (list) list.push(a);
    else groups.set(key, [a]);
  }
  return [...groups.values()].map(group =>
    aggregateAttempts(group, rule, {
      userId: group[0].userId,
      examId: group[0].examId,
      attemptCourseCode: group[0].attemptCourseCode
    })
  );
}

// ---------------------------------------------------------------------------
// Kontingent (§3.1, §7)
// ---------------------------------------------------------------------------

export interface QuotaInput {
  assessmentStage: AssessmentStage;
  /** null, undefined, 0 = unbegrenzt. */
  maxAttempts?: number | null;
  /** Zusatzversuche dieses Nutzers (§7); ungültige Werte zählen als 0. */
  extraAttempts?: number;
  userId: string;
  /** Lehrgangskontext; Kontingente werden getrennt je Nutzer, Prüfung und Lehrgang geführt. */
  attemptCourseCode: string;
  examId: string;
  attempts: AttemptSummary[];
}

export interface QuotaResult {
  limited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  /** true, wenn ein neuer Versuch gestartet werden darf. Einen laufenden Versuch setzt der Aufrufer idempotent fort. */
  allowed: boolean;
}

export function evaluateQuota(input: QuotaInput): QuotaResult {
  const courseCode = input.attemptCourseCode.trim().toUpperCase();
  // Nur neue Versuche im konkreten Lehrgang verbrauchen das neue Kontingent.
  // Legacy-Zähler bleiben historische Statistik und werden nicht rückwirkend angerechnet.
  const used = input.attempts.filter(a =>
    a.userId === input.userId && a.examId === input.examId &&
    a.attemptCourseCode.trim().toUpperCase() === courseCode && isCounted(a)
  ).length;

  // Übungstests sind immer unbegrenzt (§3.1).
  const limited = input.assessmentStage === 'final_exam' && isPositiveSafeInteger(input.maxAttempts);
  if (!limited) return { limited: false, limit: null, used, remaining: null, allowed: true };

  const extra = isNonNegativeSafeInteger(input.extraAttempts) ? input.extraAttempts : 0;
  const limit = (input.maxAttempts as number) + extra;
  const remaining = Math.max(0, limit - used);
  return { limited: true, limit, used, remaining, allowed: used < limit };
}
