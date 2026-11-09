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

function assertCompositeIndex(collectionGroup: string, fieldPaths: string[]): void {
  const index = config.indexes.find(candidate =>
    candidate.collectionGroup === collectionGroup &&
    candidate.queryScope === 'COLLECTION' &&
    candidate.fields.length === fieldPaths.length &&
    fieldPaths.every(field => candidate.fields.some(item => item.fieldPath === field && item.order === 'ASCENDING'))
  );
  assert.ok(index, `Missing Firestore composite index: ${collectionGroup}(${fieldPaths.join(', ')})`);
}

test('Firestore composite indexes cover every multi-equality repository query', () => {
  assertCompositeIndex('academy_repo_material_versions', ['materialId', 'versionNumber']);
  assertCompositeIndex('exam_attempts', ['userId', 'examId']);
  assertCompositeIndex('exam_progress', ['userId', 'targetId']);
  assertCompositeIndex('exam_publication_requests', ['examId', 'status']);
});
