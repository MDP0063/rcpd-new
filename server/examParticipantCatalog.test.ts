import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { listParticipantExamCatalog } from './examParticipantCatalog.ts';

async function withRepository(run: (repository: ReturnType<typeof createJsonExamRepository>) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-exam-catalog-'));
  try {
    const repository = createJsonExamRepository(directory);
    await run(repository);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function addPublishedExam(
  repository: ReturnType<typeof createJsonExamRepository>,
  options: { id: string; title?: string; clearance?: number; status?: string; startable?: boolean; courseCodes?: string[] } 
) {
  const id = options.id;
  const versionId = `${id}__v1`;
  await repository.create('exam_masters', id, {
    id,
    status: options.status ?? 'published',
    startable: options.startable ?? true,
    assignedCourseCodes: options.courseCodes ?? ['PC-101'],
    currentPublishedVersionId: versionId
  });
  await repository.create('exam_versions', versionId, {
    id: versionId,
    examId: id,
    versionNumber: 1,
    title: options.title ?? 'Prüfung',
    assessmentStage: 'test',
    minClearance: options.clearance ?? 0,
    timeLimitMinutes: 30,
    passingScoreBasisPoints: 7500,
    maxAttempts: null,
    prerequisites: [],
    questionsSnapshot: [{
      id: 'q1',
      type: 'single_choice',
      question: 'Interne Frage?',
      pointsMilli: 1000,
      options: [{ id: 'a', text: 'Antwort A' }, { id: 'b', text: 'Antwort B' }],
      correctOptionId: 'b',
      explanation: 'Interne Erklärung'
    }]
  });
}

test('Katalog enthält nur veröffentlichte, startbare Prüfungen innerhalb der Freigabestufe', async () => {
  await withRepository(async repository => {
    await addPublishedExam(repository, { id: 'visible', title: 'Sichtbar', clearance: 2 });
    await addPublishedExam(repository, { id: 'high-clearance', clearance: 8 });
    await addPublishedExam(repository, { id: 'draft', status: 'draft' });
    await addPublishedExam(repository, { id: 'disabled', startable: false });

    const catalog = await listParticipantExamCatalog(repository, 5);
    assert.deepEqual(catalog.map(entry => entry.id), ['visible']);
  });
});

test('Teilnehmerkatalog gibt keine Fragen, Lösungsschlüssel, Erklärungen oder Rubriken zurück', async () => {
  await withRepository(async repository => {
    await addPublishedExam(repository, { id: 'visible' });
    const catalog = await listParticipantExamCatalog(repository, 5);
    const serialized = JSON.stringify(catalog);
    for (const forbidden of ['questionsSnapshot', 'correctOptionId', 'Interne Frage?', 'Interne Erklärung', 'gradingRubric', 'minClearance']) {
      assert.equal(serialized.includes(forbidden), false, `Verbotenes Feld im Katalog: ${forbidden}`);
    }
    assert.deepEqual(catalog[0], {
      id: 'visible',
      title: 'Prüfung',
      assessmentStage: 'test',
      assignedCourseCodes: ['PC-101'],
      versionNumber: 1,
      timeLimitMinutes: 30,
      passingScoreBasisPoints: 7500,
      maxAttempts: null,
      prerequisites: []
    });
  });
});

test('Ungültige veröffentlichte Zuweisungen werden fail-closed abgelehnt', async () => {
  await withRepository(async repository => {
    await addPublishedExam(repository, { id: 'invalid', courseCodes: ['not a valid code'] });
    await assert.rejects(listParticipantExamCatalog(repository, 5), /EXAM_CATALOG_ASSIGNMENT_INVALID/);
  });
});

test('Ungültige Teilnehmer-Freigabe wird abgelehnt', async () => {
  await withRepository(async repository => {
    await assert.rejects(listParticipantExamCatalog(repository, -1), /EXAM_PARTICIPANT_INVALID/);
    await assert.rejects(listParticipantExamCatalog(repository, Number.NaN), /EXAM_PARTICIPANT_INVALID/);
  });
});
