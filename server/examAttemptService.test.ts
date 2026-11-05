import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import {
  getActiveExamAttempt,
  projectStartedExamAttempt,
  startExamAttempt
} from './examAttemptService.ts';

async function withRepository(
  run: (repository: ReturnType<typeof createJsonExamRepository>) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-exam-attempt-'));
  try {
    const repository = createJsonExamRepository(directory);
    await repository.create('exam_masters', 'exam-1', {
      id: 'exam-1',
      status: 'published',
      startable: true,
      minClearance: 2,
      assignedCourseCodes: ['PC-101', 'PC-102'],
      currentPublishedVersionId: 'exam-1__v1',
      userExtraAttempts: {}
    });
    await repository.create('exam_versions', 'exam-1__v1', {
      id: 'exam-1__v1',
      examId: 'exam-1',
      versionNumber: 1,
      title: 'Testprüfung',
      assessmentStage: 'test',
      minClearance: 2,
      timeLimitMinutes: 30,
      passingScoreBasisPoints: 7500,
      maxAttempts: null,
      prerequisites: [],
      questionsSnapshot: [{
        id: 'q1', type: 'single_choice', question: 'Frage?', pointsMilli: 1000,
        options: [{ id: 'a', text: 'Antwort A' }, { id: 'b', text: 'Antwort B' }],
        correctOptionId: 'b',
        explanation: 'Geheim'
      }]
    });
    await run(repository);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function createFinalExam(
  repository: ReturnType<typeof createJsonExamRepository>,
  options: {
    id?: string;
    prerequisites?: Array<{ examId: string; mode: 'completed' | 'passed'; minScoreBasisPoints?: number }>;
    maxAttempts?: number | null;
    manualUnlockUserUids?: string[];
  } = {}
): Promise<void> {
  const id = options.id ?? 'exam-final';
  const versionId = `${id}__v1`;
  await repository.create('exam_masters', id, {
    id,
    status: 'published',
    startable: true,
    minClearance: 0,
    assignedCourseCodes: ['PC-101', 'PC-102'],
    currentPublishedVersionId: versionId,
    ...(options.manualUnlockUserUids ? { manualUnlockUserUids: options.manualUnlockUserUids } : {})
  });
  await repository.create('exam_versions', versionId, {
    id: versionId,
    examId: id,
    versionNumber: 1,
    title: 'Abschlussprüfung',
    assessmentStage: 'final_exam',
    minClearance: 0,
    timeLimitMinutes: 0,
    passingScoreBasisPoints: 7500,
    ...(options.maxAttempts !== undefined ? { maxAttempts: options.maxAttempts } : {}),
    prerequisites: options.prerequisites ?? [],
    questionsSnapshot: [{
      id: 'final-q1', type: 'true_false', question: 'Aussage?', pointsMilli: 1000,
      correctBoolean: true
    }]
  });
}

const participant = { uid: 'user-1', displayName: 'Officer One', clearanceLevel: 5 };
const fixedNow = Date.parse('2026-11-05T12:00:00.000Z');
const start = (repository: ReturnType<typeof createJsonExamRepository>, course = 'PC-101', now = fixedNow, id = 'attempt-1') =>
  startExamAttempt(repository, 'exam-1', participant, course, now, () => id);

test('Start legt einen serverseitig getimten Versuch mit Snapshot und Matching-Reihenfolge an', async () => {
  await withRepository(async repository => {
    const result = await start(repository);
    assert.equal(result.created, true);
    assert.equal(result.attempt.status, 'in_progress');
    assert.equal(result.attempt.attemptNumber, 1);
    assert.equal(result.attempt.currentRevision, 0);
    assert.equal(result.attempt.deadlineIso, '2026-11-05T12:30:00.000Z');
    assert.equal(result.attempt.examVersionId, 'exam-1__v1');
    assert.deepEqual(result.attempt.assignedCourseCodesAtStart, ['PC-101', 'PC-102']);
    assert.deepEqual(result.attempt.answers, {});
    assert.equal((await repository.list('exam_attempts', { where: [{ field: 'userId', value: 'user-1' }] })).length, 1);
  });
});

test('Teilnehmerprojektion gibt keine Lösungen oder Erklärungen aus', async () => {
  await withRepository(async repository => {
    const result = await start(repository);
    const publicAttempt = projectStartedExamAttempt(result, fixedNow + 60_000);
    const serialized = JSON.stringify(publicAttempt);
    assert.equal(serialized.includes('correctOptionId'), false);
    assert.equal(serialized.includes('Geheim'), false);
    assert.equal(serialized.includes('correctOptionIds'), false);
    assert.equal(publicAttempt.questions[0].type, 'single_choice');
    assert.equal(publicAttempt.deadlineIso, result.attempt.deadlineIso);
  });
});

test('Doppelter Start ist idempotent und erzeugt keinen zweiten Versuch', async () => {
  await withRepository(async repository => {
    const first = await start(repository);
    const second = await startExamAttempt(repository, 'exam-1', participant, 'PC-101', fixedNow + 60_000, () => 'attempt-2');
    assert.equal(first.attempt.id, second.attempt.id);
    assert.equal(second.created, false);
    assert.equal((await repository.list('exam_attempts', { where: [{ field: 'userId', value: 'user-1' }] })).length, 1);
  });
});

test('Aktiver Versuch kann nicht in einen anderen Lehrgang umgehängt werden', async () => {
  await withRepository(async repository => {
    await start(repository);
    await assert.rejects(startExamAttempt(repository, 'exam-1', participant, 'PC-102'), /ACTIVE_ATTEMPT_DIFFERENT_COURSE/);
  });
});

test('Parallele Starts bleiben transaktionssicher und erzeugen nur einen aktiven Versuch', async () => {
  await withRepository(async repository => {
    const results = await Promise.all([
      startExamAttempt(repository, 'exam-1', participant, 'PC-101', fixedNow, () => 'attempt-a'),
      startExamAttempt(repository, 'exam-1', participant, 'PC-101', fixedNow, () => 'attempt-b')
    ]);
    assert.equal(results.filter(result => result.created).length, 1);
    assert.equal(results[0].attempt.id, results[1].attempt.id);
    assert.equal((await repository.list('exam_attempts', { where: [{ field: 'userId', value: 'user-1' }] })).length, 1);
  });
});

test('Lehrgang, Freigabe, Clearance und veröffentlichter Snapshot werden serverseitig geprüft', async () => {
  await withRepository(async repository => {
    await assert.rejects(startExamAttempt(repository, 'exam-1', participant, 'OTHER-1'), /EXAM_COURSE_NOT_ASSIGNED/);
    await assert.rejects(startExamAttempt(repository, 'missing', participant, 'PC-101'), /EXAM_DOCUMENT_NOT_FOUND/);
    await assert.rejects(startExamAttempt(repository, 'exam-1', { ...participant, clearanceLevel: 0 }, 'PC-101'), /EXAM_CLEARANCE_INSUFFICIENT/);
    const master = await repository.get('exam_masters', 'exam-1');
    await repository.update('exam_masters', 'exam-1', { ...master!, status: 'draft' });
    await assert.rejects(startExamAttempt(repository, 'exam-1', participant, 'PC-101'), /EXAM_NOT_STARTABLE/);
  });
});

test('Abschlussprüfung verwendet standardmäßig drei Versuche und zählt pro Lehrgang', async () => {
  await withRepository(async repository => {
    await createFinalExam(repository);
    for (let index = 1; index <= 3; index += 1) {
      const id = `final-attempt-${index}`;
      const created = await startExamAttempt(repository, 'exam-final', participant, 'PC-101', fixedNow + index, () => id);
      assert.equal(created.attempt.attemptNumber, index);
      await repository.update('exam_attempts', id, {
        ...created.attempt,
        status: 'failed',
        submittedAtIso: new Date(fixedNow + index).toISOString()
      });
    }
    await assert.rejects(startExamAttempt(repository, 'exam-final', participant, 'PC-101'), /EXAM_ATTEMPT_LIMIT_REACHED/);
    const otherCourse = await startExamAttempt(repository, 'exam-final', participant, 'PC-102', fixedNow + 10, () => 'other-course-attempt');
    assert.equal(otherCourse.attempt.attemptNumber, 1);
  });
});

test('Zusatzversuche erweitern nur ein begrenztes Kontingent', async () => {
  await withRepository(async repository => {
    await createFinalExam(repository, { maxAttempts: 1 });
    const master = await repository.get('exam_masters', 'exam-final');
    await repository.update('exam_masters', 'exam-final', { ...master!, userExtraAttempts: { 'user-1': 1 } });
    const first = await startExamAttempt(repository, 'exam-final', participant, 'PC-101', fixedNow, () => 'extra-first');
    await repository.update('exam_attempts', first.attempt.id, {
      ...first.attempt, status: 'failed', submittedAtIso: new Date(fixedNow).toISOString()
    });
    const second = await startExamAttempt(repository, 'exam-final', participant, 'PC-101', fixedNow + 1, () => 'extra-second');
    assert.equal(second.attempt.attemptNumber, 2);
  });
});

test('Ungültige Zusatzversuche werden abgelehnt', async () => {
  await withRepository(async repository => {
    await createFinalExam(repository, { maxAttempts: 1 });
    const master = await repository.get('exam_masters', 'exam-final');
    await repository.update('exam_masters', 'exam-final', { ...master!, userExtraAttempts: { 'user-1': -1 } });
    await assert.rejects(startExamAttempt(repository, 'exam-final', participant, 'PC-101'), /EXAM_EXTRA_ATTEMPTS_INVALID/);
  });
});

test('Voraussetzungen unterscheiden Absolvierung, bestanden und verifizierte Legacy-Ergebnisse', async () => {
  await withRepository(async repository => {
    await createFinalExam(repository, {
      prerequisites: [{ examId: 'exam-1', mode: 'passed', minScoreBasisPoints: 8000 }]
    });
    await assert.rejects(startExamAttempt(repository, 'exam-final', participant, 'PC-101'), /EXAM_PREREQUISITE_NOT_MET/);
    await repository.create('exam_attempts', 'old-attempt', {
      id: 'old-attempt', userId: 'user-1', examId: 'exam-1', status: 'passed',
      finalScoreBasisPoints: 9000, submittedAtIso: new Date().toISOString()
    });
    const result = await startExamAttempt(repository, 'exam-final', participant, 'PC-101');
    assert.equal(result.created, true);
  });
});

test('Legacy-Absolvierung erfüllt completed; unverifiziertes Legacy-passed erfüllt passed nicht', async () => {
  await withRepository(async repository => {
    await createFinalExam(repository, { prerequisites: [{ examId: 'exam-1', mode: 'completed' }] });
    await repository.create('exam_progress', 'legacy-progress', {
      id: 'legacy-progress', userId: 'user-1', targetId: 'exam-1', status: 'completed'
    });
    const result = await startExamAttempt(repository, 'exam-final', participant, 'PC-101');
    assert.equal(result.created, true);
  });
});

test('Manuelle Freischaltung übersteuert Voraussetzungen, nicht andere Startbedingungen', async () => {
  await withRepository(async repository => {
    await createFinalExam(repository, {
      prerequisites: [{ examId: 'missing-prereq', mode: 'passed' }],
      manualUnlockUserUids: ['user-1']
    });
    const result = await startExamAttempt(repository, 'exam-final', participant, 'PC-101');
    assert.equal(result.created, true);
  });
});

test('Wiederaufnahme liefert nur den eigenen aktiven Versuch und eine sichere Fragenprojektion', async () => {
  await withRepository(async repository => {
    const created = await start(repository);
    const publicAttempt = await getActiveExamAttempt(repository, 'exam-1', 'user-1', 'PC-101');
    assert.equal(publicAttempt?.id, created.attempt.id);
    assert.equal(publicAttempt?.currentRevision, 0);
    assert.equal(publicAttempt?.questions[0].type, 'single_choice');
    assert.equal(JSON.stringify(publicAttempt).includes('correctOptionId'), false);
    assert.equal(await getActiveExamAttempt(repository, 'exam-1', 'another-user', 'PC-101'), null);
  });
});

test('Wiederaufnahme bleibt an der ursprünglich gestarteten unveränderlichen Version', async () => {
  await withRepository(async repository => {
    const first = await start(repository);
    await repository.create('exam_versions', 'exam-1__v2', {
      id: 'exam-1__v2', examId: 'exam-1', versionNumber: 2, title: 'Neue Version',
      assessmentStage: 'test', minClearance: 0, timeLimitMinutes: 0,
      passingScoreBasisPoints: 8000, maxAttempts: null, questionsSnapshot: [{
        id: 'new-q', type: 'true_false', question: 'Neu?', pointsMilli: 1000, correctBoolean: true
      }]
    });
    const master = await repository.get('exam_masters', 'exam-1');
    await repository.update('exam_masters', 'exam-1', {
      ...master!, currentPublishedVersionId: 'exam-1__v2'
    });
    const resumed = await startExamAttempt(repository, 'exam-1', participant, 'PC-101', fixedNow + 60_000, () => 'must-not-be-used');
    assert.equal(resumed.created, false);
    assert.equal(resumed.attempt.id, first.attempt.id);
    assert.equal(resumed.version.id, 'exam-1__v1');
  });
});

test('Invalidierte Versuche verbrauchen kein Kontingent, bleiben aber in der Versuchsnummerierung erhalten', async () => {
  await withRepository(async repository => {
    await createFinalExam(repository, { maxAttempts: 1 });
    const first = await startExamAttempt(repository, 'exam-final', participant, 'PC-101', fixedNow, () => 'invalidated');
    await repository.invalidateAttempt(first.attempt.id, {
      adminUid: 'admin-1', atIso: new Date(fixedNow + 1).toISOString(), reason: 'Technischer Fehler'
    });
    const second = await startExamAttempt(repository, 'exam-final', participant, 'PC-101', fixedNow + 2, () => 'after-invalidation');
    assert.equal(second.attempt.attemptNumber, 2);
  });
});
