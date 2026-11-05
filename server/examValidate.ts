/**
 * Validierung von Prüfungsdefinitionen vor der Veröffentlichung (§19.6) und Snapshot-Größe (§5).
 * Die Funktionen nehmen bewusst `unknown` entgegen, weil die Daten aus Admin-Eingaben stammen.
 */
import { isNonNegativeSafeInteger, isPositiveSafeInteger } from './examMath.ts';
import { BASIS_POINTS_FULL, EXAM_LIMITS } from './examTypes.ts';

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
}

type Obj = Record<string, unknown>;

const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'true_false', 'matching', 'free_text'];
const STAGES = ['test', 'final_exam'];
const PREREQUISITE_MODES = ['completed', 'passed'];
const COURSE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,39}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export function isPlainObject(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Stabile IDs: nicht leer, getrimmt, kurz, ohne Steuerzeichen und ohne "/" (Firestore-Pfade). */
export function isValidId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= EXAM_LIMITS.maxIdLength &&
    value === value.trim() &&
    !value.includes('/') &&
    !CONTROL_CHARS.test(value) &&
    value !== '__proto__'
  );
}

export function isHttpsUrl(value: unknown, maxLength: number = EXAM_LIMITS.maxImageUrlLength): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function normalizeCourseCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return COURSE_CODE_PATTERN.test(code) ? code : null;
}

class Issues {
  readonly list: ValidationIssue[] = [];
  add(path: string, code: string, message: string): void {
    this.list.push({ path, code, message });
  }
  result(): ValidationResult {
    return { ok: this.list.length === 0, errors: this.list };
  }
}

function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function validateOptions(options: unknown, path: string, issues: Issues): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(options)) {
    issues.add(`${path}.options`, 'options_missing', 'Die Antwortoptionen fehlen.');
    return ids;
  }
  if (options.length < 2 || options.length > EXAM_LIMITS.maxOptions) {
    issues.add(
      `${path}.options`,
      'options_count',
      `Es sind 2 bis ${EXAM_LIMITS.maxOptions} Antwortoptionen nötig.`
    );
  }
  options.forEach((option, i) => {
    const p = `${path}.options[${i}]`;
    if (!isPlainObject(option) || !isValidId(option.id)) {
      issues.add(p, 'option_id_invalid', 'Jede Option braucht eine gültige ID.');
      return;
    }
    if (ids.has(option.id)) issues.add(p, 'option_id_duplicate', 'Optionen-IDs müssen eindeutig sein.');
    ids.add(option.id);
    if (!isText(option.text, EXAM_LIMITS.maxOptionLength)) {
      issues.add(p, 'option_text_invalid', 'Der Optionstext fehlt oder ist zu lang.');
    }
  });
  return ids;
}

function validateMatchingPairs(pairs: unknown, path: string, issues: Issues): void {
  if (!Array.isArray(pairs)) {
    issues.add(`${path}.matchingPairs`, 'pairs_missing', 'Die Zuordnungspaare fehlen.');
    return;
  }
  if (pairs.length < 2 || pairs.length > EXAM_LIMITS.maxMatchingPairs) {
    issues.add(
      `${path}.matchingPairs`,
      'pairs_count',
      `Es sind 2 bis ${EXAM_LIMITS.maxMatchingPairs} Zuordnungspaare nötig.`
    );
  }
  const pairIds = new Set<string>();
  const targetIds = new Set<string>();
  pairs.forEach((pair, i) => {
    const p = `${path}.matchingPairs[${i}]`;
    if (!isPlainObject(pair) || !isValidId(pair.id) || !isValidId(pair.targetId)) {
      issues.add(p, 'pair_id_invalid', 'Paar und Ziel brauchen gültige IDs.');
      return;
    }
    if (pairIds.has(pair.id)) issues.add(p, 'pair_id_duplicate', 'Paar-IDs müssen eindeutig sein.');
    if (targetIds.has(pair.targetId)) {
      issues.add(p, 'target_id_duplicate', 'Ziel-IDs müssen eindeutig sein (Eins-zu-eins-Zuordnung).');
    }
    pairIds.add(pair.id);
    targetIds.add(pair.targetId);
    if (!isText(pair.prompt, EXAM_LIMITS.maxOptionLength) || !isText(pair.targetText, EXAM_LIMITS.maxOptionLength)) {
      issues.add(p, 'pair_text_invalid', 'Paar- und Zieltext müssen ausgefüllt und nicht zu lang sein.');
    }
  });
}

