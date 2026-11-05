/**
 * Abbildung bisheriger Prüfungsdaten auf das neue Modell (§14, §19.5, §19.6) und Legacy-Verifikation.
 * Reine Funktionen: Es wird nichts gelesen oder geschrieben, und es werden keine Versuche oder Antworten erfunden.
 */
import { isPlainObject, isValidId, normalizeCourseCode, validateExamForPublication } from './examValidate.ts';
import type { ValidationResult } from './examValidate.ts';
import { isPositiveSafeInteger } from './examMath.ts';
import { BASIS_POINTS_FULL, defaultMaxAttempts, POINTS_PER_POINT } from './examTypes.ts';
import type {
  AssessmentStage,
  ExamQuestion,
  LegacyProgressRecord,
  LegacyVerificationDoc,
  SingleChoiceQuestion
} from './examTypes.ts';

// ---------------------------------------------------------------------------
// Legacy-Prüfungen
// ---------------------------------------------------------------------------

/** Felder der bisherigen AcademyExamDoc, die für die Abbildung gebraucht werden. */
export interface LegacyExamInput {
  id: string;
  title: string;
  moduleCode: string;
  assessmentStage: string;
  passingScore: number;
  timeLimitMinutes: number;
  examFormat: string;
  questionsPayload: string;
  interactiveWidgetCode?: string;
  authorUid?: string;
  updatedIso?: string;
}

export interface MigratedExamMaster {
  id: string;
  title: string;
  moduleCode: string;
  assignedCourseCodes: string[];
  assessmentStage: AssessmentStage;
  /** Bestehende aktive Prüfungen ohne Statusfeld werden als veröffentlicht übernommen (§19.5). */
  status: 'published';
  passingScoreBasisPoints: number;
  timeLimitMinutes: number;
  maxAttempts: number | null;
  examFormat: 'structured_quiz' | 'interactive_code';
  isLegacyFormat: boolean;
  /** false für interactive_code: Bewertung beruht auf einem Client-Ergebnis und darf nicht neu gestartet werden (§19.2). */
  startable: boolean;
  interactiveWidgetCode: string;
  authorUid?: string;
  updatedIso?: string;
  questions: ExamQuestion[];
}

export type LegacyExamMapping =
  | { ok: true; master: MigratedExamMaster; warnings: string[]; publication: ValidationResult | null }
  | { ok: false; errors: string[] };

/** Option-IDs der Migration sind deterministisch (Position bei der Migration), damit der Lauf wiederholbar ist. */
export function legacyOptionId(index: number): string {
  return `opt_${index + 1}`;
}

function mapLegacyQuestions(payload: string): { questions: SingleChoiceQuestion[]; errors: string[] } {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload || '[]');
  } catch {
    return { questions: [], errors: ['Die gespeicherten Fragen sind kein gültiges JSON.'] };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { questions: [], errors: ['Die Prüfung enthält keine Fragen.'] };
  }
  const questions: SingleChoiceQuestion[] = [];
  const seen = new Set<string>();
  parsed.forEach((item, i) => {
    const label = `Frage ${i + 1}`;
    if (!isPlainObject(item) || !isValidId(item.id) || typeof item.question !== 'string' || !item.question.trim()) {
      errors.push(`${label}: ID oder Fragetext ungültig.`);
      return;
    }
    if (seen.has(item.id)) {
      errors.push(`${label}: doppelte Fragen-ID "${item.id}".`);
      return;
    }
    seen.add(item.id);
    const options = item.options;
    if (!Array.isArray(options) || options.length < 2 || !options.every(o => typeof o === 'string' && o.trim())) {
      errors.push(`${label}: Antwortoptionen ungültig.`);
      return;
    }
    const idx = item.correctIndex;
    if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx >= options.length) {
      errors.push(`${label}: Index der richtigen Antwort ungültig.`);
      return;
    }
    const q: SingleChoiceQuestion = {
      id: item.id,
      type: 'single_choice',
      question: item.question,
      // Altfragen hatten keine Punkte und zählten gleich (Anteil richtiger Antworten): 1 Punkt je Frage.
      pointsMilli: POINTS_PER_POINT,
      options: (options as string[]).map((text, n) => ({ id: legacyOptionId(n), text })),
      correctOptionId: legacyOptionId(idx),
      legacyCorrectIndex: idx
    };
    if (typeof item.explanation === 'string' && item.explanation.trim()) q.explanation = item.explanation;
    questions.push(q);
  });
  return { questions, errors };
}

