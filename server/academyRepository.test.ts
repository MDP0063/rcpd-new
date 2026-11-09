import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AcademyRepository, createJsonAcademyRepository } from './academyRepository.ts';
import type { AcademyCourseMasterDoc, AcademyCourseDraftDoc, AcademyCourseVersionDoc, AcademyProgramMasterDoc, AcademyProgramDraftDoc, AcademyPrivateNoteDoc } from '../src/types/academy.ts';

async function withRepository(run: (repository: AcademyRepository) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'academy-repository-'));
  try { await run(createJsonAcademyRepository(directory)); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
const now = '2026-11-06T12:00:00.000Z';
const master: AcademyCourseMasterDoc = {
  id: 'course-1', code: 'BASIC-01', ownerUid: 'owner-1',
  publicationStatus: 'draft', availability: 'available',
  latestVersionNumber: 0, workingRevision: 1, createdIso: now, updatedIso: now
};
const version: AcademyCourseVersionDoc = {
  id: 'course-1__v1', courseId: 'course-1', versionNumber: 1,
  title: 'Grundlagen', summary: '',
  learningObjectives: [{ id: 'goal-1', description: 'Grundlagen verstehen' }],
  chapters: [{ id: 'chapter-1', title: 'Einführung', materialReferences: [], required: true, order: 0 }],
  completionRequirements: [{ id: 'req_chapter', type: 'required_chapter', targetId: 'chapter-1', required: true }], publishedIso: now, publishedByUid: 'owner-1',
  createdIso: now, createdByUid: 'owner-1', workingRevision: 2
};
const publishedMaster: AcademyCourseMasterDoc = {
  ...master, publicationStatus: 'published', currentPublishedVersionId: 'course-1__v1',
  latestVersionNumber: 1, workingRevision: 2, updatedIso: now
};

const courseDraft: AcademyCourseDraftDoc = {
  id: 'course-1', courseId: 'course-1', title: 'Grundlagen', summary: '',
  learningObjectives: [{ id: 'goal-1', description: 'Grundlagen verstehen' }],
  chapters: [{ id: 'chapter-1', title: 'Einführung', materialReferences: [], required: true, order: 0 }],
  completionRequirements: [{ id: 'req_chapter', type: 'required_chapter', targetId: 'chapter-1', required: true }], workingRevision: 2, updatedIso: now, updatedByUid: 'owner-1'
};
const programMaster: AcademyProgramMasterDoc = {
  id: 'program-1', code: 'BASIC-PROGRAM', ownerUid: 'owner-1',
  publicationStatus: 'draft', availability: 'available',
  latestVersionNumber: 0, workingRevision: 1, createdIso: now, updatedIso: now
};
const programDraft: AcademyProgramDraftDoc = {
  id: 'program-1', programId: 'program-1', title: 'Grundausbildung', summary: '',
  learningObjectives: [1, 2, 3].map(n => ({ id: `goal-${n}`, description: `Lernziel ${n}` })),
  courseReferences: [{ courseId: 'course-1', requirement: 'required', order: 0 }],
  workingRevision: 2, updatedIso: now, updatedByUid: 'owner-1'
};


const programVersion = {
  id: 'program-1__v1', programId: 'program-1', versionNumber: 1,
  title: 'Grundausbildung', summary: '',
  learningObjectives: [1, 2, 3].map(n => ({ id: `goal-${n}`, description: `Lernziel ${n}` })),
  courseReferences: [{ courseId: 'course-1', requirement: 'required' as const, order: 0 }],
  publishedIso: now, publishedByUid: 'owner-1',
  createdIso: now, createdByUid: 'owner-1', workingRevision: 2
};
const publishedProgramMaster: AcademyProgramMasterDoc = {
  ...programMaster, publicationStatus: 'published', currentPublishedVersionId: 'program-1__v1',
  latestVersionNumber: 1, workingRevision: 2, updatedIso: now
};

test('Academy repository creates, reads and filters documents', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  assert.deepEqual(await repository.get('academy_courses', master.id), master);
  assert.deepEqual(await repository.list('academy_courses', { where: [{ field: 'ownerUid', value: 'owner-1' }] }), [master]);
  await assert.rejects(repository.create('academy_courses', master.id, master), /ACADEMY_DOCUMENT_ALREADY_EXISTS/);
}));

