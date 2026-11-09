import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

type FirestoreIndex = {
  collectionGroup: string;
  queryScope: string;
  fields: Array<{ fieldPath: string; order?: string; arrayConfig?: string }>;
};

const config = JSON.parse(
  await readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8')
) as { indexes: FirestoreIndex[] };

function assertCompositeIndex(
  collectionGroup: string,
  fields: Array<{ fieldPath: string; order: 'ASCENDING' | 'DESCENDING' }>
): void {
  const index = config.indexes.find(candidate =>
    candidate.collectionGroup === collectionGroup &&
    candidate.queryScope === 'COLLECTION' &&
    candidate.fields.length === fields.length &&
    fields.every(expected => candidate.fields.some(item =>
      item.fieldPath === expected.fieldPath && item.order === expected.order
    ))
  );
  assert.ok(index, `Missing Firestore composite index: ${collectionGroup}(${fields.map(field => field.fieldPath).join(', ')})`);
}

test('Firestore composite indexes cover every multi-equality repository query', () => {
  assertCompositeIndex('academy_repo_material_versions', [
    { fieldPath: 'materialId', order: 'ASCENDING' },
    { fieldPath: 'versionNumber', order: 'DESCENDING' }
  ]);
  assertCompositeIndex('exam_attempts', [
    { fieldPath: 'userId', order: 'ASCENDING' },
    { fieldPath: 'examId', order: 'ASCENDING' }
  ]);
  assertCompositeIndex('exam_progress', [
    { fieldPath: 'userId', order: 'ASCENDING' },
    { fieldPath: 'targetId', order: 'ASCENDING' }
  ]);
  assertCompositeIndex('exam_publication_requests', [
    { fieldPath: 'examId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' }
  ]);
});