/** Bildet eine bisherige Prüfung auf das neue Modell ab. Bei Fehlern wird nicht migriert, nichts geraten. */
export function mapLegacyExam(legacy: LegacyExamInput): LegacyExamMapping {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidId(legacy.id)) errors.push('Ungültige Prüfungs-ID.');
  if (legacy.assessmentStage !== 'test' && legacy.assessmentStage !== 'final_exam') {
    errors.push('Unbekannte Prüfungsstufe; erlaubt sind nur "test" und "final_exam".');
  }
  if (typeof legacy.title !== 'string' || !legacy.title.trim()) errors.push('Der Titel fehlt.');
  if (legacy.examFormat !== 'structured_quiz' && legacy.examFormat !== 'interactive_code') {
    errors.push('Unbekanntes Prüfungsformat.');
  }
  if (typeof legacy.timeLimitMinutes !== 'number' || !Number.isSafeInteger(legacy.timeLimitMinutes) || legacy.timeLimitMinutes < 0) {
    errors.push('Ungültiges Zeitlimit.');
  }
  const rawScore = Number(legacy.passingScore);
  if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 100) {
    errors.push('Ungültige Bestehensgrenze.');
  }

  let questions: ExamQuestion[] = [];
  if (legacy.examFormat === 'structured_quiz') {
    const mapped = mapLegacyQuestions(legacy.questionsPayload);
    errors.push(...mapped.errors);
    questions = mapped.questions;
  }
  if (errors.length > 0) return { ok: false, errors };

  const stage: AssessmentStage = legacy.assessmentStage as AssessmentStage; // oben geprüft
  if (!Number.isInteger(rawScore)) warnings.push('Die Bestehensgrenze war keine ganze Prozentzahl und wurde gerundet.');
  const code = normalizeCourseCode(legacy.moduleCode);
  if (!code) warnings.push('Der Lehrgangscode ist ungültig; die Prüfung ist keinem Lehrgang zugewiesen.');

  const isInteractive = legacy.examFormat === 'interactive_code';
  const master: MigratedExamMaster = {
    id: legacy.id,
    title: legacy.title,
    moduleCode: legacy.moduleCode,
    assignedCourseCodes: code ? [code] : [],
    assessmentStage: stage,
    status: 'published',
    passingScoreBasisPoints: Math.min(BASIS_POINTS_FULL, Math.round(rawScore * 100)),
    timeLimitMinutes: legacy.timeLimitMinutes,
    maxAttempts: defaultMaxAttempts(stage),
    examFormat: isInteractive ? 'interactive_code' : 'structured_quiz',
    isLegacyFormat: isInteractive,
    startable: !isInteractive,
    interactiveWidgetCode: isInteractive ? String(legacy.interactiveWidgetCode ?? '') : '',
    questions
  };
  if (legacy.authorUid !== undefined) master.authorUid = legacy.authorUid;
  if (legacy.updatedIso !== undefined) master.updatedIso = legacy.updatedIso;

  const publication = isInteractive
    ? null
    : validateExamForPublication({
        title: master.title,
        assessmentStage: master.assessmentStage,
        timeLimitMinutes: master.timeLimitMinutes,
        passingScoreBasisPoints: master.passingScoreBasisPoints,
        maxAttempts: master.maxAttempts,
        assignedCourseCodes: master.assignedCourseCodes,
        questions: master.questions
      });
  if (publication && !publication.ok) {
    warnings.push('Die abgebildete Prüfung erfüllt die Veröffentlichungsvalidierung noch nicht.');
  }
  return { ok: true, master, warnings, publication };
}

// ---------------------------------------------------------------------------
// Legacy-Verifikation (§19.5)
// ---------------------------------------------------------------------------