test('course publication atomically stores immutable version and advances master pointer', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, courseDraft, 1, 'owner-1');
  await repository.publishCourseVersion(master.id, version, publishedMaster, 2, 'owner-1');
  assert.deepEqual(await repository.get('academy_course_versions', version.id), version);
  assert.equal((await repository.get<AcademyCourseMasterDoc>('academy_courses', master.id))?.currentPublishedVersionId, version.id);
  await assert.rejects(repository.update('academy_course_versions', version.id, version), /ACADEMY_DOCUMENT_APPEND_ONLY/);
}));


test('course publication rejects a version without required completion conditions and leaves existing data untouched', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  const incompleteDraft = { ...courseDraft, completionRequirements: [] };
  await repository.saveCourseDraft(master.id, incompleteDraft, 1, 'owner-1');
  const incompleteVersion = { ...version, completionRequirements: [] };

  await assert.rejects(
    repository.publishCourseVersion(master.id, incompleteVersion, publishedMaster, 2, 'owner-1'),
    /ACADEMY_COURSE_COMPLETION_REQUIREMENT_REQUIRED/
  );
  assert.equal((await repository.get<AcademyCourseMasterDoc>('academy_courses', master.id))?.publicationStatus, 'draft');
  assert.equal(await repository.get('academy_course_versions', incompleteVersion.id), null);
  assert.deepEqual(await repository.getCourseDraft(master.id), incompleteDraft);
}));

test('concurrent publication of the same version permits exactly one writer', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, courseDraft, 1, 'owner-1');
  const results = await Promise.allSettled([
    repository.publishCourseVersion(master.id, version, publishedMaster, 2, 'owner-1'),
    repository.publishCourseVersion(master.id, version, publishedMaster, 2, 'owner-1')
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.equal((await repository.list('academy_course_versions', { where: [{ field: 'courseId', value: master.id }] })).length, 1);
}));

test('stale course revision cannot publish', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, courseDraft, 1, 'owner-1');
  await assert.rejects(repository.publishCourseVersion(master.id, version, publishedMaster, 3, 'owner-1'), /ACADEMY_WORKING_REVISION_CONFLICT/);
  assert.equal(await repository.get('academy_course_versions', version.id), null);
}));

test('repository orders and offsets collection queries consistently', async () => withRepository(async repository => {
  for (const number of [1, 3, 2]) {
    const item: AcademyCourseMasterDoc = { ...master, id: `course-${number}`, code: `BASIC-0${number}`, workingRevision: number };
    await repository.create('academy_courses', item.id, item);
  }
  const page = await repository.list<AcademyCourseMasterDoc>('academy_courses', {
    orderBy: 'workingRevision', orderDirection: 'desc', offset: 1, limit: 1
  });
  assert.deepEqual(page.map(item => item.workingRevision), [2]);
}));

