import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canReadMaterialRole, courseVersionReferencesMaterial } from './academyMaterialReaderAccess.ts';
import type { AcademyCourseVersionDoc } from '../src/types/academy.ts';

test('material role restrictions follow the established portal role hierarchy', () => {
  assert.equal(canReadMaterialRole('admin', 'trainee'), true);
  assert.equal(canReadMaterialRole('colonel', 'officer'), true);
  assert.equal(canReadMaterialRole('officer', 'officer'), true);
  assert.equal(canReadMaterialRole('rookie', 'officer'), false);
  assert.equal(canReadMaterialRole('trainee', 'trainee'), true);
  assert.equal(canReadMaterialRole('trainee', 'rookie'), false);
  assert.equal(canReadMaterialRole('officer'), true);
});
test('reader access requires the exact material version to be pinned in the course version', () => {
  const version = {
    id:'course-a__v1',courseId:'course-a',versionNumber:1,title:'Course',summary:'',learningObjectives:[],
    chapters:[{id:'chapter-1',title:'Chapter 1',materialReferences:[{materialId:'material-a',materialVersionId:'material-a__v2',required:true,order:0}],required:true,order:0}],
    completionRequirements:[],createdIso:'2026-01-01T00:00:00.000Z',createdByUid:'admin',workingRevision:1
  } as AcademyCourseVersionDoc;
  assert.equal(courseVersionReferencesMaterial(version,'material-a','material-a__v2'),true);
  assert.equal(courseVersionReferencesMaterial(version,'material-a','material-a__v3'),false);
  assert.equal(courseVersionReferencesMaterial(version,'material-b','material-a__v2'),false);
});
