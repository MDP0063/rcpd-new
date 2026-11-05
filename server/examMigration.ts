import { createHash } from 'node:crypto';
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
  exams: { imported: number; updated: number; alreadyMigrated: number; skipped: number };
  progress: { imported: number; updated: number; alreadyMigrated: number; skipped: number };
  issues: LegacyMigrationIssue[];
}

const MIGRATION_MASTER_FIELDS = [
  'latestVersionNumber',
  'currentPublishedVersionId',
  'source',
  'legacySourceFingerprint',
  'legacyMasterFingerprint',
  'legacySourceUpdatedIso',
  'legacyMigratedAtIso'
] as const;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(stableJson(value), 'utf8').digest('hex');
}

function sameDocument(existing: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  return stableJson(existing) === stableJson(expected);
}

function masterContentFingerprint(master: Record<string, unknown>): string {
  const content = Object.fromEntries(
    Object.entries(master).filter(([key]) => !(MIGRATION_MASTER_FIELDS as readonly string[]).includes(key))
  );
  return fingerprint(content);
}

function legacyProgressDocument(repository: ExamRepository, record: LegacyProgressRecord) {
  return repository.getLegacyVerification(record.id).then(verification => {
    const evidence = mapLegacyProgress(record, verification ? [verification] : []);
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
      ...(evidence.verification ? { legacyVerificationId: evidence.verification.id } : {}),
      ...(record.courseCode !== undefined ? { attemptCourseCode: record.courseCode } : {}),
      ...(record.updatedIso !== undefined ? { sourceUpdatedIso: record.updatedIso } : {})
    };
  });
}

function createMigratedVersion(
  examId: string,
  versionNumber: number,
  master: ReturnType<typeof mapLegacyExam> extends { ok: true; master: infer T } ? T : never,
  sourceFingerprint: string,
  masterFingerprint: string,
  legacy: LegacyExamInput,
  migratedAtIso: string
) {
  return {
    id: `${examId}__v${versionNumber}`,
    examId,
    versionNumber,
    publishedAtIso: migratedAtIso,
    publishedByUid: legacy.authorUid || 'system_legacy_migration',
    title: master.title,
    moduleCode: master.moduleCode,
    historicalAssignedCourseCodes: master.assignedCourseCodes,
    assessmentStage: master.assessmentStage,
    passingScoreBasisPoints: master.passingScoreBasisPoints,
    minClearance: master.minClearance,
    timeLimitMinutes: master.timeLimitMinutes,
    maxAttempts: master.maxAttempts,
    examFormat: master.examFormat,
    isLegacyFormat: master.isLegacyFormat,
    startable: master.startable,
    interactiveWidgetCode: master.interactiveWidgetCode,
    questionsSnapshot: master.questions,
    source: 'legacy_migration',
    sourceFingerprint,
    masterFingerprint,
    sourceUpdatedIso: legacy.updatedIso ?? null
  };
}

/**
 * Imports legacy exam definitions as immutable versions and legacy progress as explicitly marked
 * projections. Deterministic IDs make partial runs repeatable. Changed legacy exams become new
 * immutable versions; migration-owned masters are updated only when their current content still
 * matches the last migration fingerprint. User-authored changes are never overwritten.
 */