test('private note repository methods enforce owner isolation', async () => withRepository(async repository => {
  const note: AcademyPrivateNoteDoc = {
    id: 'note-1', ownerUid: 'owner-1', materialId: 'material-1',
    materialVersionId: 'material-1__v1', kind: 'note', content: 'Privat',
    tags: [], createdIso: now, updatedIso: now
  };
  await assert.rejects(repository.get('academy_private_notes', note.id), /ACADEMY_NOTE_OWNER_METHOD_REQUIRED/);
  await assert.rejects(repository.list('academy_private_notes', { where: [{ field: 'ownerUid', value: 'owner-1' }] }), /ACADEMY_NOTE_OWNER_METHOD_REQUIRED/);
  await assert.rejects(repository.create('academy_private_notes', note.id, note), /ACADEMY_NOTE_OWNER_METHOD_REQUIRED/);
  await repository.saveOwnPrivateNote('owner-1', note);
  assert.deepEqual(await repository.listOwnPrivateNotes('owner-1'), [note]);
  assert.deepEqual(await repository.listOwnPrivateNotes('admin-1'), []);
  assert.equal(await repository.getOwnPrivateNote('admin-1', note.id), null);
  await assert.rejects(repository.saveOwnPrivateNote('admin-1', note), /ACADEMY_NOTE_OWNER_MISMATCH/);
  await assert.rejects(repository.deleteOwnPrivateNote('admin-1', note.id), /ACADEMY_NOTE_NOT_FOUND/);
  await repository.deleteOwnPrivateNote('owner-1', note.id);
  assert.deepEqual(await repository.listOwnPrivateNotes('owner-1'), []);
}));

test('publication rejects master identity changes and unpublished version metadata', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, courseDraft, 1, 'owner-1');
  const changedOwner = { ...publishedMaster, ownerUid: 'attacker-1' };
  await assert.rejects(repository.publishCourseVersion(master.id, version, changedOwner, 2, 'owner-1'), /ACADEMY_VERSION_SEQUENCE_INVALID/);
  const unpublished = { ...version, publishedIso: undefined, publishedByUid: undefined };
  await assert.rejects(repository.publishCourseVersion(master.id, unpublished, publishedMaster, 2, 'owner-1'), /ACADEMY_ACTOR_MISMATCH/);
  assert.equal(await repository.get('academy_course_versions', version.id), null);
}));

test('generic repository writes cannot bypass typed lifecycle operations', async () => withRepository(async repository => {
  await assert.rejects(
    repository.create('academy_course_versions', 'course-1__v1', version),
    /ACADEMY_TYPED_CREATE_REQUIRED/
  );
  await repository.create('academy_courses', master.id, master);
  await assert.rejects(repository.update('academy_courses', master.id, master), /ACADEMY_MASTER_UPDATE_METHOD_REQUIRED/);
  await assert.rejects(repository.delete('academy_courses', master.id), /ACADEMY_MASTER_ARCHIVE_METHOD_REQUIRED/);
}));

test('course draft saves persist content and reject stale concurrent revisions', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, courseDraft, 1, 'owner-1');
  assert.deepEqual(await repository.getCourseDraft(master.id), courseDraft);
  assert.equal((await repository.get<AcademyCourseMasterDoc>('academy_courses', master.id))?.workingRevision, 2);
  await assert.rejects(repository.saveCourseDraft(master.id, courseDraft, 1, 'owner-1'), /ACADEMY_WORKING_REVISION_CONFLICT/);
}));

test('program drafts are persisted with optimistic revision checks', async () => withRepository(async repository => {
  await repository.create('academy_programs', programMaster.id, programMaster);
  await repository.saveProgramDraft(programMaster.id, programDraft, 1, 'owner-1');
  assert.deepEqual(await repository.getProgramDraft(programMaster.id), programDraft);
  assert.equal((await repository.get<AcademyProgramMasterDoc>('academy_programs', programMaster.id))?.workingRevision, 2);
}));

test('draft writes reject audit metadata from a different actor', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  await assert.rejects(repository.saveCourseDraft(master.id, courseDraft, 1, 'admin-1'), /ACADEMY_ACTOR_MISMATCH/);
  assert.equal(await repository.getCourseDraft(master.id), null);
}));

test('program publication uses the saved draft and atomically advances its version pointer', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, courseDraft, 1, 'owner-1');
  await repository.publishCourseVersion(master.id, version, publishedMaster, 2, 'owner-1');
  await repository.create('academy_programs', programMaster.id, programMaster);
  await repository.saveProgramDraft(programMaster.id, programDraft, 1, 'owner-1');
  await repository.publishProgramVersion(master.id, version, publishedMaster, 2, 'owner-1');
  assert.deepEqual(await repository.get('academy_program_versions', programVersion.id), programVersion);
  assert.equal((await repository.get<AcademyProgramMasterDoc>('academy_programs', programMaster.id))?.currentPublishedVersionId, programVersion.id);
}));

