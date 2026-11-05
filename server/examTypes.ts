/**
 * Datenmodelle der Prüfungswerkstatt (Phase 1, reine Typen und Konstanten).
 * Grundlage: docs/EXAM_WORKSHOP_ARCHITECTURE_V3.8.md, insbesondere §3 und §19.
 * Keine Abhängigkeit von Express, Firestore oder dem Portal-State.
 *
 * Einheiten (§19.6): Punkte sind ganze Tausendstel-Punkte (`pointsMilli`, 1 Punkt = 1000),
 * die Bestehensgrenze ist in Basispunkten gespeichert (75 % = 7500).
 */

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'matching'
  | 'free_text';

export type AssessmentStage = 'test' | 'final_exam';

export interface ExamOption {
  id: string;
  text: string;
}

/** Ein Zuordnungspaar: linke Seite (prompt) gehört zu genau einem Ziel (Eins-zu-eins, §9). */
export interface MatchingPair {
  id: string;
  prompt: string;
  targetId: string;
  targetText: string;
}

interface QuestionBase {
  id: string;
  question: string;
  pointsMilli: number;
  explanation?: string;
  imageUrl?: string;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'single_choice';
  options: ExamOption[];
  correctOptionId: string;
  /** Nur bei migrierten Altfragen: ursprünglicher Index, zur Nachvollziehbarkeit (§19.6). */
  legacyCorrectIndex?: number;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple_choice';
  options: ExamOption[];
  correctOptionIds: string[];
}

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true_false';
  correctBoolean: boolean;
}

export interface MatchingQuestion extends QuestionBase {
  type: 'matching';
  matchingPairs: MatchingPair[];
}

export interface FreeTextQuestion extends QuestionBase {
  type: 'free_text';
  gradingRubric: string;
  maxAnswerLength?: number;
}

export type ExamQuestion =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | MatchingQuestion
  | FreeTextQuestion;

// ---------------------------------------------------------------------------
// Antworten (§19.6)
// ---------------------------------------------------------------------------

export interface MatchingAnswerEntry {
  pairId: string;
  targetId: string;
}

export type AnswerValue = string | string[] | boolean | MatchingAnswerEntry[] | null;

/** Antworten je Fragen-ID. Fehlende Einträge gelten als unbeantwortet. */
export type AnswerMap = Record<string, AnswerValue | undefined>;

// ---------------------------------------------------------------------------
// Prüfungsdefinition und Voraussetzungen
// ---------------------------------------------------------------------------

export type PrerequisiteMode = 'completed' | 'passed';

export interface ExamPrerequisite {
  /** ID der Prüfung (Master), die vorher abgelegt sein muss. */
  examId: string;
  mode: PrerequisiteMode;
  /** Optionaler Mindestwert in Basispunkten (0 bis 10000). */
  minScoreBasisPoints?: number;
}

/** Inhalt und Parameter, die vor der Veröffentlichung geprüft werden. */
export interface ExamDefinition {
  title: string;
  assessmentStage: AssessmentStage;
  /** 0 = unbegrenzt (§3.1). */
  timeLimitMinutes: number;
  passingScoreBasisPoints: number;
  /** null, undefined und 0 = unbegrenzt (§3.1, §7). */
  maxAttempts?: number | null;
  prerequisites?: ExamPrerequisite[];
  assignedCourseCodes: string[];
  questions: ExamQuestion[];
}

// ---------------------------------------------------------------------------
// Versuche und Ergebnisse
// ---------------------------------------------------------------------------

export type AttemptStatus =
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'pending_review'
  | 'invalidated_by_admin';

/** Schmale Sicht auf einen Versuch für Aggregation, Kontingent und Voraussetzungen. */
export interface AttemptSummary {
  id: string;
  userId: string;
  examId: string;
  attemptCourseCode: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAtIso: string;
  submittedAtIso?: string | null;
  /** Endgültiges Ergebnis in Basispunkten; null solange kein endgültiges Ergebnis vorliegt. */
  finalScoreBasisPoints?: number | null;
}

export type AttemptSelectionRule = 'best' | 'last';
export const DEFAULT_ATTEMPT_SELECTION: AttemptSelectionRule = 'best';

// ---------------------------------------------------------------------------
// Legacy (§19.5)
// ---------------------------------------------------------------------------

/** Schmale Sicht auf einen bisherigen UserProgressDoc (nur Prüfungs-Einträge sind relevant). */
export interface LegacyProgressRecord {
  id: string;
  userId: string;
  /** Bei Prüfungen die bestehende Prüfungs-ID. */
  targetId: string;
  targetType: 'module' | 'test' | 'final_exam';
  status: 'in_progress' | 'completed' | 'passed' | 'failed';
  scorePercent: number;
  attempts: number;
  courseCode?: string;
  updatedIso?: string;
}

/** Create-only Nachweis in `exam_legacy_verifications` (§19.5). */
export interface LegacyVerificationDoc {
  [key: string]: unknown;
  id: string;
  legacyProgressId: string;
  userId: string;
  examId: string;
  attemptCourseCode?: string;
  verifiedStatus: 'passed';
  /** Ergebnisstand, den der Admin tatsächlich geprüft hat. */
  verifiedScoreBasisPoints: number;
  /** Bindet die Verifikation an die konkrete Version des Legacy-Datensatzes, sofern vorhanden. */
  legacyUpdatedIso?: string;
  verifiedByUid: string;
  verifiedAtIso: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Konstanten
// ---------------------------------------------------------------------------

export const POINTS_PER_POINT = 1000;
export const BASIS_POINTS_FULL = 10_000;

export const EXAM_LIMITS = {
  maxQuestions: 200,
  maxOptions: 20,
  maxMatchingPairs: 20,
  maxTitleLength: 200,
  maxQuestionLength: 2000,
  maxOptionLength: 500,
  maxExplanationLength: 4000,
  maxRubricLength: 4000,
  maxIdLength: 100,
  maxImageUrlLength: 500,
  maxFreeTextLength: 4000,
  maxTimeLimitMinutes: 24 * 60,
  maxCourseCodes: 50,
  maxPrerequisites: 20,
  /** Anwendungs-Limit für den serialisierten Snapshot (§5). */
  maxSnapshotBytes: 500_000
} as const;

/** Standard-Versuchslimit bei der Anlage (§3.1): Abschlussprüfung 3, Übungstest unbegrenzt. */
export function defaultMaxAttempts(stage: AssessmentStage): number | null {
  return stage === 'final_exam' ? 3 : null;
}
