/**
 * Auswertung der Voraussetzungen einer Prüfung (§8, §19.5).
 *
 * Quellen: zuerst die neuen, nicht invalidierten Versuche, danach Legacy-Nachweise.
 * Ein altes "passed" zählt nur mit gültiger Admin-Verifikation. Die Auswertung bezieht sich auf die
 * Prüfung insgesamt (über alle Lehrgänge des Nutzers) und nutzt die übergebene Auswahlregel (Standard "best").
 */
import { aggregateAttempts } from './examAggregate.ts';
import { mapLegacyProgress } from './examLegacy.ts';
import { DEFAULT_ATTEMPT_SELECTION } from './examTypes.ts';
import type {
  AttemptSelectionRule,
  AttemptSummary,
  ExamPrerequisite,
  LegacyProgressRecord,
  LegacyVerificationDoc
} from './examTypes.ts';

export interface PrerequisiteContext {
  userId: string;
  attempts: AttemptSummary[];
  legacyProgress: LegacyProgressRecord[];
  legacyVerifications: LegacyVerificationDoc[];
  /** UIDs, die ein Admin manuell freigeschaltet hat (§8). */
  manualUnlockUserUids?: string[];
  rule?: AttemptSelectionRule;
}

export type PrerequisiteSource = 'attempt' | 'legacy' | 'none';

export interface PrerequisiteCheck {
  examId: string;
  mode: ExamPrerequisite['mode'];
  met: boolean;
  source: PrerequisiteSource;
  /** true, wenn nur ein nicht verifiziertes altes "passed" vorliegt (hilft bei der Anzeige für den Admin). */
  legacyPassedUnverified: boolean;
}

export interface PrerequisiteEvaluation {
  /** true, wenn alle Voraussetzungen erfüllt sind oder der Nutzer manuell freigeschaltet wurde. */
  met: boolean;
  manuallyUnlocked: boolean;
  checks: PrerequisiteCheck[];
}

function checkOne(pre: ExamPrerequisite, ctx: PrerequisiteContext): PrerequisiteCheck {
  const rule = ctx.rule ?? DEFAULT_ATTEMPT_SELECTION;
  const min = pre.minScoreBasisPoints;
  const result = (met: boolean, source: PrerequisiteSource, legacyPassedUnverified = false): PrerequisiteCheck => ({
    examId: pre.examId,
    mode: pre.mode,
    met,
    source,
    legacyPassedUnverified
  });

  // 1. Neue Versuche
  const own = ctx.attempts.filter(a => a.userId === ctx.userId && a.examId === pre.examId);
  const agg = aggregateAttempts(own, rule, { userId: ctx.userId, examId: pre.examId, attemptCourseCode: '' });
  if (pre.mode === 'completed') {
    // Abgegeben zählt als absolviert, auch wenn die Korrektur noch offen ist.
    if (agg.status === 'passed' || agg.status === 'failed' || agg.status === 'pending_review') {
      return result(true, 'attempt');
    }
  } else if (agg.passed && agg.effective) {
    const score = agg.effective.finalScoreBasisPoints;
    if (min === undefined || (typeof score === 'number' && score >= min)) return result(true, 'attempt');
  }

  // 2. Legacy-Nachweise
  let unverified = false;
  for (const record of ctx.legacyProgress) {
    if (record.userId !== ctx.userId || record.targetId !== pre.examId) continue;
    const evidence = mapLegacyProgress(record, ctx.legacyVerifications);
    if (!evidence) continue;
    if (pre.mode === 'completed') {
      if (evidence.completed) return result(true, 'legacy');
    } else if (evidence.satisfiesPassed) {
      if (min === undefined || (evidence.scoreBasisPoints !== null && evidence.scoreBasisPoints >= min)) {
        return result(true, 'legacy');
      }
    } else if (record.status === 'passed') {
      unverified = true;
    }
  }
  return result(false, 'none', unverified);
}

export function evaluatePrerequisites(
  prerequisites: ExamPrerequisite[] | undefined,
  ctx: PrerequisiteContext
): PrerequisiteEvaluation {
  const checks = (prerequisites ?? []).map(p => checkOne(p, ctx));
  const manuallyUnlocked = Array.isArray(ctx.manualUnlockUserUids) && ctx.manualUnlockUserUids.includes(ctx.userId);
  return { met: manuallyUnlocked || checks.every(c => c.met), manuallyUnlocked, checks };
}
