import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { getActiveExamAttempt, startExamAttempt } from './examAttemptService.ts';
import { saveExamAttemptAnswers } from './examAutosaveService.ts';

async function withAttempt(
  run: (repository: ReturnType<typeof createJsonExamRepository>) => Promise<void>,
  options: { timeLimitMinutes?: number } = {}
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-exam-autosave-'));
  try {
    const repository = createJsonExamRepository(directory);
    await repository.create('exam_masters', 'exam-1', {
      id: 'exam-1',
      status: 'published',
      startable: true,
      minClearance: 0,
      assignedCourseCodes: ['PC-101'],
      currentPublishedVersionId: 'exam-1__v1'
    });
    await repository.create('exam_versions', 'exam-1__v1', {
      id: 'exam-1__v1',
      examId: 'exam-1',
      versionNumber: 1,
      title: 'Autosave-Test',
      assessmentStage: 'test',
      minClearance: 0,
      timeLimitMinutes: options.timeLimitMinutes ?? 30,
      passingScoreBasisPoints: 7500,
      maxAttempts: null,
      questionsSnapshot: [
        {
          id: 'q1',
          type: 'single_choice',
          question: 'Frage?',
          pointsMilli: 1000,
          options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
          correctOptionId: 'b'
        },
        {
          id: 'q2',
          type: 'free_text',
          question: 'Begründung?',
          pointsMilli: 1000,
          maxAnswerLength: 4000,
          rubric: 'Intern'
        },
        {
          id: 'q3', type: 'matching', question: 'Zuordnen', pointsMilli: 1000,
          matchingPairs: [
            { id: 'meaning-alpha', prompt: 'Alpha', targetId: 'definition-one', targetText: 'Definition eins' },
            { id: 'meaning-beta', prompt: 'Beta', targetId: 'definition-two', targetText: 'Definition zwei' }
          ]
        }
      ]
    });
    await startExamAttempt(
      repository,
      'exam-1',
      { uid: 'user-1', displayName: 'Officer One', clearanceLevel: 0 },
      'PC-101',
      Date.parse('2026-11-05T12:00:00.000Z'),
      () => 'attempt-1'
    );
    await run(repository);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const at = (minute: number) => Date.parse('2026-11-05T12:00:00.000Z') + minute * 60_000;

test('Autosave speichert validierte Antworten und erhöht die Revision', async () => {
  await withAttempt(async repository => {
    const result = await saveExamAttemptAnswers(
      repository, 'exam-1', 'attempt-1', 'user-1', 1,
      { q1: 'b', q2: 'Meine Begründung' }, at(1)
    );
    assert.ok(result.attempt);
    assert.equal(result.saved, true);
    assert.equal(result.stale, false);
    assert.equal(result.attempt.currentRevision, 1);
    assert.deepEqual(result.attempt.answers, { q1: 'b', q2: 'Meine Begründung', q3: null });
    const stored = await repository.get('exam_attempts', 'attempt-1');
    assert.equal(stored?.currentRevision, 1);
    assert.equal(stored?.lastHeartbeatAtIso, new Date(at(1)).toISOString());
  });
});

test('Matching-Aliasse verbergen Quell-IDs, bleiben bei Wiederaufnahme stabil und werden serverseitig zurückübersetzt', async () => {
  await withAttempt(async repository => {
    const active = await getActiveExamAttempt(repository, 'exam-1', 'user-1', 'PC-101', at(1));
    assert.ok(active);
    const question = active.questions.find(item => item.type === 'matching');
    assert.equal(question?.type, 'matching');
    if (question?.type !== 'matching') return;
    const pair = question.pairs.find(item => item.prompt === 'Alpha')!;
    const target = question.targets.find(item => item.text === 'Definition eins')!;
    assert.notEqual(pair.id, 'meaning-alpha');
    assert.notEqual(target.id, 'definition-one');
    assert.equal(JSON.stringify(active).includes('meaning-alpha'), false);
    assert.equal(JSON.stringify(active).includes('definition-one'), false);

    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, {
      q3: [{ pairId: pair.id, targetId: target.id }]
    }, at(2));
    const stored = await repository.get('exam_attempts', 'attempt-1');
    assert.deepEqual((stored?.answers as Record<string, unknown>).q3, [{ pairId: 'meaning-alpha', targetId: 'definition-one' }]);

    const resumed = await getActiveExamAttempt(repository, 'exam-1', 'user-1', 'PC-101', at(3));
    assert.deepEqual(resumed?.answers.q3, [{ pairId: pair.id, targetId: target.id }]);
    await assert.rejects(saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 2, {
      q3: [{ pairId: 'meaning-alpha', targetId: 'definition-one' }]
    }, at(4)), /EXAM_ANSWER_INVALID/);
  });
});

