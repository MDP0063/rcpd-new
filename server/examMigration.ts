import type { ExamRepository } from './examRepository.ts';
import { mapLegacyExam, mapLegacyProgress } from './examLegacy.ts';
import type { LegacyExamInput } from './examLegacy.ts';
import type { LegacyProgressRecord } from './examTypes.ts';

export interface LegacyMigrationIssue {
  kind: 'exam' | 'progress';
  sourceId: string;
  code: string;
  details?: string[];
}

export interface LegacyMigrationSummary {
  exams: { imported: number; alreadyMigrated: number; skipped: number };
  progress: { imported: number; alreadyMigrated: number; skipped: number };
  issues: LegacyMigrationIssue[];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sameDocument(existing: Record<string, unknown>, expected: Record<string, unknown>, ignored: string[] = []): boolean {
  const omit = new Set(ignored);
  const left = Object.fromEntries(Object.entries(existing).filter(([key]) => !omit.has(key)));
  const right = Object.fromEntries(Object.entries(expected).filter(([key]) => !omit.has(key)));
  return stableJson(left) === stableJson(right);
}

function legacyProgressDocument(record: LegacyProgressRecord) {
  const evidence = mapLegacyProgress(record);
  if (!evidence) return null;
  const id = `legacy_progress__${encodeURIComponent(record.id)}`;
  return {
    id,
    userId: evidence.userId,
    examId: evidence.examId,
    source: 'legacy',
    legacyProgressId: evidence.legacyProgressId,
    legacyStatus: evidence.status,
    scoreBasisPoints: evidence.scoreBasisPoints,
    legacyAttemptsConsumed: evidence.legacyAttemptsConsumed,
    completed: evidence.completed,
    verified: evidence.verified,
    satisfiesPassed: evidence.satisfiesPassed,
    ...(record.courseCode !== undefined ? { attemptCourseCode: record.courseCode } : {}),
    ...(record.updatedIso !== undefined ? { sourceUpdatedIso: record.updatedIso } : {})
  };
}

/**
 * Imports the existing portal exam definitions and progress as explicitly marked legacy data.
 * Every target ID is deterministic. Existing matching documents are left untouched; conflicting
 * documents abort that item rather than overwrite user-created or previously migrated data.
 */
export async function migrateLegacyExamData(
  repository: ExamRepository,
  legacyExams: LegacyExamInput[],
  legacyProgress: LegacyProgressRecord[],
  migratedAtIso = new Date().toISOString()
): Promise<LegacyMigrationSummary> {
  if (Number.isNaN(Date.parse(migratedAtIso))) throw new Error('EXAM_MIGRATION_TIMESTAMP_INVALID');

  const summary: LegacyMigrationSummary = {
    exams: { imported: 0, alreadyMigrated: 0, skipped: 0 },
    progress: { imported: 0, alreadyMigrated: 0, skipped: 0 },
    issues: []
  };

  for (const legacy of legacyExams) {
    const mapped = mapLegacyExam(legacy);
    if (!mapped.ok) {
      summary.exams.skipped++;
      summary.issues.push({ kind: 'exam', sourceId: legacy.id, code: 'LEGACY_EXAM_INVALID', details: mapped.errors });
      continue;
    }

    const examId = mapped.master.id;
    const versionId = `${examId}__v1`;
    const migrationTimestamp = legacy.updatedIso && !Number.isNaN(Date.parse(legacy.updatedIso))
      ? legacy.updatedIso
      : migratedAtIso;
    const master = {
      ...mapped.master,
      latestVersionNumber: 1,
      currentPublishedVersionId: versionId,
      legacyMigratedAtIso: migrationTimestamp
    };
    const version = {
      id: versionId,
      examId,
      versionNumber: 1,
      publishedAtIso: migrationTimestamp,
      publishedByUid: legacy.authorUid || 'system_legacy_migration',
      title: mapped.master.title,
      moduleCode: mapped.master.moduleCode,
      historicalAssignedCourseCodes: mapped.master.assignedCourseCodes,
      assessmentStage: mapped.master.assessmentStage,
      passingScoreBasisPoints: mapped.master.passingScoreBasisPoints,
      timeLimitMinutes: mapped.master.timeLimitMinutes,
      maxAttempts: mapped.master.maxAttempts,
      examFormat: mapped.master.examFormat,
      isLegacyFormat: mapped.master.isLegacyFormat,
      startable: mapped.master.startable,
      interactiveWidgetCode: mapped.master.interactiveWidgetCode,
      questionsSnapshot: mapped.master.questions,
      source: 'legacy_migration',
      sourceUpdatedIso: legacy.updatedIso ?? null
    };

    try {
      const result = await repository.runTransaction(async transaction => {
        const [existingMaster, existingVersion] = await Promise.all([
          transaction.get('exam_masters', examId),
          transaction.get('exam_versions', versionId)
        ]);
        if (existingMaster && !sameDocument(existingMaster, master, ['legacyMigratedAtIso'])) {
          throw new Error('EXAM_MIGRATION_MASTER_CONFLICT');
        }
        if (existingVersion && !sameDocument(existingVersion, version, ['publishedAtIso'])) {
          throw new Error('EXAM_MIGRATION_VERSION_CONFLICT');
        }
        if (!existingMaster) await transaction.create('exam_masters', examId, master);
        if (!existingVersion) await transaction.create('exam_versions', versionId, version);
        return Boolean(existingMaster && existingVersion);
      });
      if (result) summary.exams.alreadyMigrated++;
      else summary.exams.imported++;
    } catch (error) {
      summary.exams.skipped++;
      const code = error instanceof Error ? error.message : 'EXAM_MIGRATION_FAILED';
      summary.issues.push({ kind: 'exam', sourceId: examId, code });
    }
  }

  // Existing masters may have been created by an earlier partial run or by a later authoring flow.
  // Progress is imported only when its exam reference exists in the new repository.
  for (const record of legacyProgress) {
    const document = legacyProgressDocument(record);
    if (!document) continue;
    try {
      const master = await repository.get('exam_masters', document.examId);
      if (!master) {
        summary.progress.skipped++;
        summary.issues.push({
          kind: 'progress',
          sourceId: record.id,
          code: 'EXAM_MIGRATION_MASTER_MISSING'
        });
        continue;
      }
      const existing = await repository.get('exam_progress', document.id);
      if (existing) {
        if (!sameDocument(existing, document)) {
          summary.progress.skipped++;
          summary.issues.push({
            kind: 'progress',
            sourceId: record.id,
            code: 'EXAM_MIGRATION_PROGRESS_CONFLICT'
          });
        } else {
          summary.progress.alreadyMigrated++;
        }
        continue;
      }
      await repository.create('exam_progress', document.id, document);
      summary.progress.imported++;
    } catch (error) {
      summary.progress.skipped++;
      summary.issues.push({
        kind: 'progress',
        sourceId: record.id,
        code: error instanceof Error ? error.message : 'EXAM_MIGRATION_FAILED'
      });
    }
  }

  return summary;
}
