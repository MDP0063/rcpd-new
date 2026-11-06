import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { validateMaterialCategory } from './academyDomain.ts';
import { createJsonAcademyRepository } from './academyRepository.ts';
import { ACADEMY_COLLECTIONS } from './academyRepositoryTypes.ts';
import type { AcademyMaterialCategoryDoc } from '../src/types/academy.ts';

const now = '2026-11-06T12:00:00.000Z';
function category(id: string, name: string, overrides: Partial<AcademyMaterialCategoryDoc> = {}): AcademyMaterialCategoryDoc {
  return {
    id, name, status: 'active', revision: 1,
    createdIso: now, createdByUid: 'admin-1',
    updatedIso: now, updatedByUid: 'admin-1',
    ...overrides
  };
}

test('material category validation requires stable identity, bounded metadata and archive audit', () => {
  assert.deepEqual(validateMaterialCategory(category('category-1', 'SOP & Richtlinien')), { ok: true });
  assert.equal(validateMaterialCategory(category('category-1', '  ')).ok, false);
  assert.equal(validateMaterialCategory(category('category-1', 'x'.repeat(81))).ok, false);
  assert.equal(validateMaterialCategory(category('category-1', 'Valid', {
    status: 'archived'
  })).ok, false);
  assert.equal(validateMaterialCategory(category('category-1', 'Valid', {
    status: 'archived', archivedIso: now, archivedByUid: 'admin-1'
  })).ok, true);
  assert.equal(validateMaterialCategory(category('category-1', 'Valid', {
    description: 'x'.repeat(301)
  })).ok, false);
});

test('category create, rename, archive and restore are revisioned and retain stable IDs', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rcpd-academy-categories-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    const first = category('category-1', 'SOP & Richtlinien');
    await repository.createMaterialCategory(first);
    assert.deepEqual(await repository.listMaterialCategories(), [first]);

    await assert.rejects(
      repository.createMaterialCategory(category('category-2', 'sop & RICHTLINIEN')),
      /ACADEMY_MATERIAL_CATEGORY_NAME_ALREADY_EXISTS/
    );

    const renamed = {
      ...first, name: 'Dienstvorschriften', revision: 2,
      updatedIso: '2026-11-06T12:05:00.000Z', updatedByUid: 'colonel-1'
    };
    await repository.updateMaterialCategory(renamed, 1, 'colonel-1');
    assert.equal((await repository.get<AcademyMaterialCategoryDoc>('academy_material_categories', first.id))?.id, first.id);
    assert.equal((await repository.listMaterialCategories())[0].name, 'Dienstvorschriften');
    await assert.rejects(repository.updateMaterialCategory({ ...renamed, revision: 2 }, 1, 'colonel-1'), /ACADEMY_MATERIAL_CATEGORY_REVISION_CONFLICT/);

    const archived = await repository.setMaterialCategoryArchived(first.id, true, 2, 'admin-1', '2026-11-06T12:10:00.000Z');
    assert.equal(archived.status, 'archived');
    assert.equal(archived.archivedByUid, 'admin-1');
    assert.equal(archived.id, first.id);

    const restored = await repository.setMaterialCategoryArchived(first.id, false, 3, 'colonel-1', '2026-11-06T12:15:00.000Z');
    assert.equal(restored.status, 'active');
    assert.equal(restored.archivedIso, undefined);
    assert.equal(restored.archivedByUid, undefined);
    assert.equal(restored.revision, 4);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('version-2 JSON Academy stores without the new category collection remain readable', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rcpd-academy-json-migration-'));
  try {
    const collections = Object.fromEntries(
      ACADEMY_COLLECTIONS
        .filter(collection => collection !== 'academy_material_categories')
        .map(collection => [collection, {}])
    );
    await writeFile(path.join(directory, 'academy-db.json'), JSON.stringify({ version: 2, collections }));
    const repository = createJsonAcademyRepository(directory);
    assert.deepEqual(await repository.listMaterialCategories(), []);
    await repository.createMaterialCategory(category('category-migrated', 'Nach der Migration'));
    const saved = JSON.parse(await readFile(path.join(directory, 'academy-db.json'), 'utf8')) as {
      version: number;
      collections: { academy_material_categories?: Record<string, AcademyMaterialCategoryDoc> };
    };
    assert.equal(saved.version, 3);
    assert.equal(Object.values(saved.collections.academy_material_categories || {})[0]?.id, 'category-migrated');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
