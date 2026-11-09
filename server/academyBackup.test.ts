import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createJsonAcademyRepository } from './academyRepository.ts';
import type { AcademyCourseMasterDoc, AcademyCourseParticipationDoc, AcademyCourseVersionDoc, AcademyMaterialCategoryDoc, AcademyPrivateNoteDoc, AcademyProgramMasterDoc, AcademyProgramVersionDoc } from '../src/types/academy.ts';

const now = '2026-11-09T20:00:00.000Z';

function category(id: string, name: string): AcademyMaterialCategoryDoc {
  return {
    id, name, status: 'active', revision: 1,
    createdIso: now, createdByUid: 'admin-1',
    updatedIso: now, updatedByUid: 'admin-1'
  };
}

function privateNote(id: string, ownerUid: string): AcademyPrivateNoteDoc {
  return {
    id, ownerUid, materialId: 'material-1', materialVersionId: 'material-1__v1',
    kind: 'note', content: 'Privater Inhalt', tags: [],
    createdIso: now, updatedIso: now
  };
}

test('Academy backup exports shared collections but never private notes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'academy-backup-export-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    const sharedCategory = category('category-1', 'Lehrmaterial');
    await repository.createMaterialCategory(sharedCategory);
    await repository.saveOwnPrivateNote('user-1', privateNote('private-1', 'user-1'));

    await repository.setMaintenanceMode(true);
    const snapshot = await repository.exportSnapshot();

    assert.equal(snapshot.formatVersion, 1);
    assert.deepEqual(snapshot.collections.academy_material_categories, [sharedCategory]);
    assert.equal('academy_private_notes' in snapshot.collections, false);

    await repository.setMaintenanceMode(false);
    const afterBackup = category('category-after-backup', 'Nach Sicherung');
    await repository.createMaterialCategory(afterBackup);
    assert.deepEqual(await repository.listMaterialCategories(), [sharedCategory, afterBackup]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Academy backup restore replaces shared collections and preserves owner-private notes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'academy-backup-restore-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    const oldCategory = category('category-old', 'Alte Kategorie');
    const newCategory = category('category-new', 'Neue Kategorie');
    const ownerNote = privateNote('private-1', 'user-1');

    await repository.createMaterialCategory(oldCategory);
    await repository.saveOwnPrivateNote('user-1', ownerNote);

    const sourceDirectory = await mkdtemp(join(tmpdir(), 'academy-backup-source-'));
    try {
      const source = createJsonAcademyRepository(sourceDirectory);
      await source.createMaterialCategory(newCategory);
      await source.setMaintenanceMode(true);
      const snapshot = await source.exportSnapshot();

      await repository.setMaintenanceMode(true);
      await repository.restoreSnapshot(snapshot);
      await repository.setMaintenanceMode(false);

      assert.deepEqual(await repository.listMaterialCategories(), [newCategory]);
      assert.deepEqual(await repository.listOwnPrivateNotes('user-1'), [ownerNote]);
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Academy backup validation rejects snapshots that contain private notes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'academy-backup-invalid-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    await repository.setMaintenanceMode(true);
    const snapshot = await repository.exportSnapshot();
    const withPrivateNotes = {
      ...snapshot,
      collections: {
        ...snapshot.collections,
        academy_private_notes: [privateNote('private-1', 'user-1')]
      }
    };
    await assert.rejects(repository.restoreSnapshot(withPrivateNotes), /ACADEMY_BACKUP_PRIVATE_NOTES_FORBIDDEN/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test('Academy backup rejects missing immutable course-version history', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'academy-backup-course-history-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    await repository.setMaintenanceMode(true);
    const snapshot = await repository.exportSnapshot();
    const master: AcademyCourseMasterDoc = {
      id: 'course-1', code: 'SOP-01', ownerUid: 'admin-1',
      publicationStatus: 'published', availability: 'available',
      currentPublishedVersionId: 'course-1__v1', latestVersionNumber: 1,
      workingRevision: 1, createdIso: now, updatedIso: now
    };
    snapshot.collections.academy_courses.push(master);
    await assert.rejects(repository.restoreSnapshot(snapshot), /ACADEMY_BACKUP_COURSE_HISTORY_INCOMPLETE/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Academy backup rejects course versions with dangling pinned material versions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'academy-backup-course-material-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    await repository.setMaintenanceMode(true);
    const snapshot = await repository.exportSnapshot();
    const master: AcademyCourseMasterDoc = {
      id: 'course-1', code: 'SOP-01', ownerUid: 'admin-1',
      publicationStatus: 'published', availability: 'available',
      currentPublishedVersionId: 'course-1__v1', latestVersionNumber: 1,
      workingRevision: 1, createdIso: now, updatedIso: now
    };
    const version: AcademyCourseVersionDoc = {
      id: 'course-1__v1', courseId: 'course-1', versionNumber: 1,
      title: 'Grundlagen', summary: '', learningObjectives: [],
      chapters: [{
        id: 'chapter-1', title: 'Einführung', required: true, order: 0,
        materialReferences: [{
          materialId: 'missing-material', materialVersionId: 'missing-material__v1',
          required: true, order: 0
        }]
      }],
      completionRequirements: [{
        id: 'requirement-1', type: 'required_chapter', targetId: 'chapter-1', required: true
      }],
      publishedIso: now, publishedByUid: 'admin-1',
      createdIso: now, createdByUid: 'admin-1', workingRevision: 1
    };
    snapshot.collections.academy_courses.push(master);
    snapshot.collections.academy_course_versions.push(version);
    await assert.rejects(repository.restoreSnapshot(snapshot), /ACADEMY_BACKUP_COURSE_MATERIAL_VERSION_REFERENCE_INVALID/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Academy backup rejects course participations whose pinned version is missing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'academy-backup-participation-reference-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    await repository.setMaintenanceMode(true);
    const snapshot = await repository.exportSnapshot();
    const master: AcademyCourseMasterDoc = {
      id: 'course-1', code: 'SOP-01', ownerUid: 'admin-1',
      publicationStatus: 'draft', availability: 'available',
      latestVersionNumber: 0, workingRevision: 1,
      createdIso: now, updatedIso: now
    };
    const participation: AcademyCourseParticipationDoc = {
      id: 'participation_user-1_course-1', userUid: 'user-1',
      courseId: 'course-1', courseVersionId: 'course-1__v1',
      status: 'in_progress', createdIso: now, updatedIso: now
    };
    snapshot.collections.academy_courses.push(master);
    snapshot.collections.academy_course_participations.push(participation);
    await assert.rejects(repository.restoreSnapshot(snapshot), /ACADEMY_BACKUP_COURSE_PARTICIPATION_REFERENCE_INVALID/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test('Academy backup rejects program versions that reference courses without a published version', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'academy-backup-program-course-pin-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    await repository.setMaintenanceMode(true);
    const snapshot = await repository.exportSnapshot();
    const course: AcademyCourseMasterDoc = {
      id: 'course-1', code: 'SOP-01', ownerUid: 'admin-1',
      publicationStatus: 'draft', availability: 'available',
      latestVersionNumber: 0, workingRevision: 1,
      createdIso: now, updatedIso: now
    };
    const program: AcademyProgramMasterDoc = {
      id: 'program-1', code: 'BASIC-01', ownerUid: 'admin-1',
      publicationStatus: 'published', availability: 'available',
      currentPublishedVersionId: 'program-1__v1', latestVersionNumber: 1,
      workingRevision: 1, createdIso: now, updatedIso: now
    };
    const version: AcademyProgramVersionDoc = {
      id: 'program-1__v1', programId: 'program-1', versionNumber: 1,
      title: 'Grundausbildung', summary: '',
      learningObjectives: [1, 2, 3].map(n => ({ id: `goal_${n}`, description: `Lernziel ${n}` })),
      courseReferences: [{ courseId: 'course-1', requirement: 'required', order: 0 }],
      createdIso: now, createdByUid: 'admin-1', workingRevision: 1,
      publishedIso: now, publishedByUid: 'admin-1'
    };
    snapshot.collections.academy_courses.push(course);
    snapshot.collections.academy_programs.push(program);
    snapshot.collections.academy_program_versions.push(version);
    await assert.rejects(repository.restoreSnapshot(snapshot), /ACADEMY_BACKUP_PROGRAM_COURSE_REFERENCE_INVALID/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