test('program publication rejects dangling course references and preserves the draft', async () => withRepository(async repository => {
  const missingReference = {
    ...programDraft,
    courseReferences: [{ courseId: 'course-does-not-exist', requirement: 'required' as const, order: 0 }]
  };
  const missingVersion = {
    ...programVersion,
    courseReferences: missingReference.courseReferences
  };
  const missingMaster = {
    ...programMaster, publicationStatus: 'draft' as const
  };
  const nextMaster = {
    ...publishedProgramMaster,
    currentPublishedVersionId: missingVersion.id
  };
  await repository.create('academy_programs', programMaster.id, programMaster);
  await repository.saveProgramDraft(programMaster.id, missingReference, 1, 'owner-1');
  await assert.rejects(
    repository.publishProgramVersion(programMaster.id, missingVersion, nextMaster, 2, 'owner-1'),
    /ACADEMY_PROGRAM_COURSE_REFERENCE_MISSING/
  );
  assert.equal((await repository.get<AcademyProgramMasterDoc>('academy_programs', programMaster.id))?.publicationStatus, 'draft');
  assert.equal(await repository.get('academy_program_versions', missingVersion.id), null);
  assert.deepEqual(await repository.getProgramDraft(programMaster.id), missingReference);
}));

test('JSON adapter upgrades legacy schema v1 without losing existing collections', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'academy-migration-'));
  try {
    const legacy = {
      version: 1,
      collections: {
        academy_courses: { 'doc:legacy-course': { id: 'legacy-course' } },
        academy_course_versions: {},
        academy_programs: {},
        academy_program_versions: {},
        academy_course_participations: {},
        academy_program_participations: {},
        academy_progress_evidence: {},
        academy_completion_corrections: {},
        academy_private_notes: {}
      }
    };
    await writeFile(join(directory, 'academy-db.json'), JSON.stringify(legacy), 'utf8');
    const repository = createJsonAcademyRepository(directory);
    assert.deepEqual(await repository.get('academy_courses', 'legacy-course'), { id: 'legacy-course' });
    await repository.create('academy_courses', master.id, master);
    const upgraded = JSON.parse(await readFile(join(directory, 'academy-db.json'), 'utf8'));
    assert.equal(upgraded.version, 6);
    assert.deepEqual(upgraded.collections.academy_material_categories, {});
    assert.deepEqual(upgraded.collections.academy_material_category_assignments, {});
    assert.deepEqual(upgraded.collections.academy_material_document_types, {});
    assert.deepEqual(upgraded.collections.academy_material_document_type_assignments, {});
    assert.deepEqual(upgraded.collections.academy_materials, {});
    assert.deepEqual(upgraded.collections.academy_material_drafts, {});
    assert.deepEqual(upgraded.collections.academy_material_versions, {});
    assert.deepEqual(upgraded.collections.academy_course_drafts, {});
    assert.deepEqual(upgraded.collections.academy_program_drafts, {});
    assert.ok(upgraded.collections.academy_courses['doc:legacy-course']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('course draft can be revised repeatedly with a monotonically increasing revision', async () => withRepository(async repository => {
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, courseDraft, 1, 'owner-1');
  const revised = { ...courseDraft, summary: 'Überarbeiteter Entwurf', workingRevision: 3 };
  await repository.saveCourseDraft(master.id, revised, 2, 'owner-1');
  assert.deepEqual(await repository.getCourseDraft(master.id), revised);
  assert.equal((await repository.get<AcademyCourseMasterDoc>('academy_courses', master.id))?.workingRevision, 3);
}));


test('program enrollment pins required course versions without prematurely starting the courses', async () => withRepository(async repository => {
  const requiredCourseVersion = {
    ...version,
    completionRequirements: [{ id: 'required-chapter', type: 'required_chapter' as const, targetId: 'chapter-1', required: true }]
  };
  const requiredCourseDraft = { ...courseDraft, completionRequirements: requiredCourseVersion.completionRequirements };
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, requiredCourseDraft, 1, 'owner-1');
  await repository.publishCourseVersion(master.id, requiredCourseVersion, publishedMaster, 2, 'owner-1');
  await repository.create('academy_programs', programMaster.id, programMaster);
  await repository.saveProgramDraft(programMaster.id, programDraft, 1, 'owner-1');
  await repository.publishProgramVersion(programMaster.id, programVersion, publishedProgramMaster, 2, 'owner-1');

  const programParticipation = await repository.startProgramParticipation('learner-1', programMaster.id, now);
  assert.equal(programParticipation.programVersionId, programVersion.id);
  assert.deepEqual(programParticipation.requiredCoursePins, [{
    courseId: master.id,
    courseVersionId: requiredCourseVersion.id,
    courseParticipationId: `participation_learner-1_${master.id}`
  }]);
  const pinnedCourseParticipationId = programParticipation.requiredCoursePins[0].courseParticipationId;
  assert.equal(await repository.getCourseParticipation(pinnedCourseParticipationId), null);
  assert.deepEqual(await repository.listOwnCourseParticipations('learner-1'), []);

  const secondDraft = { ...requiredCourseDraft, title: 'Grundlagen Version 2', workingRevision: 3, updatedIso: now };
  await repository.saveCourseDraft(master.id, secondDraft, 2, 'owner-1');
  const secondVersion = {
    ...requiredCourseVersion, id: 'course-1__v2', versionNumber: 2, title: 'Grundlagen Version 2',
    createdIso: now, createdByUid: 'owner-1', publishedIso: now, publishedByUid: 'owner-1', workingRevision: 3
  };
  const secondMaster = {
    ...publishedMaster, currentPublishedVersionId: secondVersion.id, latestVersionNumber: 2,
    workingRevision: 3, updatedIso: now
  };
  await repository.publishCourseVersion(master.id, secondVersion, secondMaster, 3, 'owner-1');

  const courseParticipation = await repository.startCourseParticipation('learner-1', master.id, now);
  assert.equal(courseParticipation.id, pinnedCourseParticipationId);
  assert.equal(courseParticipation.courseVersionId, requiredCourseVersion.id);
  assert.notEqual(courseParticipation.courseVersionId, secondVersion.id);
  assert.equal(courseParticipation.status, 'in_progress');
  await assert.rejects(repository.startProgramParticipation('learner-1', programMaster.id, now), /ACADEMY_PROGRAM_PARTICIPATION_ALREADY_EXISTS/);

  const conflictingProgramMaster = {
    ...programMaster, id: 'program-2', code: 'ADVANCED-PROGRAM'
  };
  const conflictingProgramDraft = {
    ...programDraft, id: 'program-2', programId: 'program-2', updatedByUid: 'owner-1'
  };
  const conflictingProgramVersion = {
    ...programVersion, id: 'program-2__v1', programId: 'program-2',
    courseReferences: [{ courseId: master.id, requirement: 'required' as const, order: 0 }], workingRevision: 1
  };
  const conflictingProgramPublishedMaster = {
    ...conflictingProgramMaster, publicationStatus: 'published' as const,
    currentPublishedVersionId: conflictingProgramVersion.id, latestVersionNumber: 1,
    workingRevision: 1, updatedIso: now
  };
  await repository.createProgramWithDraft(conflictingProgramMaster, { ...conflictingProgramDraft, workingRevision: 1 });
  await repository.publishProgramVersion('program-2', conflictingProgramVersion, conflictingProgramPublishedMaster, 1, 'owner-1');
  await assert.rejects(repository.startProgramParticipation('learner-1', 'program-2', now), /ACADEMY_PROGRAM_COURSE_VERSION_CONFLICT/);
}));