function validateQuestion(question: unknown, index: number, seenIds: Set<string>, issues: Issues): void {
  const path = `questions[${index}]`;
  if (!isPlainObject(question)) {
    issues.add(path, 'question_invalid', 'Die Frage ist kein gültiges Objekt.');
    return;
  }
  if (!isValidId(question.id)) {
    issues.add(`${path}.id`, 'question_id_invalid', 'Jede Frage braucht eine gültige, nicht leere ID.');
  } else if (seenIds.has(question.id)) {
    issues.add(`${path}.id`, 'question_id_duplicate', 'Fragen-IDs müssen eindeutig sein.');
  } else {
    seenIds.add(question.id);
  }
  if (!isText(question.question, EXAM_LIMITS.maxQuestionLength)) {
    issues.add(`${path}.question`, 'question_text_invalid', 'Der Fragetext fehlt oder ist zu lang.');
  }
  if (!isPositiveSafeInteger(question.pointsMilli)) {
    issues.add(`${path}.pointsMilli`, 'points_invalid', 'Die Punktzahl muss eine ganze Zahl größer 0 sein (Tausendstel-Punkte).');
  }
  if (question.explanation !== undefined && !(typeof question.explanation === 'string' && question.explanation.length <= EXAM_LIMITS.maxExplanationLength)) {
    issues.add(`${path}.explanation`, 'explanation_invalid', 'Die Erklärung ist ungültig oder zu lang.');
  }
  if (question.imageUrl !== undefined && !isHttpsUrl(question.imageUrl)) {
    issues.add(`${path}.imageUrl`, 'image_url_invalid', 'Bilder müssen über eine gültige HTTPS-URL eingebunden werden.');
  }

  const type = question.type;
  if (typeof type !== 'string' || !QUESTION_TYPES.includes(type)) {
    issues.add(`${path}.type`, 'question_type_unsupported', 'Der Fragetyp wird nicht unterstützt.');
    return;
  }

  switch (type) {
    case 'single_choice': {
      const ids = validateOptions(question.options, path, issues);
      if (typeof question.correctOptionId !== 'string' || !ids.has(question.correctOptionId)) {
        issues.add(`${path}.correctOptionId`, 'correct_option_invalid', 'Es muss genau eine gültige richtige Option gewählt sein.');
      }
      break;
    }
    case 'multiple_choice': {
      const ids = validateOptions(question.options, path, issues);
      const correct = question.correctOptionIds;
      if (!Array.isArray(correct) || correct.length === 0) {
        issues.add(`${path}.correctOptionIds`, 'correct_options_missing', 'Mindestens eine richtige Option ist nötig.');
      } else {
        const seen = new Set<string>();
        for (const id of correct) {
          if (typeof id !== 'string' || !ids.has(id) || seen.has(id)) {
            issues.add(`${path}.correctOptionIds`, 'correct_options_invalid', 'Die richtigen Optionen müssen gültig und eindeutig sein.');
            break;
          }
          seen.add(id);
        }
      }
      break;
    }
    case 'true_false':
      if (typeof question.correctBoolean !== 'boolean') {
        issues.add(`${path}.correctBoolean`, 'correct_boolean_invalid', 'Der Lösungsschlüssel muss wahr oder falsch sein.');
      }
      break;
    case 'matching':
      validateMatchingPairs(question.matchingPairs, path, issues);
      break;
    case 'free_text':
      if (!isText(question.gradingRubric, EXAM_LIMITS.maxRubricLength)) {
        issues.add(`${path}.gradingRubric`, 'rubric_missing', 'Freitext braucht eine Bewertungsrubrik oder Bewertungsanweisung.');
      }
      if (
        question.maxAnswerLength !== undefined &&
        !(isPositiveSafeInteger(question.maxAnswerLength) && question.maxAnswerLength <= EXAM_LIMITS.maxFreeTextLength)
      ) {
        issues.add(`${path}.maxAnswerLength`, 'max_answer_length_invalid', `Die maximale Antwortlänge liegt zwischen 1 und ${EXAM_LIMITS.maxFreeTextLength}.`);
      }
      break;
  }
}

