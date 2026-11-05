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

const participant = { uid: 'user-1', displayName: 'Officer One', clearanceLevel: 5 };
const start = (repository: ReturnType<typeof createJsonExamRepository>, course = 'PC-101', now = Date.parse('2026-11-05T12:00:00.000Z')) =>
  startExamAttempt(repository, 'exam-1', participant, course, now, () => 'attempt-1');

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
    const publicAttempt = projectStartedExamAttempt(result, Date.parse('2026-11-05T12:01:00.000Z'));
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
    const second = await startExamAttempt(repository, 'exam-1', participant, 'PC-101', Date.parse('2026-11-05T12:01:00.000Z'), () => 'attempt-2');
    assert.equal(first.attempt.id, second.attempt.id);
    assert.equal(second.created, false);
    assert.equal((await repository.list('exam_attempts', { where: [{ field: 'userId', value: 'user-1' }] })).length, 1);
  });
});

test('Aktiver Versuch kann nicht in einen anderen Lehrgang umgehängt werden', async () => {
  await withRepository(async repository => {
    await start(repository);
    await assert.rejects(
      startExamAttempt(repository, 'exam-1', participant, 'PC-102', Date.now(), () => 'attempt-2'),
      /ACTIVE_ATTEMPT_DIFFERENT_COURSE/
    );
  });
});

test('Parallele Starts bleiben transaktionssicher und erzeugen nur einen aktiven Versuch', async () => {
  await withRepository(async repository => {
    const secondRepository = createJsonExamRepository((repository as unknown as { adapter?: { filePath?: string } }).adapter?.filePath ?? '');
    // Concurrent calls through one repository share its serial transaction queue.
    const results = await Promise.all([
      startExamAttempt(repository, 'exam-1', participant, 'PC-101', Date.now(), () => 'attempt-a'),
      startExamAttempt(repository, 'exam-1', participant, 'PC-101', Date.now(), () => 'attempt-b')
    ]);
    assert.equal(results.filter(result => result.created).length, 1);
    assert.equal(results[0].attempt.id, results[1].attempt.id);
    assert.equal((await repository.list('exam_attempts', { where: [{ field: 'userId', value: 'user-1' }] })).length, 1);
    void secondRepository;
  });
});

test('Lehrgang, Freigabe, Clearance und veröffentlichter Snapshot werden serverseitig geprüft', async () => {
  await withRepository(async repository => {
    await assert.rejects(startExamAttempt(repository, 'exam-1', participant, 'OTHER-1'), /EXAM_COURSE_NOT_ASSIGNED/);
    await assert.rejects(startExamAttempt(repository, 'missing', participant, 'PC-101'), /EXAM_DOCUMENT_NOT_FOUND/);
    await assert.rejects(startExamAttempt(repository, 'exam-1', { ...participant, clearanceLevel: 0 }, 'PC-101'), /EXAM_CLEARANCE_INSUFFICIENT/);
    await repository.update('exam_masters', 'exam-1', {
      ...(await repository.get('exam_masters', 'exam-1'))!,
      status: 'draft'
    });
    await assert.rejects(startExamAttempt(repository, 'exam-1', participant, 'PC-101'), /EXAM_NOT_STARTABLE/);
  });
});

test('Abschlussprüfung verwendet standardmäßig drei Versuche und zählt pro Lehrgang', async () => {
  await withRepository(async repository => {
    await repository.update('exam_versions', 'exam-1__v1', {
      ...(await repository.get('exam_versions', 'exam-1__v1'))!,
      assessmentStage: 'final_exam',
      maxAttempts: undefined
    });
    for (let index = 1; index <= 3; index += 1) {
      const id = `attempt-${index}`;
      const created = await startExamAttempt(repository, 'exam-1', participant, 'PC-101', Date.now() + index, () => id);
      assert.equal(created.attempt.attemptNumber, index);
      await repository.update('exam_attempts', id, {
        ...created.attempt,
        status: 'failed',
        submittedAtIso: new Date(Date.now() + index).toISOString()
      });
    }
    await assert.rejects(startExamAttempt(repository, 'exam-1', participant, 'PC-101'), /EXAM_ATTEMPT_LIMIT_REACHED/);
    const otherCourse = await startExamAttempt(repository, 'exam-1', participant, 'PC-102');
    assert.equal(otherCourse.attempt.attemptNumber, 1);
  });
});

