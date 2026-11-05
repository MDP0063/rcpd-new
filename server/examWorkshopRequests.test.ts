import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { createExamDraft, publishExamDraft } from './examWorkshop.ts';
import {
  addExamComment,
  archiveExamMaster,
  listExamPublicationRequests,
  listPendingExamPublicationRequests,
  refreshPendingExamPublicationRequest,
  submitExamPublicationRequest,
  updateExamPublicationRequestDecision
} from './examWorkshopRequests.ts';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const definition = {
  title: 'Funkdisziplin',
  moduleCode: 'SOP-01',
  assessmentStage: 'test',
  minClearance: 1,
  timeLimitMinutes: 20,
  passingScoreBasisPoints: 7500,
  assignedCourseCodes: ['SOP-01'],
  maxAttempts: null,
  prerequisites: [],
  questions: [{
    id: 'question-1',
    type: 'single_choice',
    question: 'Welche Antwort ist korrekt?',
    pointsMilli: 1000,
    options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    correctOptionId: 'a'
  }]
};

async function withRepository(run: (repository: ReturnType<typeof createJsonExamRepository>) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-exam-review-'));
  try { await run(createJsonExamRepository(directory)); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test('publication request is bound to an exact working revision and duplicate pending requests are rejected', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam_1', 'author_1', definition);
    const request = await submitExamPublicationRequest(repository, 'exam_1', {
      uid: 'author_1', displayName: 'Officer One'
    });
    assert.equal(request.status, 'pending');
    assert.equal(request.requestKind, 'new');
    assert.equal(request.submittedRevision, 1);
    assert.match(request.submittedHash, /^[a-f0-9]{64}$/);
    await assert.rejects(
      submitExamPublicationRequest(repository, 'exam_1', { uid: 'author_1', displayName: 'Officer One' }),
      /EXAM_PUBLICATION_REQUEST_PENDING/
    );
    assert.equal((await listPendingExamPublicationRequests(repository)).length, 1);
  });
});

test('admin edits can rebind a pending publication request to the updated revision', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam_2', 'author_1', definition);
    const request = await submitExamPublicationRequest(repository, 'exam_2', {
      uid: 'author_1', displayName: 'Officer One'
    });
    const updated = await repository.get('exam_masters', 'exam_2');
    await repository.update('exam_masters', 'exam_2', { ...updated!, title: 'Updated', workingRevision: 2 });
    const refreshed = await refreshPendingExamPublicationRequest(repository, 'exam_2');
    assert.equal(refreshed?.id, request.id);
    assert.equal(refreshed?.submittedRevision, 2);
    assert.notEqual(refreshed?.submittedHash, request.submittedHash);
  });
});

test('publication request can be returned or archived with a reviewer decision', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam_3', 'author_1', definition);
    const request = await submitExamPublicationRequest(repository, 'exam_3', {
      uid: 'author_1', displayName: 'Officer One'
    });
    const returned = await updateExamPublicationRequestDecision(
      repository, request.id, { uid: 'admin_1', displayName: 'Admin' }, 'returned', 'Bitte Frage überarbeiten.'
    );
    assert.equal(returned.status, 'returned');
    assert.equal(returned.reviewComment, 'Bitte Frage überarbeiten.');
    assert.equal((await listPendingExamPublicationRequests(repository)).length, 0);
  });
});

test('publication request can be explicitly rejected without archiving the exam master', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam_rejected', 'author_1', definition);
    const request = await submitExamPublicationRequest(repository, 'exam_rejected', {
      uid: 'author_1', displayName: 'Officer One'
    });
    const rejected = await updateExamPublicationRequestDecision(
      repository,
      request.id,
      { uid: 'admin_1', displayName: 'Admin' },
      'rejected',
      'Bitte die Prüfungslogik überarbeiten.'
    );
    assert.equal(rejected.status, 'rejected');
    assert.equal((await repository.get('exam_masters', 'exam_rejected'))?.status, 'draft');
  });
});

