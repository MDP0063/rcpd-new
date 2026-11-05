import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { migrateLegacyExamData } from './examMigration.ts';
import type { LegacyExamInput } from './examLegacy.ts';
import type { LegacyProgressRecord } from './examTypes.ts';

const legacyExam = (over: Partial<LegacyExamInput> = {}): LegacyExamInput => ({
  id: 'exam-legacy-1',
  title: 'Historischer Übungstest',
  moduleCode: 'SOP-01',
  assessmentStage: 'test',
  passingScore: 70,
  minClearance: 1,
  timeLimitMinutes: 20,
  examFormat: 'structured_quiz',
  questionsPayload: JSON.stringify([
    { id: 'q1', question: 'Frage?', options: ['A', 'B'], correctIndex: 1 }
  ]),
  authorUid: 'admin-1',
  updatedIso: '2026-10-01T12:00:00.000Z',
  ...over
});

const legacyProgress = (over: Partial<LegacyProgressRecord> = {}): LegacyProgressRecord => ({
  id: 'progress-legacy-1',
  userId: 'user-1',
  targetId: 'exam-legacy-1',
  targetType: 'test',
  status: 'passed',
  scorePercent: 90,
  attempts: 3,
  courseCode: 'SOP-01',
  updatedIso: '2026-10-02T12:00:00.000Z',
  ...over
});

async function withRepository(run: (repository: ReturnType<typeof createJsonExamRepository>) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'exam-migration-'));
  try {
    await run(createJsonExamRepository(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('Legacy-Migration importiert Master, unveränderliche Startversion und Fortschritt ohne erfundene Versuche', async () => {
  await withRepository(async repository => {
    const result = await migrateLegacyExamData(repository, [legacyExam()], [legacyProgress()], '2026-11-05T12:00:00.000Z');
    assert.deepEqual(result.exams, { imported: 1, alreadyMigrated: 0, skipped: 0 });
    assert.deepEqual(result.progress, { imported: 1, alreadyMigrated: 0, skipped: 0 });
    assert.equal(result.issues.length, 0);

    const master = await repository.get('exam_masters', 'exam-legacy-1');
    assert.equal(master?.status, 'published');
    assert.equal(master?.currentPublishedVersionId, 'exam-legacy-1__v1');
    const version = await repository.get('exam_versions', 'exam-legacy-1__v1');
    assert.equal(version?.source, 'legacy_migration');
    assert.equal(version?.versionNumber, 1);

    const progress = await repository.get('exam_progress', 'legacy_progress__progress-legacy-1');
    assert.equal(progress?.source, 'legacy');
    assert.equal(progress?.legacyAttemptsConsumed, 3);
    assert.equal(progress?.satisfiesPassed, false);
    assert.equal((await repository.list('exam_attempts', { where: [{ field: 'examId', value: 'exam-legacy-1' }] })).length, 0);
  });
});

test('Legacy-Migration ist bei unveränderten Quelldaten idempotent', async () => {
  await withRepository(async repository => {
    const first = await migrateLegacyExamData(repository, [legacyExam()], [legacyProgress()], '2026-11-05T12:00:00.000Z');
    const second = await migrateLegacyExamData(repository, [legacyExam()], [legacyProgress()], '2026-11-06T12:00:00.000Z');
    assert.equal(first.exams.imported, 1);
    assert.equal(first.progress.imported, 1);
    assert.equal(second.exams.alreadyMigrated, 1);
    assert.equal(second.progress.alreadyMigrated, 1);
    assert.equal((await repository.list('exam_masters')).length, 1);
    assert.equal((await repository.list('exam_versions', { where: [{ field: 'examId', value: 'exam-legacy-1' }] })).length, 1);
    assert.equal((await repository.list('exam_progress', { where: [{ field: 'examId', value: 'exam-legacy-1' }] })).length, 1);
  });
});

test('Legacy-Migration überschreibt keine widersprüchlichen vorhandenen Master-Daten', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', 'exam-legacy-1', { id: 'exam-legacy-1', title: 'Neu angelegt' });
    const result = await migrateLegacyExamData(repository, [legacyExam()], [], '2026-11-05T12:00:00.000Z');
    assert.equal(result.exams.skipped, 1);
    assert.equal(result.issues[0]?.code, 'EXAM_MIGRATION_MASTER_CONFLICT');
    assert.equal((await repository.get('exam_masters', 'exam-legacy-1'))?.title, 'Neu angelegt');
    assert.equal(await repository.get('exam_versions', 'exam-legacy-1__v1'), null);
  });
});

test('Legacy-Migration überspringt fehlerhafte Prüfungen und Fortschritt ohne vorhandenen Master nachvollziehbar', async () => {
  await withRepository(async repository => {
    const result = await migrateLegacyExamData(
      repository,
      [legacyExam({ questionsPayload: 'not-json' })],
      [legacyProgress({ targetId: 'missing-exam' })],
      '2026-11-05T12:00:00.000Z'
    );
    assert.equal(result.exams.skipped, 1);
    assert.equal(result.progress.skipped, 1);
    assert.deepEqual(result.issues.map(issue => issue.code), [
      'LEGACY_EXAM_INVALID',
      'EXAM_MIGRATION_MASTER_MISSING'
    ]);
    assert.equal((await repository.list('exam_masters')).length, 0);
    assert.equal((await repository.list('exam_progress', { where: [{ field: 'userId', value: 'user-1' }] })).length, 0);
  });
});
