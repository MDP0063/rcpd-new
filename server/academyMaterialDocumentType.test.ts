import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { validateMaterialDocumentType } from './academyDomain.ts';
import { createJsonAcademyRepository } from './academyRepository.ts';
import { ACADEMY_COLLECTIONS } from './academyRepositoryTypes.ts';
import type { AcademyMaterialDocumentTypeDoc } from '../src/types/academy.ts';

const now = '2026-11-06T12:00:00.000Z';
function documentType(id: string, name: string, overrides: Partial<AcademyMaterialDocumentTypeDoc> = {}): AcademyMaterialDocumentTypeDoc {
  return {
    id, name, status: 'active', revision: 1,
    createdIso: now, createdByUid: 'admin-1',
    updatedIso: now, updatedByUid: 'admin-1',
    ...overrides
  };
}

test('material documentType validation requires stable identity, bounded metadata and archive audit', () => {
  assert.deepEqual(validateMaterialDocumentType(documentType('documentType-1', 'Testdokumenttyp')), { ok: true });
  assert.equal(validateMaterialDocumentType(documentType('documentType-1', '  ')).ok, false);
  assert.equal(validateMaterialDocumentType(documentType('documentType-1', 'x'.repeat(81))).ok, false);
  assert.equal(validateMaterialDocumentType(documentType('documentType-1', 'Valid', {
    status: 'archived'
  })).ok, false);
  assert.equal(validateMaterialDocumentType(documentType('documentType-1', 'Valid', {
    status: 'archived', archivedIso: now, archivedByUid: 'admin-1'
  })).ok, true);
  assert.equal(validateMaterialDocumentType(documentType('documentType-1', 'Valid', {
    description: 'x'.repeat(301)
  })).ok, false);
});

test('documentType create, rename, archive and restore are revisioned and retain stable IDs', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rcpd-academy-documentTypes-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    const first = documentType('documentType-1', 'Testdokumenttyp');
    await repository.createMaterialDocumentType(first);
    assert.deepEqual(await repository.listMaterialDocumentTypes(), [first]);

    await assert.rejects(
      repository.createMaterialDocumentType(documentType('documentType-2', 'TESTDOKUMENTTYP')),
      /ACADEMY_MATERIAL_DOCUMENT_TYPE_NAME_ALREADY_EXISTS/
    );

    const renamed = {
      ...first, name: 'Dienstvorschriften', revision: 2,
      updatedIso: '2026-11-06T12:05:00.000Z', updatedByUid: 'colonel-1'
    };
    await repository.updateMaterialDocumentType(renamed, 1, 'colonel-1');
    assert.equal((await repository.get<AcademyMaterialDocumentTypeDoc>('academy_material_document_types', first.id))?.id, first.id);
    assert.equal((await repository.listMaterialDocumentTypes())[0].name, 'Dienstvorschriften');
    await assert.rejects(repository.updateMaterialDocumentType({ ...renamed, revision: 2 }, 1, 'colonel-1'), /ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_CONFLICT/);

    const archived = await repository.setMaterialDocumentTypeArchived(first.id, true, 2, 'admin-1', '2026-11-06T12:10:00.000Z');
    assert.equal(archived.status, 'archived');
    assert.equal(archived.archivedByUid, 'admin-1');
    assert.equal(archived.id, first.id);

    const restored = await repository.setMaterialDocumentTypeArchived(first.id, false, 3, 'colonel-1', '2026-11-06T12:15:00.000Z');
    assert.equal(restored.status, 'active');
    assert.equal(restored.archivedIso, undefined);
    assert.equal(restored.archivedByUid, undefined);
    assert.equal(restored.revision, 4);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('documentType deletion is permitted only when no current material assignment references the documentType', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rcpd-academy-documentType-delete-'));
  try {
    const repository = createJsonAcademyRepository(directory);
    const first = documentType('documentType-delete', 'Temporärer Dokumenttyp');
    await repository.createMaterialDocumentType(first);

    const assignment = await repository.setMaterialDocumentTypeAssignment(
      'material-1', first.id, 'admin-1', '2026-11-06T12:01:00.000Z'
    );
    assert.equal(assignment.id, 'material-1');
    assert.equal(assignment.documentTypeId, first.id);
    assert.equal(assignment.revision, 1);

    await assert.rejects(
      repository.deleteMaterialDocumentType(first.id, 1, 'admin-1'),
      /ACADEMY_MATERIAL_DOCUMENT_TYPE_IN_USE/
    );

    const archived = await repository.setMaterialDocumentTypeArchived(
      first.id, true, 1, 'admin-1', '2026-11-06T12:02:00.000Z'
    );
    const retained = await repository.setMaterialDocumentTypeAssignment(
      'material-1', first.id, 'admin-1', '2026-11-06T12:02:30.000Z'
    );
    assert.equal(retained.revision, 1, 'an unchanged historical assignment remains valid after archive');
    await assert.rejects(
      repository.deleteMaterialDocumentType(first.id, archived.revision, 'admin-1'),
      /ACADEMY_MATERIAL_DOCUMENT_TYPE_IN_USE/
    );

    await assert.rejects(
      repository.setMaterialDocumentTypeAssignment('material-2', first.id, 'admin-1', '2026-11-06T12:03:00.000Z'),
      /ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_ACTIVE/
    );

    await repository.clearMaterialDocumentTypeAssignment('material-1');
    const deleted = await repository.deleteMaterialDocumentType(first.id, archived.revision, 'admin-1');
    assert.equal(deleted.id, first.id);
    assert.equal(await repository.get('academy_material_document_types', first.id), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('version-4 JSON Academy stores without documentType assignments remain readable', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rcpd-academy-json-migration-'));
  try {
    const collections = Object.fromEntries(
      ACADEMY_COLLECTIONS
        .filter(collection => collection !== 'academy_material_document_type_assignments' && collection !== 'academy_material_document_types')
        .map(collection => [collection, {}])
    );
    await writeFile(path.join(directory, 'academy-db.json'), JSON.stringify({ version: 4, collections }));
    const repository = createJsonAcademyRepository(directory);
    assert.deepEqual(await repository.listMaterialDocumentTypes(), []);
    await repository.createMaterialDocumentType(documentType('documentType-migrated', 'Nach der Migration'));
    const saved = JSON.parse(await readFile(path.join(directory, 'academy-db.json'), 'utf8')) as {
      version: number;
      collections: { academy_material_document_types?: Record<string, AcademyMaterialDocumentTypeDoc>; academy_material_document_type_assignments?: Record<string, unknown> };
    };
    assert.equal(saved.version, 5);
    assert.equal(Object.values(saved.collections.academy_material_document_types || {})[0]?.id, 'documentType-migrated');
    assert.deepEqual(saved.collections.academy_material_document_type_assignments, {});
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