function validateParameters(def: Obj, issues: Issues): void {
  if (!isText(def.title, EXAM_LIMITS.maxTitleLength)) {
    issues.add('title', 'title_invalid', 'Der Titel fehlt oder ist zu lang.');
  }
  if (typeof def.assessmentStage !== 'string' || !STAGES.includes(def.assessmentStage)) {
    issues.add('assessmentStage', 'stage_invalid', 'Die Prüfungsstufe ist ungültig.');
  }
  if (!isNonNegativeSafeInteger(def.timeLimitMinutes) || def.timeLimitMinutes > EXAM_LIMITS.maxTimeLimitMinutes) {
    issues.add('timeLimitMinutes', 'time_limit_invalid', `Das Zeitlimit ist eine ganze Zahl von 0 (unbegrenzt) bis ${EXAM_LIMITS.maxTimeLimitMinutes} Minuten.`);
  }
  if (!isNonNegativeSafeInteger(def.passingScoreBasisPoints) || def.passingScoreBasisPoints > BASIS_POINTS_FULL) {
    issues.add('passingScoreBasisPoints', 'passing_score_invalid', 'Die Bestehensgrenze liegt als ganze Zahl zwischen 0 und 10000 Basispunkten.');
  }
  if (def.maxAttempts !== undefined && def.maxAttempts !== null && !isNonNegativeSafeInteger(def.maxAttempts)) {
    issues.add('maxAttempts', 'max_attempts_invalid', 'Das Versuchslimit ist leer, 0 (unbegrenzt) oder eine positive ganze Zahl.');
  }

  if (def.prerequisites !== undefined) {
    if (!Array.isArray(def.prerequisites) || def.prerequisites.length > EXAM_LIMITS.maxPrerequisites) {
      issues.add('prerequisites', 'prerequisites_invalid', 'Die Voraussetzungen sind ungültig oder zu zahlreich.');
    } else {
      const seen = new Set<string>();
      def.prerequisites.forEach((item, i) => {
        const p = `prerequisites[${i}]`;
        if (!isPlainObject(item) || !isValidId(item.examId) || typeof item.mode !== 'string' || !PREREQUISITE_MODES.includes(item.mode)) {
          issues.add(p, 'prerequisite_invalid', 'Eine Voraussetzung braucht eine Prüfungs-ID und den Modus completed oder passed.');
          return;
        }
        if (seen.has(item.examId)) issues.add(p, 'prerequisite_duplicate', 'Jede Prüfung darf nur einmal als Voraussetzung vorkommen.');
        seen.add(item.examId);
        if (item.minScoreBasisPoints !== undefined) {
          if (item.mode !== 'passed' || !isNonNegativeSafeInteger(item.minScoreBasisPoints) || item.minScoreBasisPoints > BASIS_POINTS_FULL) {
            issues.add(`${p}.minScoreBasisPoints`, 'prerequisite_min_invalid', 'Ein Mindestwert gilt nur für passed und liegt zwischen 0 und 10000 Basispunkten.');
          }
        }
      });
    }
  }

  if (!Array.isArray(def.assignedCourseCodes) || def.assignedCourseCodes.length > EXAM_LIMITS.maxCourseCodes) {
    issues.add('assignedCourseCodes', 'course_codes_invalid', 'Die Lehrgangszuweisung ist ungültig.');
  } else {
    const seen = new Set<string>();
    for (const raw of def.assignedCourseCodes) {
      const code = normalizeCourseCode(raw);
      if (!code || seen.has(code)) {
        issues.add('assignedCourseCodes', 'course_code_invalid', 'Lehrgangscodes müssen gültig und eindeutig sein.');
        break;
      }
      seen.add(code);
    }
  }
}

/** Prüft Inhalt und Parameter einer Prüfung. Die Snapshot-Größe prüft `checkSnapshotSize` separat. */
export function validateExamForPublication(definition: unknown): ValidationResult {
  const issues = new Issues();
  if (!isPlainObject(definition)) {
    issues.add('', 'definition_invalid', 'Die Prüfungsdefinition ist kein gültiges Objekt.');
    return issues.result();
  }
  validateParameters(definition, issues);

  const questions = definition.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    issues.add('questions', 'questions_missing', 'Die Prüfung braucht mindestens eine Frage.');
  } else if (questions.length > EXAM_LIMITS.maxQuestions) {
    issues.add('questions', 'questions_too_many', `Eine Prüfung hat höchstens ${EXAM_LIMITS.maxQuestions} Fragen.`);
  } else {
    const seen = new Set<string>();
    questions.forEach((q, i) => validateQuestion(q, i, seen, issues));
    const total = questions.reduce(
      (sum: number, q) => sum + (isPlainObject(q) && isPositiveSafeInteger(q.pointsMilli) ? q.pointsMilli : 0),
      0
    );
    if (!Number.isSafeInteger(total)) {
      issues.add('questions', 'points_total_unsafe', 'Die Gesamtpunktzahl ist zu groß.');
    }
  }
  return issues.result();
}

/** §5: Das serialisierte Snapshot-Objekt darf 500.000 UTF-8-Bytes nicht überschreiten. */
export function checkSnapshotSize(
  snapshot: unknown,
  limitBytes: number = EXAM_LIMITS.maxSnapshotBytes
): { ok: boolean; bytes: number } {
  const bytes = Buffer.byteLength(JSON.stringify(snapshot) ?? '', 'utf8');
  return { ok: bytes <= limitBytes, bytes };
}
