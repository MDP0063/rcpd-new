import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createJsonAcademyRepository } from './academyRepository.ts';
import type { AcademyMaterialCategoryDoc, AcademyPrivateNoteDoc } from '../src/types/academy.ts';

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
