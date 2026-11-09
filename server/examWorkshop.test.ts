import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createJsonExamRepository } from './examRepository.ts';
import { projectExamWorkshopMaster, restoreDelegatedMatchingIds } from './examWorkshopProjection.ts';
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

test('Prüfungswerkstatt: veraltete Arbeitsrevisionen werden abgewiesen', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam-revision-conflict', 'author-1', validDefinition);
    const first = await updateExamDraft(
      repository, 'exam-revision-conflict', 'editor-1',
      { ...validDefinition, title: 'Aktualisierte Fassung' }, undefined, 1
    );
    assert.equal(first.workingRevision, 2);
    await assert.rejects(
      updateExamDraft(
        repository, 'exam-revision-conflict', 'editor-2',
        { ...validDefinition, title: 'Veraltete Fassung' }, undefined, 1
      ),
      /EXAM_WORKING_REVISION_CONFLICT/
    );
    const stored = await repository.get('exam_masters', 'exam-revision-conflict');
    assert.equal(stored?.title, 'Aktualisierte Fassung');
    assert.equal(stored?.workingRevision, 2);
  });
});

test('Prüfungswerkstatt: delegierte Bearbeitung bewahrt serverseitige Schlüssel und Rubriken', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam-preserve-secrets', 'author-1', validDefinition);
    const delegatedDefinition = {
      ...validDefinition,
      questions: [{
        id: 'question-1', type: 'single_choice', question: 'Überarbeiteter Fragetext', pointsMilli: 1000,
        options: [{ id: 'a', text: 'Neue Beschriftung' }, { id: 'b', text: 'Kanal B' }]
      }]
    };
    const updated = await updateExamDraft(repository, 'exam-preserve-secrets', 'editor-1', delegatedDefinition, undefined, 1, true);
    assert.equal((updated.questions as any[])[0].correctOptionId, 'a');
    assert.equal((updated.questions as any[])[0].question, 'Überarbeiteter Fragetext');
  });
});

test('Prüfungswerkstatt: Delegierte ergänzen Matching-Begriff und Zieloption, Server erhält und projiziert die Zuordnung geschützt', async () => {
  await withRepository(async repository => {
    const definition = {
      ...validDefinition,
      questions: [{
        id: 'matching-question', type: 'matching', question: 'Ordne zu', pointsMilli: 1000,
        matchingPairs: [
          { id: 'pair-cat', prompt: 'Katze', targetId: 'target-feline', targetText: 'Katzenartig' },
          { id: 'pair-car', prompt: 'Auto', targetId: 'target-vehicle', targetText: 'Fahrzeug' },
          { id: 'pair-plane', prompt: 'Flugzeug', targetId: 'target-aircraft', targetText: 'Luftfahrzeug' }
        ]
      }]
    };
    const created = await createExamDraft(repository, 'exam-matching-edit', 'author-1', definition);
    const projected = projectExamWorkshopMaster(created as any, false, 'test-only-projection-secret-32-bytes') as any;
    const projectedQuestion = projected.questions[0];
    assert.deepEqual(new Set(projectedQuestion.matchingPairs.map((pair: { prompt: string }) => pair.prompt)), new Set([
      'Katze', 'Auto', 'Flugzeug'
    ]));
    assert.equal(projectedQuestion.matchingPairs.some((pair: { id: string }) => ['pair-cat', 'pair-car', 'pair-plane'].includes(pair.id)), false);
    const originalTargetIds = ['target-feline', 'target-vehicle', 'target-aircraft'];
    assert.equal(projectedQuestion.matchingTargets.length, originalTargetIds.length);
    projectedQuestion.matchingTargets.forEach((target: { id: string }, index: number) => {
      assert.notEqual(target.id, originalTargetIds[index], `target at index ${index} retained its source position`);
    });

    const updatedTargets = projectedQuestion.matchingTargets.map((target: { id: string; text: string }) => ({
      ...target,
      ...(target.text === 'Katzenartig' ? { text: 'Katzenfamilie' } : {})
    }));
    updatedTargets.push({ id: 'target-new', text: 'Schienenfahrzeug' });
    const delegatedDefinition = {
      ...definition,
      questions: [{
        id: 'matching-question', type: 'matching', question: 'Ordne zu', pointsMilli: 1000,
        matchingPairs: [
          { id: 'pair-cat', prompt: 'Katze (aktualisiert)', targetId: 'target-vehicle' },
          { id: 'pair-car', prompt: 'Auto' },
          { id: 'pair-plane', prompt: 'Flugzeug' },
          { id: 'pair-train', prompt: 'Zug', targetId: 'target-new' }
        ],
        matchingTargets: updatedTargets
      }]
    };
    const updated = await updateExamDraft(repository, 'exam-matching-edit', 'editor-1', restoreDelegatedMatchingIds(delegatedDefinition, created as any, 'test-only-projection-secret-32-bytes'), undefined, 1, true);
    const savedQuestion = (updated.questions as any[])[0];
    const pairs = savedQuestion.matchingPairs;
    assert.deepEqual(pairs, [
      { id: 'pair-cat', prompt: 'Katze (aktualisiert)', targetId: 'target-feline', targetText: 'Katzenfamilie' },
      { id: 'pair-car', prompt: 'Auto', targetId: 'target-vehicle', targetText: 'Fahrzeug' },
      { id: 'pair-plane', prompt: 'Flugzeug', targetId: 'target-aircraft', targetText: 'Luftfahrzeug' },
      { id: 'pair-train', prompt: 'Zug', targetId: 'target-new', targetText: 'Schienenfahrzeug' }
    ]);
    assert.equal('matchingTargets' in savedQuestion, false);

    const reprojected = projectExamWorkshopMaster(updated as any, false, 'test-only-projection-secret-32-bytes') as any;
    const reprojectedQuestion = reprojected.questions[0];
    assert.deepEqual(
      new Set(reprojectedQuestion.matchingPairs.map(({ prompt }: { prompt: string }) => prompt)),
      new Set(pairs.map(({ prompt }: { prompt: string }) => prompt))
    );
    const savedTargetIds = pairs.map((pair: { targetId: string }) => pair.targetId);
    reprojectedQuestion.matchingTargets.forEach((target: { id: string }, index: number) => {
      assert.notEqual(target.id, savedTargetIds[index], `reprojected target at index ${index} retained its source position`);
    });
    assert.equal(JSON.stringify(reprojectedQuestion).includes('targetId'), false);
    assert.equal(JSON.stringify(reprojectedQuestion).includes('targetText'), false);
  });
});

