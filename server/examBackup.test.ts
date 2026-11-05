import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateExamRepositorySnapshot,
  validateLegacyVerificationSources
} from './examBackup.ts';
import { legacyVerificationId } from './examLegacy.ts';
import type { ExamRepositorySnapshot } from './examRepositoryTypes.ts';

function emptySnapshot(): ExamRepositorySnapshot {
  return {
    formatVersion: 1,
    collections: {
      exam_masters: [],
      exam_versions: [],
      exam_attempts: [],
      exam_progress: [],
      exam_legacy_verifications: []
    }
  };
}

function validSnapshot(): ExamRepositorySnapshot {
  const snapshot = emptySnapshot();
  snapshot.collections.exam_masters.push({
    id: 'exam-1',
    status: 'published',
    currentPublishedVersionId: 'exam-1__v1',
    latestVersionNumber: 1
  });
  snapshot.collections.exam_versions.push({
    id: 'exam-1__v1',
    examId: 'exam-1',
    versionNumber: 1
  });
  snapshot.collections.exam_attempts.push({
    id: 'attempt-1',
    examId: 'exam-1',
    examVersionId: 'exam-1__v1',
    userId: 'user-1',
    attemptCourseCode: 'SOP-01',
    status: 'in_progress'
  });
  snapshot.collections.exam_progress.push({
    id: 'progress-1',
    examId: 'exam-1',
    userId: 'user-1',
    attemptCourseCode: 'SOP-01'
  });
  return snapshot;
}

const legacyExam = { id: 'legacy-exam-1' };
const legacyProgress = {
  id: 'legacy-progress-1',
  userId: 'user-1',
  targetId: 'legacy-exam-1',
  targetType: 'test',
  status: 'passed',
  scorePercent: 88,
  attempts: 2,
  courseCode: 'SOP-01',
  updatedIso: '2026-11-05T08:00:00.000Z'
};
const legacyVerification = {
  id: legacyVerificationId(legacyProgress.id),
  legacyProgressId: legacyProgress.id,
  userId: legacyProgress.userId,
  examId: legacyProgress.targetId,
  attemptCourseCode: 'SOP-01',
  verifiedStatus: 'passed',
  verifiedScoreBasisPoints: 8800,
  legacyUpdatedIso: legacyProgress.updatedIso,
  verifiedByUid: 'admin-1',
  verifiedAtIso: '2026-11-05T08:30:00.000Z',
  reason: 'Historischer Nachweis geprüft'
};

test('vollständiger leerer Exam-Snapshot ist gültig', () => {
  assert.deepEqual(validateExamRepositorySnapshot(emptySnapshot()), emptySnapshot());
});

test('unvollständige oder zusätzliche Sammlungen werden abgelehnt', () => {
  const snapshot = emptySnapshot() as unknown as { formatVersion: number; collections: Record<string, unknown> };
  delete snapshot.collections.exam_progress;
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_COLLECTIONS_INCOMPLETE/);
});

test('Versionen ohne passenden Master werden abgelehnt', () => {
  const snapshot = emptySnapshot();
  snapshot.collections.exam_versions.push({
    id: 'orphan__v1',
    examId: 'missing-master',
    versionNumber: 1
  });
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_VERSION_MASTER_MISSING/);
});

test('Master mit fehlendem veröffentlichten Snapshot wird abgelehnt', () => {
  const snapshot = emptySnapshot();
  snapshot.collections.exam_masters.push({
    id: 'exam-1',
    status: 'published',
    currentPublishedVersionId: 'exam-1__v1'
  });
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_MASTER_VERSION_MISSING/);
});

test('Versuche müssen auf eine Version derselben Prüfung verweisen', () => {
  const snapshot = validSnapshot();
  snapshot.collections.exam_attempts[0].examVersionId = 'exam-2__v1';
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_ATTEMPT_VERSION_MISSING/);
});

test('Prüfungsaggregate müssen auf einen vorhandenen Master verweisen', () => {
  const snapshot = validSnapshot();
  snapshot.collections.exam_progress[0].examId = 'missing-exam';
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_PROGRESS_MASTER_MISSING/);
});

test('Legacy-Verifikation muss exakt zum mitgesicherten Legacy-Ergebnis passen', () => {
  const snapshot = emptySnapshot();
  snapshot.collections.exam_legacy_verifications.push(legacyVerification);
  validateLegacyVerificationSources(snapshot, [legacyExam], [legacyProgress]);

  const changedProgress = { ...legacyProgress, scorePercent: 87 };
  assert.throws(
    () => validateLegacyVerificationSources(snapshot, [legacyExam], [changedProgress]),
    /EXAM_BACKUP_LEGACY_SCORE_MISMATCH/
  );
});

test('Legacy-Verifikation mit fehlender Quelle wird abgelehnt', () => {
  const snapshot = emptySnapshot();
  snapshot.collections.exam_legacy_verifications.push(legacyVerification);
  assert.throws(
    () => validateLegacyVerificationSources(snapshot, [legacyExam], []),
    /EXAM_BACKUP_LEGACY_SOURCE_MISMATCH/
  );
});