test('Veraltete Revisionen werden ignoriert und überschreiben keine neueren Antworten', async () => {
  await withAttempt(async repository => {
    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 2, { q1: 'b' }, at(1));
    const stale = await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'a' }, at(2));
    assert.ok(stale.attempt);
    assert.equal(stale.saved, false);
    assert.equal(stale.stale, true);
    assert.equal(stale.attempt.currentRevision, 2);
    assert.equal(stale.attempt.answers.q1, 'b');
    const stored = await repository.get('exam_attempts', 'attempt-1');
    assert.equal(stored?.lastHeartbeatAtIso, new Date(at(1)).toISOString());
  });
});

test('Parallele Autosaves können keinen älteren Stand über einen neueren schreiben', async () => {
  await withAttempt(async repository => {
    await Promise.all([
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'a' }, at(1)),
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 2, { q1: 'b' }, at(2))
    ]);
    const stored = await repository.get('exam_attempts', 'attempt-1');
    assert.equal(stored?.currentRevision, 2);
    assert.equal((stored?.answers as Record<string, unknown>).q1, 'b');
  });
});

test('Identische Antworten lösen trotz höherer Revision keinen unnötigen Schreibvorgang aus', async () => {
  await withAttempt(async repository => {
    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'b' }, at(1));
    const unchanged = await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 2, { q1: 'b' }, at(2));
    assert.ok(unchanged.attempt);
    assert.equal(unchanged.saved, false);
    assert.equal(unchanged.stale, false);
    assert.equal(unchanged.attempt.currentRevision, 1);
    const stored = await repository.get('exam_attempts', 'attempt-1');
    assert.equal(stored?.lastHeartbeatAtIso, new Date(at(1)).toISOString());
  });
});

test('Revision muss positiv und darf höchstens 100 Schritte voraus sein', async () => {
  await withAttempt(async repository => {
    await assert.rejects(
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 0, { q1: 'a' }, at(1)),
      /EXAM_REVISION_INVALID/
    );
    await assert.rejects(
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 101, { q1: 'a' }, at(1)),
      /EXAM_REVISION_JUMP_INVALID/
    );
    const boundary = await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 100, { q1: 'a' }, at(1));
    assert.ok(boundary.attempt);
    assert.equal(boundary.attempt.currentRevision, 100);
  });
});

test('Antworten werden gegen den veröffentlichten Snapshot validiert', async () => {
  await withAttempt(async repository => {
    await assert.rejects(
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { unknown: 'a' }, at(1)),
      /EXAM_ANSWER_QUESTION_UNKNOWN/
    );
    await assert.rejects(
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'not-an-option' }, at(1)),
      /EXAM_ANSWER_INVALID/
    );
    await assert.rejects(
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q2: 'x'.repeat(4001) }, at(1)),
      /EXAM_ANSWER_INVALID/
    );
  });
});

test('Nur der Eigentümer und die passende Prüfung dürfen den Versuch speichern', async () => {
  await withAttempt(async repository => {
    await assert.rejects(
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'other-user', 1, { q1: 'a' }, at(1)),
      /EXAM_ATTEMPT_FORBIDDEN/
    );
    await assert.rejects(
      saveExamAttemptAnswers(repository, 'another-exam', 'attempt-1', 'user-1', 1, { q1: 'a' }, at(1)),
      /EXAM_ATTEMPT_NOT_FOUND/
    );
  });
});

test('Verspäteter Autosave speichert keine Payload und finalisiert den letzten gespeicherten Stand', async () => {
  await withAttempt(async repository => {
    await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'b' }, at(29));
    const before = await repository.get('exam_attempts', 'attempt-1');
    const result = await saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 2, { q1: 'a' }, at(31));
    const after = await repository.get('exam_attempts', 'attempt-1');
    assert.equal(result.expired, true);
    assert.equal(result.finalStatus, 'failed');
    assert.equal(result.attempt, null);
    assert.equal(after?.status, 'failed');
    assert.equal(after?.submittedAtIso, new Date(at(30)).toISOString());
    assert.equal(after?.submissionReason, 'time_expired');
    assert.deepEqual(after?.answers, before?.answers);
    assert.equal(after?.currentRevision, before?.currentRevision);
    assert.equal(after?.lastHeartbeatAtIso, before?.lastHeartbeatAtIso);
    assert.equal(after?.autoFinalizedAtIso, new Date(at(31)).toISOString());
  });
});

test('Ein Request genau zum Deadline-Zeitpunkt ist noch zulässig', async () => {
  await withAttempt(async repository => {
    const result = await saveExamAttemptAnswers(
      repository, 'exam-1', 'attempt-1', 'user-1', 1, { q1: 'b' }, at(30)
    );
    assert.equal(result.saved, true);
  });
});

test('Ein Autosave-Body über 64 KB wird abgelehnt', async () => {
  await withAttempt(async repository => {
    await assert.rejects(
      saveExamAttemptAnswers(repository, 'exam-1', 'attempt-1', 'user-1', 1, Object.fromEntries(Array.from({ length: 70 }, (_, index) => [`unknown-${index}`, 'x'.repeat(1000)])), at(1)),
      /EXAM_AUTOSAVE_TOO_LARGE/
    );
  });
});