test('Prüfungswerkstatt: Matching-Entfernen löscht serverseitig nur das zugehörige Ziel und verhindert verwaiste Einträge', async () => {
  await withRepository(async repository => {
    const definition = {
      ...validDefinition,
      questions: [{
        id: 'matching-question', type: 'matching', question: 'Ordne zu', pointsMilli: 1000,
        matchingPairs: [
          { id: 'pair-cat', prompt: 'Katze', targetId: 'target-feline', targetText: 'Katzenartig' },
          { id: 'pair-car', prompt: 'Auto', targetId: 'target-vehicle', targetText: 'Fahrzeug' },
          { id: 'pair-plane', prompt: 'Flugzeug', targetId: 'target-aircraft', targetText: 'Luftfahrzeug' }
        ]
      }]
    };
    const created = await createExamDraft(repository, 'exam-matching-remove', 'author-1', definition);
    const projected = projectExamWorkshopMaster(created as any, false, 'test-only-projection-secret-32-bytes') as any;
    const question = projected.questions[0];
    const delegatedDefinition = {
      ...definition,
      questions: [{
        ...question,
        matchingPairs: question.matchingPairs.filter((pair: { prompt: string }) => pair.prompt !== 'Auto'),
        matchingTargets: question.matchingTargets
      }]
    };
    const updated = await updateExamDraft(repository, 'exam-matching-remove', 'editor-1', restoreDelegatedMatchingIds(delegatedDefinition, created as any, 'test-only-projection-secret-32-bytes'), undefined, 1, true);
    const savedPairs = (updated.questions as any[])[0].matchingPairs;
    assert.deepEqual(savedPairs.map((pair: { id: string }) => pair.id), ['pair-cat', 'pair-plane']);
    assert.equal(savedPairs.some((pair: { targetId: string }) => pair.targetId === 'target-vehicle'), false);
    const reprojected = projectExamWorkshopMaster(updated as any, false, 'test-only-projection-secret-32-bytes') as any;
    assert.equal(reprojected.questions[0].matchingTargets.length, 2);
    assert.equal(reprojected.questions[0].matchingTargets.some((target: { id: string }) => ['target-feline', 'target-aircraft'].includes(target.id)), false);
  });
});