export async function migrateLegacyExamData(
  repository: ExamRepository,
  legacyExams: LegacyExamInput[],
  legacyProgress: LegacyProgressRecord[],
  migratedAtIso = new Date().toISOString()
): Promise<LegacyMigrationSummary> {
  if (Number.isNaN(Date.parse(migratedAtIso))) throw new Error('EXAM_MIGRATION_TIMESTAMP_INVALID');

  const summary: LegacyMigrationSummary = {
    exams: { imported: 0, updated: 0, alreadyMigrated: 0, skipped: 0 },
    progress: { imported: 0, updated: 0, alreadyMigrated: 0, skipped: 0 },
    issues: []
  };

  const seenExamIds = new Set<string>();
  for (const legacy of legacyExams) {
    if (!legacy || typeof legacy !== 'object' || typeof legacy.id !== 'string' || !legacy.id.trim()) {
      summary.exams.skipped++;
      summary.issues.push({ kind: 'exam', sourceId: '<unknown>', code: 'LEGACY_EXAM_RECORD_INVALID' });
      continue;
    }
    if (seenExamIds.has(legacy.id)) {
      summary.exams.skipped++;
      summary.issues.push({ kind: 'exam', sourceId: legacy.id, code: 'LEGACY_EXAM_DUPLICATE_SOURCE_ID' });
      continue;
    }
    seenExamIds.add(legacy.id);

    const mapped = mapLegacyExam(legacy);
    if (!mapped.ok) {
      summary.exams.skipped++;
      summary.issues.push({ kind: 'exam', sourceId: legacy.id, code: 'LEGACY_EXAM_INVALID', details: mapped.errors });
      continue;
    }

    const examId = mapped.master.id;
    const sourceFingerprint = fingerprint(legacy);
    const masterFingerprint = fingerprint(mapped.master);
    const master = {
      ...mapped.master,
      latestVersionNumber: 1,
      currentPublishedVersionId: `${examId}__v1`,
      source: 'legacy_migration',
      legacySourceFingerprint: sourceFingerprint,
      legacyMasterFingerprint: masterFingerprint,
      legacySourceUpdatedIso: legacy.updatedIso ?? null,
      legacyMigratedAtIso: migratedAtIso
    };

    try {
      const outcome = await repository.runTransaction(async transaction => {
        const existingMaster = await transaction.get('exam_masters', examId);
        if (!existingMaster) {
          const firstVersion = createMigratedVersion(
            examId, 1, mapped.master, sourceFingerprint, masterFingerprint, legacy, migratedAtIso
          );
          const existingFirstVersion = await transaction.get('exam_versions', firstVersion.id);
          if (existingFirstVersion) throw new Error('EXAM_MIGRATION_ORPHAN_VERSION_CONFLICT');
          await transaction.create('exam_masters', examId, master);
          await transaction.create('exam_versions', firstVersion.id, firstVersion);
          return 'imported' as const;
        }

        if (existingMaster.source !== 'legacy_migration') {
          throw new Error('EXAM_MIGRATION_MASTER_CONFLICT');
        }
        if (
          typeof existingMaster.latestVersionNumber !== 'number' ||
          !Number.isSafeInteger(existingMaster.latestVersionNumber) ||
          existingMaster.latestVersionNumber < 1 ||
          existingMaster.currentPublishedVersionId !== `${examId}__v${existingMaster.latestVersionNumber}` ||
          typeof existingMaster.legacySourceFingerprint !== 'string' ||
          typeof existingMaster.legacyMasterFingerprint !== 'string'
        ) {
          throw new Error('EXAM_MIGRATION_MASTER_STATE_INVALID');
        }
        if (masterContentFingerprint(existingMaster) !== existingMaster.legacyMasterFingerprint) {
          throw new Error('EXAM_MIGRATION_MASTER_MODIFIED');
        }

        const currentVersionId = existingMaster.currentPublishedVersionId;
        const currentVersion = await transaction.get('exam_versions', currentVersionId);
        if (
          !currentVersion ||
          currentVersion.examId !== examId ||
          currentVersion.sourceFingerprint !== existingMaster.legacySourceFingerprint
        ) {
          throw new Error('EXAM_MIGRATION_CURRENT_VERSION_INVALID');
        }

        if (existingMaster.legacySourceFingerprint === sourceFingerprint) {
          if (existingMaster.legacyMasterFingerprint !== masterFingerprint) {
            throw new Error('EXAM_MIGRATION_MASTER_FINGERPRINT_MISMATCH');
          }
          return 'already' as const;
        }

        const nextVersionNumber = existingMaster.latestVersionNumber + 1;
        if (!Number.isSafeInteger(nextVersionNumber)) throw new Error('EXAM_MIGRATION_VERSION_SEQUENCE_INVALID');
        const nextVersion = createMigratedVersion(
          examId, nextVersionNumber, mapped.master, sourceFingerprint, masterFingerprint, legacy, migratedAtIso
        );
        const conflictingNextVersion = await transaction.get('exam_versions', nextVersion.id);
        if (conflictingNextVersion) throw new Error('EXAM_MIGRATION_NEXT_VERSION_CONFLICT');

        const nextMaster = {
          ...mapped.master,
          latestVersionNumber: nextVersionNumber,
          currentPublishedVersionId: nextVersion.id,
          source: 'legacy_migration',
          legacySourceFingerprint: sourceFingerprint,
          legacyMasterFingerprint: masterFingerprint,
          legacySourceUpdatedIso: legacy.updatedIso ?? null,
          legacyMigratedAtIso: migratedAtIso
        };
        await transaction.update('exam_masters', examId, nextMaster);
        await transaction.create('exam_versions', nextVersion.id, nextVersion);
        return 'updated' as const;
      });

      summary.exams[outcome === 'imported' ? 'imported' : outcome === 'updated' ? 'updated' : 'alreadyMigrated']++;
    } catch (error) {
      summary.exams.skipped++;
      summary.issues.push({
        kind: 'exam',
        sourceId: examId,
        code: error instanceof Error ? error.message : 'EXAM_MIGRATION_FAILED'
      });
    }
  }

  const seenProgressIds = new Set<string>();
  for (const record of legacyProgress) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id.trim()) {
      summary.progress.skipped++;
      summary.issues.push({ kind: 'progress', sourceId: '<unknown>', code: 'LEGACY_PROGRESS_RECORD_INVALID' });
      continue;
    }
    if (seenProgressIds.has(record.id)) {
      summary.progress.skipped++;
      summary.issues.push({ kind: 'progress', sourceId: record.id, code: 'LEGACY_PROGRESS_DUPLICATE_SOURCE_ID' });
      continue;
    }
    seenProgressIds.add(record.id);

    try {
      const document = await legacyProgressDocument(repository, record);
      if (!document) continue;
      const master = await repository.get('exam_masters', document.examId);
      if (!master) {
        summary.progress.skipped++;
        summary.issues.push({ kind: 'progress', sourceId: record.id, code: 'EXAM_MIGRATION_MASTER_MISSING' });
        continue;
      }
      const existing = await repository.get('exam_progress', document.id);
      if (existing) {
        if (sameDocument(existing, document)) {
          summary.progress.alreadyMigrated++;
        } else if (existing.source === 'legacy' && existing.legacyProgressId === record.id) {
          await repository.update('exam_progress', document.id, document);
          summary.progress.updated++;
        } else {
          summary.progress.skipped++;
          summary.issues.push({ kind: 'progress', sourceId: record.id, code: 'EXAM_MIGRATION_PROGRESS_CONFLICT' });
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
