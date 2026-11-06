import assert from 'node:assert/strict';
import { test } from 'node:test';
import { academyFirestoreCollectionName } from './academyFirestoreAdapter.ts';

test('Academy repository Firestore collections are isolated from legacy portal state collections', () => {
  assert.equal(academyFirestoreCollectionName('academy_material_categories'), 'academy_repo_material_categories');
  assert.equal(academyFirestoreCollectionName('academy_courses'), 'academy_repo_courses');
  assert.equal(academyFirestoreCollectionName('academy_course_versions'), 'academy_repo_course_versions');
  assert.equal(academyFirestoreCollectionName('academy_private_notes'), 'academy_repo_private_notes');
  assert.notEqual(academyFirestoreCollectionName('academy_courses'), 'academy_courses');
  assert.notEqual(academyFirestoreCollectionName('academy_private_notes'), 'academy_private_notes');
});