test('Prüfungswerkstatt: unvollständige oder ungültige neue Matching-Zuordnungen werden nicht gespeichert', async () => {
  await withRepository(async repository => {
    const definition = {
      ...validDefinition,
      questions: [{
        id: 'matching-question', type: 'matching', question: 'Ordne zu', pointsMilli: 1000,
        matchingPairs: [
          { id: 'pair-cat', prompt: 'Katze', targetId: 'target-feline', targetText: 'Katzenartig' },
          { id: 'pair-car', prompt: 'Auto', targetId: 'target-vehicle', targetText: 'Fahrzeug' }
        ]
      }]
    };
    await createExamDraft(repository, 'exam-matching-invalid', 'author-1', definition);
    const project = projectExamWorkshopMaster(await repository.get('exam_masters', 'exam-matching-invalid') as any, false, 'test-only-projection-secret-32-bytes') as any;
    const question = project.questions[0];
    const baseQuestion = {
      ...question,
      matchingPairs: [...question.matchingPairs, { id: 'pair-new', prompt: 'Neuer Begriff' }],
      matchingTargets: [...question.matchingTargets, { id: 'target-new', text: 'Neues Ziel' }]
    };
    const incompleteDefinition = { ...definition, questions: [baseQuestion] };
    const master = await repository.get('exam_masters', 'exam-matching-invalid') as any;
    await assert.rejects(
      updateExamDraft(repository, 'exam-matching-invalid', 'editor-1', restoreDelegatedMatchingIds(incompleteDefinition, master, 'test-only-projection-secret-32-bytes'), undefined, 1, true),
      /EXAM_WORKSHOP_INPUT_INVALID:questions\[0\]\.matchingPairs\[2\]/
    );
    const storedAfterMissingLink = await repository.get('exam_masters', 'exam-matching-invalid');
    assert.equal(((storedAfterMissingLink?.questions as any[])[0]).matchingPairs.length, 2);

    const pairedQuestion = {
      ...baseQuestion,
      matchingPairs: [...question.matchingPairs, { id: 'pair-new', prompt: 'Neuer Begriff', targetId: 'target-new' }]
    };
    await assert.rejects(
      updateExamDraft(repository, 'exam-matching-invalid', 'editor-1', restoreDelegatedMatchingIds({
        ...definition,
        questions: [{ ...pairedQuestion, matchingTargets: [...question.matchingTargets, { id: 'orphan-target', text: 'Verwaist' }] }]
      }, master, 'test-only-projection-secret-32-bytes'), undefined, 1, true),
      /EXAM_WORKSHOP_INPUT_INVALID:questions\[0\]\.matchingTargets/
    );
    const storedAfterOrphan = await repository.get('exam_masters', 'exam-matching-invalid');
    assert.equal(((storedAfterOrphan?.questions as any[])[0]).matchingPairs.length, 2);

    await assert.rejects(
      createExamDraft(repository, 'exam-matching-incomplete-create', 'author-1', {
        ...definition,
        questions: [{
          id: 'matching-question', type: 'matching', question: 'Ordne zu', pointsMilli: 1000,
          matchingPairs: [{ id: 'pair-empty', prompt: ' ', targetId: 'target-empty', targetText: 'Ziel' }]
        }]
      }),
      /EXAM_WORKSHOP_INPUT_INVALID:questions\[0\]\.matchingPairs\[0\]/
    );
    assert.equal(await repository.get('exam_masters', 'exam-matching-incomplete-create'), null);
  });
});

test('Prüfungswerkstatt: die Prüfungsart eines bestehenden Entwurfs ist unveränderlich', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam-stage-immutable', 'author-1', validDefinition);
    await assert.rejects(
      updateExamDraft(repository, 'exam-stage-immutable', 'editor-1', {
        ...validDefinition,
        assessmentStage: 'final_exam'
      }),
      /EXAM_ASSESSMENT_STAGE_IMMUTABLE/
    );
    const stored = await repository.get('exam_masters', 'exam-stage-immutable');
    assert.equal(stored?.assessmentStage, 'test');
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

test('Prüfungswerkstatt: direkte Veröffentlichung weist eine veraltete Arbeitsrevision ab', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam-publish-revision', 'author-1', validDefinition);
    await assert.rejects(
      publishExamDraft(repository, 'exam-publish-revision', 'author-1', undefined, undefined, 2),
      /EXAM_WORKING_REVISION_CONFLICT/
    );
    assert.equal(await repository.get('exam_versions', 'exam-publish-revision__v1'), null);
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


test('Prüfungswerkstatt: unveränderte veröffentlichte Definition kann nicht erneut als neue Version veröffentlicht werden', async () => {
  await withRepository(async repository => {
    await createExamDraft(repository, 'exam-duplicate-publish', 'admin-1', validDefinition);
    await publishExamDraft(repository, 'exam-duplicate-publish', 'admin-1', '2026-11-05T10:05:00.000Z');
    await assert.rejects(
      publishExamDraft(repository, 'exam-duplicate-publish', 'admin-1', '2026-11-05T10:06:00.000Z'),
      /EXAM_NO_UNPUBLISHED_CHANGES/
    );
    assert.equal(await repository.get('exam_versions', 'exam-duplicate-publish__v2'), null);
  });
});