test('course participation pins the published version and completes only after every required evidence is recorded', async () => withRepository(async repository => {
  const requirements = [
    { id: 'req-chapter', type: 'required_chapter' as const, targetId: 'chapter-1', required: true },
    { id: 'req-instructor', type: 'instructor_confirmation' as const, targetId: 'practical-1', required: true }
  ];
  const draft = { ...courseDraft, completionRequirements: requirements };
  const publishedVersion = { ...version, completionRequirements: requirements };
  await repository.create('academy_courses', master.id, master);
  await repository.saveCourseDraft(master.id, draft, 1, 'owner-1');
  await repository.publishCourseVersion(master.id, publishedVersion, publishedMaster, 2, 'owner-1');

  const participation = await repository.startCourseParticipation('learner-1', master.id, now);
  assert.equal(participation.courseVersionId, publishedVersion.id);
  assert.equal(participation.status, 'in_progress');
  await assert.rejects(repository.startCourseParticipation('learner-1', master.id, now), /ACADEMY_PARTICIPATION_ALREADY_EXISTS/);

  const selfEvidence = {
    participationId: participation.id, requirementId: 'req-chapter',
    evidenceType: 'required_chapter' as const, sourceId: 'chapter-1',
    recordedByUid: 'learner-1', recordedIso: now
  };
  const partial = await repository.recordProgressEvidence(participation.id, selfEvidence, 'learner-1', false);
  assert.equal(partial.participation.status, 'in_progress');

  const instructorEvidence = {
    participationId: participation.id, requirementId: 'req-instructor',
    evidenceType: 'instructor_confirmation' as const, sourceId: 'practical-1',
    recordedByUid: 'owner-1', recordedIso: now
  };
  await assert.rejects(
    repository.recordProgressEvidence(participation.id, { ...instructorEvidence, recordedByUid: 'learner-1' }, 'learner-1', true),
    /ACADEMY_EVIDENCE_INSTRUCTOR_REQUIRED/
  );
  const completed = await repository.recordProgressEvidence(participation.id, instructorEvidence, 'owner-1', true);
  assert.equal(completed.participation.status, 'completed');
  assert.equal((await repository.listParticipationEvidence(participation.id)).length, 2);
  await assert.rejects(repository.recordProgressEvidence(participation.id, instructorEvidence, 'owner-1', true), /ACADEMY_PARTICIPATION_NOT_ACTIVE/);

  const correction = {
    id: 'correction-1', participationId: participation.id,
    previousStatus: 'completed' as const, correctedStatus: 'in_progress' as const,
    reason: 'The completion evidence was entered against the wrong participant.',
    actorUid: 'admin-1', correctedIso: now,
    invalidatedEvidenceIds: [completed.evidence.id]
  };
  const reopened = await repository.correctCourseParticipation(participation.id, correction, 'completed');
  assert.equal(reopened.status, 'in_progress');
  assert.equal(reopened.completedIso, undefined);
  assert.deepEqual((await repository.get<{ id: string; invalidatedEvidenceIds?: string[] }>('academy_completion_corrections', correction.id))?.invalidatedEvidenceIds, [completed.evidence.id]);
  const replacementEvidence = await repository.recordProgressEvidence(participation.id, instructorEvidence, 'owner-1', true);
  assert.equal(replacementEvidence.participation.status, 'completed');
  assert.notEqual(replacementEvidence.evidence.id, completed.evidence.id);
  const staleCorrection = {
    ...correction, id: 'correction-stale', previousStatus: 'in_progress' as const,
    correctedStatus: 'completed' as const, invalidatedEvidenceIds: undefined
  };
  await assert.rejects(repository.correctCourseParticipation(participation.id, staleCorrection, 'in_progress'), /ACADEMY_COMPLETION_CORRECTION_CONFLICT/);
}));
