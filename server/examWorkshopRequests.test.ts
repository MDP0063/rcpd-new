import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { createExamDraft } from './examWorkshop.ts';
import {
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
