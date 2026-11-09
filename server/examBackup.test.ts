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
      exam_legacy_verifications: [],
      exam_comments: [],
      exam_publication_requests: []
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
    versionNumber: 1,
    title: 'Grundlagenprüfung',
    assessmentStage: 'test',
    timeLimitMinutes: 0,
    passingScoreBasisPoints: 6000,
    maxAttempts: null,
    prerequisites: [],
    historicalAssignedCourseCodes: ['SOP-01'],
    minClearance: 0,
    questionsSnapshot: [{
      id: 'question-1',
      type: 'true_false',
      question: 'Ist dies eine gültige Frage?',
      pointsMilli: 1000,
      correctBoolean: true
    }]
  });
  snapshot.collections.exam_attempts.push({
    id: 'attempt-1',
    examId: 'exam-1',
    examVersionId: 'exam-1__v1',
    versionNumber: 1,
    assessmentStage: 'test',
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
    id: 'missing-master__v1',
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

test('veröffentlichter Master ohne Versionszeiger wird abgelehnt', () => {
  const snapshot = emptySnapshot();
  snapshot.collections.exam_masters.push({
    id: 'exam-1',
    status: 'published',
    latestVersionNumber: 0
  });
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_PUBLISHED_MASTER_VERSION_MISSING/);
});

test('Master-Zeiger muss auf die neueste veröffentlichte Versionsnummer zeigen', () => {
  const snapshot = validSnapshot();
  snapshot.collections.exam_masters[0].latestVersionNumber = 2;
  snapshot.collections.exam_versions.push({
    id: 'exam-1__v2',
    examId: 'exam-1',
    versionNumber: 2
  });
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_MASTER_VERSION_SEQUENCE_MISMATCH/);
});

test('Versionshistorie darf nicht über die Master-Versionsnummer hinausgehen', () => {
  const snapshot = validSnapshot();
  snapshot.collections.exam_versions.push({
    id: 'exam-1__v2',
    examId: 'exam-1',
    versionNumber: 2
  });
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_VERSION_SEQUENCE_INVALID/);
});

test('Versuch muss dieselbe Versionsnummer wie sein referierter Snapshot speichern', () => {
  const snapshot = validSnapshot();
  snapshot.collections.exam_attempts[0].versionNumber = 2;
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_ATTEMPT_VERSION_MISMATCH/);
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


test('Prüfungsversuch muss dieselbe Prüfungsstufe wie sein unveränderlicher Snapshot speichern', () => {
  const snapshot = validSnapshot();
  snapshot.collections.exam_attempts[0].assessmentStage = 'final_exam';
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_ATTEMPT_STAGE_MISMATCH/);
});

test('Prüfungsversionen ohne gültige Prüfungsstufe werden abgelehnt', () => {
  const snapshot = validSnapshot();
  delete snapshot.collections.exam_versions[0].assessmentStage;
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_VERSION_ASSESSMENT_STAGE_INVALID/);
});


test('Backup lehnt veröffentlichte Versionen mit ungültigem Fragen-Snapshot ab', () => {
  const snapshot = validSnapshot();
  snapshot.collections.exam_versions[0].questionsSnapshot = [{
    id: 'question-1', type: 'true_false', question: 'Ungültige Frage',
    pointsMilli: 1000
  }];
  assert.throws(() => validateExamRepositorySnapshot(snapshot), /EXAM_BACKUP_VERSION_CONTENT_INVALID/);
});