/** Deterministische ID: Pro Legacy-Nachweis ist höchstens eine Verifikation möglich (create-only). */
export function legacyVerificationId(legacyProgressId: string): string {
  return `legacy_verification__${legacyProgressId.replace(/\//g, '%2F')}`;
}

/** Prüft die Pflichtfelder eines Verifikationsdatensatzes. */
export function validateLegacyVerification(doc: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isPlainObject(doc)) return { ok: false, errors: ['Kein gültiger Datensatz.'] };
  for (const key of ['id', 'legacyProgressId', 'userId', 'examId', 'verifiedByUid'] as const) {
    if (typeof doc[key] !== 'string' || !(doc[key] as string).trim()) errors.push(`${key} fehlt.`);
  }
  if (doc.verifiedStatus !== 'passed') errors.push('verifiedStatus muss "passed" sein.');
  if (
    typeof doc.verifiedScoreBasisPoints !== 'number' ||
    !Number.isSafeInteger(doc.verifiedScoreBasisPoints) ||
    doc.verifiedScoreBasisPoints < 0 ||
    doc.verifiedScoreBasisPoints > BASIS_POINTS_FULL
  ) {
    errors.push('verifiedScoreBasisPoints ist ungültig.');
  }
  if (
    doc.legacyUpdatedIso !== undefined &&
    (typeof doc.legacyUpdatedIso !== 'string' || doc.legacyUpdatedIso.length > 64 || Number.isNaN(Date.parse(doc.legacyUpdatedIso)))
  ) {
    errors.push('legacyUpdatedIso ist ungültig.');
  }
  if (
    typeof doc.legacyProgressId === 'string' &&
    typeof doc.id === 'string' &&
    doc.id !== legacyVerificationId(doc.legacyProgressId)
  ) {
    errors.push('id entspricht nicht der deterministischen Legacy-Verifikations-ID.');
  }
  if (typeof doc.verifiedAtIso !== 'string' || doc.verifiedAtIso.length > 64 || Number.isNaN(Date.parse(doc.verifiedAtIso))) {
    errors.push('verifiedAtIso ist kein gültiger Zeitstempel.');
  }
  if (typeof doc.reason !== 'string' || !doc.reason.trim() || doc.reason.length > 1000) {
    errors.push('Die Begründung fehlt oder überschreitet 1.000 Zeichen.');
  }
  if (doc.attemptCourseCode !== undefined && normalizeCourseCode(doc.attemptCourseCode) === null) {
    errors.push('attemptCourseCode ist ungültig.');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Erstellt den unveränderlichen Verifikationsnachweis aus dem serverseitig geladenen Legacy-Datensatz.
 * Identität, Prüfung und Lehrgang werden niemals aus Client-Eingaben übernommen.
 */
export function createLegacyVerificationDoc(
  progress: LegacyProgressRecord,
  verifiedByUid: string,
  verifiedAtIso: string,
  reason: string
): LegacyVerificationDoc {
  if (
    (progress.targetType !== 'test' && progress.targetType !== 'final_exam') ||
    progress.status !== 'passed'
  ) {
    throw new Error('EXAM_LEGACY_SOURCE_NOT_VERIFIABLE');
  }
  const courseCode = progress.courseCode === undefined
    ? undefined
    : normalizeCourseCode(progress.courseCode);
  if (progress.courseCode !== undefined && courseCode === null) {
    throw new Error('EXAM_LEGACY_COURSE_INVALID');
  }
  const score = Number(progress.scorePercent);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error('EXAM_LEGACY_SCORE_INVALID');
  }
  const verification: LegacyVerificationDoc = {
    id: legacyVerificationId(progress.id),
    legacyProgressId: progress.id,
    userId: progress.userId,
    examId: progress.targetId,
    ...(courseCode ? { attemptCourseCode: courseCode } : {}),
    verifiedStatus: 'passed',
    verifiedScoreBasisPoints: Math.round(score * 100),
    ...(progress.updatedIso !== undefined ? { legacyUpdatedIso: progress.updatedIso } : {}),
    verifiedByUid,
    verifiedAtIso,
    reason: typeof reason === 'string' ? reason.trim() : ''
  };
  if (!validateLegacyVerification(verification).ok) {
    throw new Error('EXAM_LEGACY_VERIFICATION_INVALID');
  }
  return verification;
}

