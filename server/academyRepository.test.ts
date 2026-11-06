import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
  completionRequirements: [], publishedIso: now, publishedByUid: 'owner-1',
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
  completionRequirements: [], workingRevision: 2, updatedIso: now, updatedByUid: 'owner-1'
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
  await assert.rejects(repository.publishCourseVersion(master.id, unpublished, publishedMaster, 2, 'owner-1'), /ACADEMY_VERSION_SEQUENCE_INVALID/);
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