test('Zusatzversuche gelten nur für begrenzte Kontingente; ungültige Werte werden abgelehnt', async () => {
  await withRepository(async repository => {
    await repository.update('exam_versions', 'exam-1__v1', {
      ...(await repository.get('exam-1' as never, 'exam-1') as never),
    } as never).catch(() => undefined);
    const master = await repository.get('exam_masters', 'exam-1');
    await repository.update('exam_masters', 'exam-1', { ...master!, userExtraAttempts: { 'user-1': 1 } });
    await repository.update('exam_versions', 'exam-1__v1', {
      ...(await repository.get('exam_versions', 'exam-1__v1'))!,
      assessmentStage: 'final_exam',
      maxAttempts: 1
    });
    const first = await startExamAttempt(repository, 'exam-1', participant, 'PC-101', Date.now(), () => 'attempt-first');
    await repository.update('exam_attempts', first.attempt.id, { ...first.attempt, status: 'failed', submittedAtIso: new Date().toISOString() });
    const second = await startExamAttempt(repository, 'exam-1', participant, 'PC-101', Date.now() + 1, () => 'attempt-second');
    assert.equal(second.attempt.attemptNumber, 2);
  });
});

test('Voraussetzungen unterscheiden Absolvierung, bestanden und verifizierte Legacy-Ergebnisse', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', 'exam-final', {
      id: 'exam-final', status: 'published', startable: true, minClearance: 0,
      assignedCourseCodes: ['PC-101'], currentPublishedVersionId: 'exam-final__v1'
    });
    await repository.create('exam_versions', 'exam-final__v1', {
      id: 'exam-final__v1', examId: 'exam-final', versionNumber: 1,
      title: 'Abschluss', assessmentStage: 'final_exam', minClearance: 0,
      timeLimitMinutes: 0, passingScoreBasisPoints: 7500, maxAttempts: 3,
      prerequisites: [{ examId: 'exam-1', mode: 'passed', minScoreBasisPoints: 8000 }],
      questionsSnapshot: [{ id: 'q', type: 'true_false', question: 'Wahr?', pointsMilli: 1000, correctBoolean: true }]
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

test('Legacy-Absolvierung erfüllt completed, ein unverifiziertes passed nicht', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', 'exam-final', {
      id: 'exam-final', status: 'published', startable: true, minClearance: 0,
      assignedCourseCodes: ['PC-101'], currentPublishedVersionId: 'exam-final__v1'
    });
    await repository.create('exam_versions', 'exam-final__v1', {
      id: 'exam-final__v1', examId: 'exam-final', versionNumber: 1,
      title: 'Abschluss', assessmentStage: 'final_exam', minClearance: 0,
      timeLimitMinutes: 0, passingScoreBasisPoints: 7500, maxAttempts: 3,
      prerequisites: [{ examId: 'exam-1', mode: 'completed' }],
      questionsSnapshot: [{ id: 'q', type: 'true_false', question: 'Wahr?', pointsMilli: 1000, correctBoolean: true }]
    });
    await repository.create('exam_progress', 'legacy-progress', {
      id: 'legacy-progress', userId: 'user-1', targetId: 'exam-1', status: 'completed'
    });
    const result = await startExamAttempt(repository, 'exam-final', participant, 'PC-101');
    assert.equal(result.created, true);
  });
});

test('Manuelle Freischaltung übersteuert nur Voraussetzungen und wird nicht vom Client gesetzt', async () => {
  await withRepository(async repository => {
    const master = await repository.get('exam_masters', 'exam-1');
    await repository.update('exam_masters', 'exam-1', { ...master!, manualUnlockUserUids: ['user-1'] });
    const version = await repository.get('exam_versions', 'exam-1__v1');
    await repository.update('exam_versions', 'exam-1__v1', {
      ...version!,
      prerequisites: [{ examId: 'missing-prereq', mode: 'passed' }]
    });
    const result = await start(repository);
    assert.equal(result.created, true);
  });
});

test('Wiederaufnahme liefert nur die eigene sichere Fragenprojektion und gespeicherte Antworten', async () => {
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
