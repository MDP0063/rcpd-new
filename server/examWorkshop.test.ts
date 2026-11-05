import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import {
  createExamDraft,
  parseExamWorkshopDraft,
  publishExamDraft,
  updateExamDraft
} from './examWorkshop.ts';

async function withRepository(
  run: (repository: ReturnType<typeof createJsonExamRepository>) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'rcpd-exam-workshop-'));
  try {
    await run(createJsonExamRepository(directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const validDefinition = {
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
    question: 'Welcher Funkkanal ist zu verwenden?',
    pointsMilli: 1000,
    options: [{ id: 'a', text: 'Kanal A' }, { id: 'b', text: 'Kanal B' }],
    correctOptionId: 'a'
  }]
};

test('Entwurf: unvollständige Fragen dürfen gespeichert werden, Metadaten bleiben begrenzt', () => {
  const parsed = parseExamWorkshopDraft({
    ...validDefinition,
    questions: [{ id: 'question-1', question: '' }]
  });
  assert.equal(parsed.questions.length, 1);
  assert.equal(parsed.moduleCode, 'SOP-01');
});

test('Entwurf: der alte Einzel-Lehrgangscode wird in die autoritative Zuweisung übernommen', () => {
  const { moduleCode, assignedCourseCodes } = parseExamWorkshopDraft({
    ...validDefinition,
    assignedCourseCodes: undefined
  });
  assert.equal(moduleCode, 'SOP-01');
  assert.deepEqual(assignedCourseCodes, ['SOP-01']);
});

test('Entwurf: Bild-URLs müssen bereits beim Speichern HTTPS verwenden', () => {
  assert.throws(
    () => parseExamWorkshopDraft({
      ...validDefinition,
      questions: [{ id: 'q1', imageUrl: 'http://example.com/image.png' }]
    }),
    /EXAM_WORKSHOP_INPUT_INVALID:questions\[0\]\.imageUrl/
  );
});

test('Entwurf: ungültige Lehrgangscodes und zusätzliche Fragefelder werden abgelehnt', () => {
  assert.throws(
    () => parseExamWorkshopDraft({ ...validDefinition, assignedCourseCodes: ['SOP 01'] }),
    /EXAM_WORKSHOP_INPUT_INVALID:assignedCourseCodes/
  );
  assert.throws(
    () => parseExamWorkshopDraft({
      ...validDefinition,
      questions: [{ id: 'q1', unexpectedAnswerKey: 'secret' }]
    }),
    /EXAM_WORKSHOP_INPUT_INVALID:questions\[0\]/
  );
});

test('Entwurf: Standard-Versuchslimit ist unbegrenzt für Tests und drei für Abschlussprüfungen', () => {
  assert.equal(parseExamWorkshopDraft({
    ...validDefinition,
    maxAttempts: undefined
  }).maxAttempts, null);
  assert.equal(parseExamWorkshopDraft({
    ...validDefinition,
    assessmentStage: 'final_exam',
    maxAttempts: undefined
  }).maxAttempts, 3);
});

test('Prüfungswerkstatt: Admin kann einen Entwurf anlegen und bearbeiten, ohne Autor oder Versionshistorie zu überschreiben', async () => {
  await withRepository(async repository => {
    const created = await createExamDraft(repository, 'exam-1', 'admin-1', validDefinition, '2026-11-05T10:00:00.000Z');
    assert.equal(created.status, 'draft');
    assert.equal(created.authorUid, 'admin-1');
    assert.equal(created.latestVersionNumber, 0);

    const updated = await updateExamDraft(
      repository,
      'exam-1',
      'admin-2',
      { ...validDefinition, title: 'Funkdisziplin – aktualisiert' },
      '2026-11-05T10:01:00.000Z'
    );
    assert.equal(updated.title, 'Funkdisziplin – aktualisiert');
    assert.equal(updated.authorUid, 'admin-1');
    assert.equal(updated.lastModifiedByUid, 'admin-2');
    assert.equal(updated.latestVersionNumber, 0);
  });
});

test('Prüfungswerkstatt: Veröffentlichung erzeugt einen unveränderlichen Snapshot und setzt den Master-Zeiger', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam-2', 'admin-1', validDefinition, '2026-11-05T10:00:00.000Z');
    const published = await publishExamDraft(repository, 'exam-2', 'admin-1', '2026-11-05T10:05:00.000Z');

    assert.equal(published.version.id, 'exam-2__v1');
    assert.equal(published.version.versionNumber, 1);
    assert.equal(published.version.publishedByUid, 'admin-1');
    assert.equal(published.master.status, 'published');
    assert.equal(published.master.currentPublishedVersionId, 'exam-2__v1');

    const storedVersion = await repository.get('exam_versions', 'exam-2__v1');
    assert.deepEqual(storedVersion?.questionsSnapshot, validDefinition.questions);
    await assert.rejects(
      repository.update('exam_versions', 'exam-2__v1', { ...published.version }),
      /EXAM_DOCUMENT_APPEND_ONLY/
    );
  });
});

test('Prüfungswerkstatt: ungültige Prüfungen können nicht veröffentlicht werden', async () => {
  await withRepository(async repository => {
    await createExamDraft(
      repository,
      'exam-3',
      'admin-1',
      { ...validDefinition, questions: [] },
      '2026-11-05T10:00:00.000Z'
    );
    await assert.rejects(
      publishExamDraft(repository, 'exam-3', 'admin-1', '2026-11-05T10:05:00.000Z'),
      (error: unknown) => error instanceof Error &&
        error.message === 'EXAM_PUBLICATION_VALIDATION_FAILED' &&
        'validation' in error
    );
    assert.equal(await repository.get('exam_versions', 'exam-3__v1'), null);
  });
});

test('Prüfungswerkstatt: archivierte Prüfungen und Legacy-Interactive-Prüfungen können nicht veröffentlicht werden', async () => {
  await withRepository(async repository => {
    await repository.create('exam_masters', 'archived-exam', {
      id: 'archived-exam',
      status: 'archived'
    });
    await assert.rejects(
      updateExamDraft(repository, 'archived-exam', 'admin-1', validDefinition),
      /EXAM_MASTER_ARCHIVED/
    );

    await repository.create('exam_masters', 'legacy-exam', {
      id: 'legacy-exam',
      status: 'published',
      examFormat: 'interactive_code',
      isLegacyFormat: true
    });
    await assert.rejects(
      publishExamDraft(repository, 'legacy-exam', 'admin-1'),
      /EXAM_LEGACY_FORMAT_NOT_PUBLISHABLE/
    );
  });
});