test('archiving a rejected publication request also archives the exam master', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam_archive', 'author_1', definition);
    const request = await submitExamPublicationRequest(repository, 'exam_archive', {
      uid: 'author_1', displayName: 'Officer One'
    });
    const archived = await updateExamPublicationRequestDecision(
      repository,
      request.id,
      { uid: 'admin_1', displayName: 'Admin' },
      'archived',
      'Inhalt wird nicht verwendet.'
    );
    const master = await repository.get('exam_masters', 'exam_archive');
    assert.equal(archived.status, 'archived');
    assert.equal(master?.status, 'archived');
    assert.equal(master?.startable, false);
  });
});

test('direct publication closes a pending request atomically', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam_direct', 'author_1', definition);
    const request = await submitExamPublicationRequest(repository, 'exam_direct', { uid: 'author_1', displayName: 'Officer' });
    await publishExamDraft(repository, 'exam_direct', 'admin_1');
    const stored = await repository.get('exam_publication_requests', request.id);
    assert.equal(stored?.status, 'published');
    assert.equal(stored?.publishedVersionId, 'exam_direct__v1');
  });
});

test('archived exams reject comments without writing a document', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam_archived_comment', 'author_1', definition);
    await repository.update('exam_masters', 'exam_archived_comment', {
      ...(await repository.get('exam_masters', 'exam_archived_comment'))!, status: 'archived'
    });
    await assert.rejects(
      addExamComment(repository, 'exam_archived_comment', { uid: 'user_1', displayName: 'Officer' }, 'Late change'),
      /EXAM_MASTER_ARCHIVED/
    );
    assert.equal((await repository.list('exam_comments', { where: [{ field: 'examId', value: 'exam_archived_comment' }] })).length, 0);
  });
});

test('admin archive closes all pending publication requests and makes the exam unavailable', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam_archive_direct', 'author_1', definition);
    const request = await submitExamPublicationRequest(repository, 'exam_archive_direct', { uid: 'author_1', displayName: 'Officer' });
    const archived = await archiveExamMaster(repository, 'exam_archive_direct', { uid: 'admin_1', displayName: 'Admin' }, 'Prüfung wird ersetzt.');
    assert.equal(archived.status, 'archived');
    assert.equal(archived.startable, false);
    assert.equal((await repository.get('exam_publication_requests', request.id))?.status, 'archived');
  });
});


test('all publication request statuses are listed newest-first with a global limit of 500', async () => {
  await withRepository(async repository => {
    const statuses = ['pending', 'published', 'returned', 'rejected', 'archived'] as const;
    const createRequest = async (id: string, status: typeof statuses[number], createdIso: string) => {
      await repository.create('exam_publication_requests', id, {
        id,
        examId: `exam_${id}`,
        requestedByUid: 'author_1',
        requestedByName: 'Officer One',
        assessmentStage: 'test',
        requestKind: 'new',
        status,
        submittedRevision: 1,
        submittedHash: 'a'.repeat(64),
        createdIso,
        updatedIso: createdIso
      });
    };

    for (let index = 0; index < 495; index += 1) {
      await createRequest(`old_${index}`, 'pending', new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString());
    }
    for (let index = 0; index < statuses.length; index += 1) {
      await createRequest(`latest_${statuses[index]}`, statuses[index], new Date(Date.UTC(2026, 1, 1, 0, index)).toISOString());
    }

    const requests = await listExamPublicationRequests(repository);
    assert.equal(requests.length, 500);
    assert.deepEqual(
      requests.slice(0, statuses.length).map(request => request.status),
      [...statuses].reverse()
    );
    assert.deepEqual(
      requests.slice(0, statuses.length).map(request => request.id),
      [...statuses].reverse().map(status => `latest_${status}`)
    );
    assert.ok(requests.every((request, index) =>
      index === 0 || requests[index - 1].createdIso >= request.createdIso
    ));
  });
});