/**
 * Gibt die gültige Verifikation für genau diesen Legacy-Nachweis zurück, sonst null.
 * Nutzer, Prüfung und Lehrgang müssen eindeutig übereinstimmen; ein fehlender Lehrgangscode
 * bleibt nur dann global, wenn er auf beiden Seiten fehlt.
 */
export function findValidVerification(
  progress: LegacyProgressRecord,
  verifications: LegacyVerificationDoc[]
): LegacyVerificationDoc | null {
  if (progress.status !== 'passed' || progress.targetType === 'module') return null;
  for (const v of verifications) {
    if (!validateLegacyVerification(v).ok) continue;
    if (v.legacyProgressId !== progress.id || v.userId !== progress.userId || v.examId !== progress.targetId) continue;
    const score = Number(progress.scorePercent);
    const scoreBasisPoints = Number.isFinite(score) && score >= 0 && score <= 100
      ? Math.round(score * 100)
      : null;
    if (scoreBasisPoints === null || v.verifiedScoreBasisPoints !== scoreBasisPoints) continue;
    if (v.legacyUpdatedIso !== undefined || progress.updatedIso !== undefined) {
      if (!v.legacyUpdatedIso || v.legacyUpdatedIso !== progress.updatedIso) continue;
    }
    if (v.attemptCourseCode !== undefined || progress.courseCode !== undefined) {
      const verificationCourse = normalizeCourseCode(v.attemptCourseCode);
      const progressCourse = normalizeCourseCode(progress.courseCode);
      if (!verificationCourse || !progressCourse || verificationCourse !== progressCourse) continue;
    }
    return v;
  }
  return null;
}

export interface LegacyEvidence {
  legacyProgressId: string;
  userId: string;
  examId: string;
  status: LegacyProgressRecord['status'];
  /** Altes Ergebnis in Basispunkten (ganze Prozent * 100), null wenn nicht lesbar. */
  scoreBasisPoints: number | null;
  /** Bereits verbrauchte Versuche laut Altzähler; 0, wenn der Zähler keine positive ganze Zahl ist. */
  legacyAttemptsConsumed: number;
  /** Nachvollziehbarer Abschluss: completed, passed oder failed. */
  completed: boolean;
  verified: boolean;
  /** true nur bei altem "passed" mit gültiger Admin-Verifikation. */
  satisfiesPassed: boolean;
  verification: LegacyVerificationDoc | null;
}

/** Wandelt einen alten Prüfungs-Fortschritt in einen Legacy-Nachweis. Lehrmaterial-Einträge ergeben null. */
export function mapLegacyProgress(
  record: LegacyProgressRecord,
  verifications: LegacyVerificationDoc[] = []
): LegacyEvidence | null {
  if (record.targetType !== 'test' && record.targetType !== 'final_exam') return null;
  const verification = findValidVerification(record, verifications);
  const score = Number(record.scorePercent);
  return {
    legacyProgressId: record.id,
    userId: record.userId,
    examId: record.targetId,
    status: record.status,
    scoreBasisPoints:
      Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score * 100) : null,
    legacyAttemptsConsumed: isPositiveSafeInteger(record.attempts) ? record.attempts : 0,
    completed: record.status === 'completed' || record.status === 'passed' || record.status === 'failed',
    verified: verification !== null,
    satisfiesPassed: record.status === 'passed' && verification !== null,
    verification
  };
}

/** Summe der aus Altdaten verbrauchten Versuche für einen Nutzer und eine Prüfung. */
export function sumLegacyAttemptsConsumed(
  records: LegacyProgressRecord[],
  userId: string,
  examId: string
): number {
  let sum = 0;
  for (const r of records) {
    if (r.userId !== userId || r.targetId !== examId) continue;
    sum += mapLegacyProgress(r)?.legacyAttemptsConsumed ?? 0;
  }
  return sum;
}
