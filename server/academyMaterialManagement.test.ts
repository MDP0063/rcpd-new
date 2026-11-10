import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  validateMaterialDraft,
  validateMaterialMaster,
  validateMaterialVersion
} from './academyDomain.ts';
import { AcademyRepository, createJsonAcademyRepository } from './academyRepository.ts';
import type {
  AcademyCourseDraftDoc,
  AcademyCourseMasterDoc,
  AcademyCourseVersionDoc,
  AcademyMaterialCategoryDoc,
  AcademyMaterialCategoryAssignmentDoc,
  AcademyMaterialDocumentTypeDoc,
  AcademyMaterialDocumentTypeAssignmentDoc,
  AcademyMaterialDraftDoc,
  AcademyMaterialMasterDoc,
  AcademyMaterialVersionDoc,
  AcademyProgramMasterDoc,
  AcademyProgramDraftDoc,
  AcademyProgramVersionDoc
} from '../src/types/academy.ts';

const now = '2026-11-06T12:00:00.000Z';
const later = '2026-11-06T12:05:00.000Z';

async function withRepository(run: (repository: AcademyRepository) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'rcpd-academy-materials-'));
  try { await run(createJsonAcademyRepository(directory)); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

const category: AcademyMaterialCategoryDoc = {
  id: 'category-operations', name: 'Operations', status: 'active', revision: 1,
  createdIso: now, createdByUid: 'admin-1', updatedIso: now, updatedByUid: 'admin-1'
};
const documentType: AcademyMaterialDocumentTypeDoc = {
  id: 'type-handbook', name: 'Handbuch', status: 'active', revision: 1,
  createdIso: now, createdByUid: 'admin-1', updatedIso: now, updatedByUid: 'admin-1'
};
const master: AcademyMaterialMasterDoc = {
  id: 'material-1', code: 'MAT-2026-ABCDEF012345', ownerUid: 'admin-1',
  publicationStatus: 'draft', latestVersionNumber: 0, workingRevision: 1,
  createdIso: now, updatedIso: now
};
const draft: AcademyMaterialDraftDoc = {
  id: master.id, materialId: master.id, title: 'Operations Handbook',
  categoryId: category.id, documentTypeId: documentType.id,
  contentFormat: 'markdown', content: '# Operations\n\nInitial handbook text.',
  workingRevision: 1, createdIso: now, createdByUid: 'admin-1',
  updatedIso: now, updatedByUid: 'admin-1'
};

function version(number: number, sourceDraft: AcademyMaterialDraftDoc, workingRevision: number, publishedByUid = 'admin-1'): AcademyMaterialVersionDoc {
  return {
    id: master.id + '__v' + number, materialId: master.id, versionNumber: number,
    title: sourceDraft.title, ...(sourceDraft.description === undefined ? {} : { description: sourceDraft.description }),
    categoryId: sourceDraft.categoryId, documentTypeId: sourceDraft.documentTypeId,
    ...(sourceDraft.requiredRole === undefined ? {} : { requiredRole: sourceDraft.requiredRole }),
    contentFormat: sourceDraft.contentFormat, content: sourceDraft.content,
    ...(sourceDraft.codeLanguage === undefined ? {} : { codeLanguage: sourceDraft.codeLanguage }),
    publishedIso: later, publishedByUid,
    createdIso: later, createdByUid: publishedByUid, workingRevision
  };
}

async function setupMaterialRepository(repository: AcademyRepository) {
  await repository.createMaterialCategory(category);
  await repository.createMaterialDocumentType(documentType);
}

test('material domain validation accepts Markdown and code but rejects unsafe or incomplete values', () => {
  assert.deepEqual(validateMaterialMaster(master), { ok: true });
  assert.deepEqual(validateMaterialDraft(master.id, draft), { ok: true });
  const codeDraft: AcademyMaterialDraftDoc = {
    ...draft, contentFormat: 'code', content: 'console.log("stored only");', codeLanguage: 'typescript'
  };
  assert.deepEqual(validateMaterialDraft(master.id, codeDraft), { ok: true });
  assert.equal(validateMaterialDraft(master.id, { ...draft, categoryId: '' }).ok, false);
  assert.equal(validateMaterialDraft(master.id, { ...draft, documentTypeId: '' }).ok, false);
  assert.equal(validateMaterialDraft(master.id, { ...draft, contentFormat: 'pdf' as never }).ok, false);
  assert.equal(validateMaterialDraft(master.id, { ...draft, content: ' ' }).ok, false);
  assert.equal(validateMaterialDraft(master.id, { ...draft, content: 'x'.repeat(200_001) }).ok, false);
  assert.equal(validateMaterialDraft(master.id, { ...draft, codeLanguage: 'not valid language!' }).ok, false);
  assert.deepEqual(validateMaterialVersion(master.id, version(1, draft, 1)), { ok: true });
});

test('material creation stores master, first draft and metadata references atomically', async () => withRepository(async repository => {
  await setupMaterialRepository(repository);
  await repository.createMaterialWithDraft(master, draft);

  assert.deepEqual(await repository.get<AcademyMaterialMasterDoc>('academy_materials', master.id), master);
  assert.deepEqual(await repository.getMaterialDraft(master.id), draft);
  assert.equal((await repository.get<AcademyMaterialCategoryAssignmentDoc>('academy_material_category_assignments', master.id))!.categoryId, category.id);
  assert.equal((await repository.get<AcademyMaterialDocumentTypeAssignmentDoc>('academy_material_document_type_assignments', master.id))!.documentTypeId, documentType.id);

  const duplicateCodeMaster = { ...master, id: 'material-2' };
  const duplicateCodeDraft = { ...draft, id: 'material-2', materialId: 'material-2' };
  await assert.rejects(
    repository.createMaterialWithDraft(duplicateCodeMaster, duplicateCodeDraft),
    /ACADEMY_MATERIAL_CODE_ALREADY_EXISTS/
  );
  assert.equal(await repository.get('academy_materials', 'material-2'), null);
}));

test('publishing creates immutable snapshots and a changed draft requires a new explicit version', async () => withRepository(async repository => {
  await setupMaterialRepository(repository);
  await repository.createMaterialWithDraft(master, draft);

  const firstVersion = version(1, draft, 1);
  const firstPublishedMaster: AcademyMaterialMasterDoc = {
    ...master, publicationStatus: 'published',
    currentPublishedVersionId: firstVersion.id, latestVersionNumber: 1,
    lastPublishedWorkingRevision: 1, updatedIso: later
  };
  await repository.publishMaterialVersion(master.id, firstVersion, firstPublishedMaster, 1, 'admin-1');

  assert.deepEqual(await repository.get<AcademyMaterialVersionDoc>('academy_material_versions', firstVersion.id), firstVersion);
  await assert.rejects(
    repository.update('academy_material_versions', firstVersion.id, firstVersion),
    /ACADEMY_DOCUMENT_APPEND_ONLY/
  );
  await assert.rejects(
    repository.publishMaterialVersion(master.id, firstVersion, firstPublishedMaster, 1, 'admin-1'),
    /ACADEMY_WORKING_REVISION_CONFLICT/
  );

  const savedDraft: AcademyMaterialDraftDoc = {
    ...draft, title: 'Operations Handbook – revised', content: '# Operations\n\nRevised handbook text.',
    workingRevision: 2, updatedIso: '2026-11-06T12:06:00.000Z', updatedByUid: 'admin-1'
  };
  await repository.saveMaterialDraft(master.id, savedDraft, 1, 'admin-1');
  const currentMaster = await repository.get<AcademyMaterialMasterDoc>('academy_materials', master.id);
  assert.equal(currentMaster?.workingRevision, 2);
  assert.equal(currentMaster?.currentPublishedVersionId, firstVersion.id, 'saving a draft never switches the published pointer');

  const secondVersion = version(2, savedDraft, 2);
  const secondPublishedMaster: AcademyMaterialMasterDoc = {
    ...currentMaster!, publicationStatus: 'published',
    currentPublishedVersionId: secondVersion.id, latestVersionNumber: 2,
    lastPublishedWorkingRevision: 2, updatedIso: '2026-11-06T12:07:00.000Z'
  };
  await repository.publishMaterialVersion(master.id, secondVersion, secondPublishedMaster, 2, 'admin-1');

  assert.equal((await repository.get<AcademyMaterialVersionDoc>('academy_material_versions', firstVersion.id))?.content, draft.content);
  assert.equal((await repository.get<AcademyMaterialVersionDoc>('academy_material_versions', secondVersion.id))?.content, savedDraft.content);
  assert.equal((await repository.get<AcademyMaterialMasterDoc>('academy_materials', master.id))?.currentPublishedVersionId, secondVersion.id);
  assert.equal((await repository.get<AcademyMaterialCategoryAssignmentDoc>('academy_material_category_assignments', secondVersion.id))!.materialVersionId, secondVersion.id);
  assert.equal((await repository.get<AcademyMaterialDocumentTypeAssignmentDoc>('academy_material_document_type_assignments', secondVersion.id))!.materialVersionId, secondVersion.id);
}));

test('historical material versions keep old taxonomy entries protected after the working draft changes category', async () => withRepository(async repository => {
  await setupMaterialRepository(repository);
  const nextCategory: AcademyMaterialCategoryDoc = {
    id: 'category-training', name: 'Training', status: 'active', revision: 1,
    createdIso: later, createdByUid: 'admin-1', updatedIso: later, updatedByUid: 'admin-1'
  };
  const nextDocumentType: AcademyMaterialDocumentTypeDoc = {
    id: 'type-checklist', name: 'Checkliste', status: 'active', revision: 1,
    createdIso: later, createdByUid: 'admin-1', updatedIso: later, updatedByUid: 'admin-1'
  };
  await repository.createMaterialCategory(nextCategory);
  await repository.createMaterialDocumentType(nextDocumentType);
  await repository.createMaterialWithDraft(master, draft);

  const firstVersion = version(1, draft, 1);
  const publishedMaster: AcademyMaterialMasterDoc = {
    ...master, publicationStatus: 'published', currentPublishedVersionId: firstVersion.id,
    latestVersionNumber: 1, lastPublishedWorkingRevision: 1, updatedIso: later
  };
  await repository.publishMaterialVersion(master.id, firstVersion, publishedMaster, 1, 'admin-1');

  const changedDraft: AcademyMaterialDraftDoc = {
    ...draft, categoryId: nextCategory.id, documentTypeId: nextDocumentType.id,
    workingRevision: 2, updatedIso: '2026-11-06T12:06:00.000Z', updatedByUid: 'admin-1'
  };
  await repository.saveMaterialDraft(master.id, changedDraft, 1, 'admin-1');
  assert.equal((await repository.get<AcademyMaterialCategoryAssignmentDoc>('academy_material_category_assignments', master.id))?.categoryId, nextCategory.id);
  assert.equal((await repository.get<AcademyMaterialDocumentTypeAssignmentDoc>('academy_material_document_type_assignments', master.id))?.documentTypeId, nextDocumentType.id);

  await assert.rejects(repository.deleteMaterialCategory(category.id, 1, 'admin-1'), /ACADEMY_MATERIAL_CATEGORY_IN_USE/);
  await assert.rejects(repository.deleteMaterialDocumentType(documentType.id, 1, 'admin-1'), /ACADEMY_MATERIAL_DOCUMENT_TYPE_IN_USE/);
  assert.equal((await repository.get<AcademyMaterialCategoryAssignmentDoc>('academy_material_category_assignments', firstVersion.id))?.categoryId, category.id);
  assert.equal((await repository.get<AcademyMaterialDocumentTypeAssignmentDoc>('academy_material_document_type_assignments', firstVersion.id))?.documentTypeId, documentType.id);
}));

test('course publication requires an exact existing published material version', async () => withRepository(async repository => {
  await setupMaterialRepository(repository);
  await repository.createMaterialWithDraft(master, draft);

  const courseMaster: AcademyCourseMasterDoc = {
    id: 'course-1', code: 'OPS-01', ownerUid: 'admin-1',
    publicationStatus: 'draft', availability: 'available',
    latestVersionNumber: 0, workingRevision: 1, createdIso: now, updatedIso: now
  };
  const courseDraft: AcademyCourseDraftDoc = {
    id: courseMaster.id, courseId: courseMaster.id, title: 'Operations course', summary: '',
    learningObjectives: [{ id: 'goal-1', description: 'Understand the operations handbook.' }],
    chapters: [{
      id: 'chapter-1', title: 'Operations handbook',
      materialReferences: [{ materialId: master.id, materialVersionId: master.id + '__v1', required: true, order: 0 }],
      required: true, order: 0
    }],
    completionRequirements: [{ id: 'req_chapter', type: 'required_chapter', targetId: 'chapter-1', required: true }], workingRevision: 2, updatedIso: later, updatedByUid: 'admin-1'
  };
  await repository.create('academy_courses', courseMaster.id, courseMaster);
  await repository.saveCourseDraft(courseMaster.id, courseDraft, 1, 'admin-1');

  const courseVersion: AcademyCourseVersionDoc = {
    id: courseMaster.id + '__v1', courseId: courseMaster.id, versionNumber: 1,
    title: courseDraft.title, summary: courseDraft.summary,
    learningObjectives: courseDraft.learningObjectives, chapters: courseDraft.chapters,
    completionRequirements: courseDraft.completionRequirements,
    publishedIso: later, publishedByUid: 'admin-1', createdIso: later, createdByUid: 'admin-1',
    workingRevision: 2
  };
  const publishedCourse: AcademyCourseMasterDoc = {
    ...courseMaster, publicationStatus: 'published',
    currentPublishedVersionId: courseVersion.id, latestVersionNumber: 1,
    workingRevision: 2, updatedIso: later
  };

  await assert.rejects(
    repository.publishCourseVersion(courseMaster.id, courseVersion, publishedCourse, 2, 'admin-1'),
    /ACADEMY_COURSE_MATERIAL_VERSION_NOT_PUBLISHED/
  );

  const materialVersion = version(1, draft, 1);
  const publishedMaterial: AcademyMaterialMasterDoc = {
    ...master, publicationStatus: 'published', currentPublishedVersionId: materialVersion.id,
    latestVersionNumber: 1, lastPublishedWorkingRevision: 1, updatedIso: later
  };
  await repository.publishMaterialVersion(master.id, materialVersion, publishedMaterial, 1, 'admin-1');

  await repository.publishCourseVersion(courseMaster.id, courseVersion, publishedCourse, 2, 'admin-1');
  assert.equal((await repository.get<AcademyCourseVersionDoc>('academy_course_versions', courseVersion.id))?.chapters[0].materialReferences[0].materialVersionId, materialVersion.id);

  const programMaster: AcademyProgramMasterDoc = {
    id: 'program-1', code: 'OPS-PROGRAM', ownerUid: 'admin-1',
    publicationStatus: 'draft', availability: 'available',
    latestVersionNumber: 0, workingRevision: 1, createdIso: now, updatedIso: now
  };
  const programDraft: AcademyProgramDraftDoc = {
    id: programMaster.id, programId: programMaster.id, title: 'Operations program', summary: '',
    learningObjectives: [1, 2, 3].map(n => ({ id: 'objective-' + n, description: 'Learning objective ' + n })),
    courseReferences: [{ courseId: courseMaster.id, requirement: 'required', order: 0 }],
    workingRevision: 1, updatedIso: now, updatedByUid: 'admin-1'
  };
  const programVersion: AcademyProgramVersionDoc = {
    id: programMaster.id + '__v1', programId: programMaster.id, versionNumber: 1,
    title: programDraft.title, summary: programDraft.summary,
    learningObjectives: programDraft.learningObjectives, courseReferences: programDraft.courseReferences,
    publishedIso: later, publishedByUid: 'admin-1', createdIso: later, createdByUid: 'admin-1',
    workingRevision: 1
  };
  const publishedProgram: AcademyProgramMasterDoc = {
    ...programMaster, publicationStatus: 'published', currentPublishedVersionId: programVersion.id,
    latestVersionNumber: 1, updatedIso: later
  };
  await repository.createProgramWithDraft(programMaster, programDraft);
  await repository.publishProgramVersion(programMaster.id, programVersion, publishedProgram, 1, 'admin-1');
  const pinnedProgramParticipation = await repository.startProgramParticipation('learner-pinned', programMaster.id, later);
  assert.equal(pinnedProgramParticipation.requiredCoursePins[0].courseVersionId, courseVersion.id);

  const alreadyStarted = await repository.startCourseParticipation('learner-existing', courseMaster.id, later);
  const changedDraft: AcademyMaterialDraftDoc = {
    ...draft, title: 'Operations Handbook – revised', content: '# Operations\\n\\nRevised guidance.',
    workingRevision: 2, updatedIso: '2026-11-06T12:06:00.000Z', updatedByUid: 'admin-1'
  };
  await repository.saveMaterialDraft(master.id, changedDraft, 1, 'admin-1');
  const currentMaterialMaster = await repository.get<AcademyMaterialMasterDoc>('academy_materials', master.id);
  const secondVersion = version(2, changedDraft, 2);
  const secondPublishedMaster: AcademyMaterialMasterDoc = {
    ...currentMaterialMaster!, publicationStatus: 'published',
    currentPublishedVersionId: secondVersion.id, latestVersionNumber: 2,
    lastPublishedWorkingRevision: 2, updatedIso: '2026-11-06T12:07:00.000Z'
  };
  await repository.publishMaterialVersion(master.id, secondVersion, secondPublishedMaster, 2, 'admin-1');

  const lockedCourse = await repository.get<AcademyCourseMasterDoc>('academy_courses', courseMaster.id);
  assert.equal(lockedCourse?.availability, 'unavailable');
  assert.equal(lockedCourse?.materialReviewPending?.length, 1);
  assert.equal(lockedCourse?.materialReviewPending?.[0].materialVersionId, secondVersion.id);
  assert.deepEqual(await repository.get('academy_course_participations', alreadyStarted.id), alreadyStarted);
  await assert.rejects(
    repository.startCourseParticipation('learner-new', courseMaster.id, later),
    /ACADEMY_COURSE_MATERIAL_REVIEW_PENDING/
  );
  await assert.rejects(
    repository.startCourseParticipation('learner-pinned', courseMaster.id, later),
    /ACADEMY_COURSE_MATERIAL_REVIEW_PENDING/
  );

  await repository.resolveMaterialReview(courseMaster.id, master.id, secondVersion.id, 'stay_offline', later);
  const offlineCourse = await repository.get<AcademyCourseMasterDoc>('academy_courses', courseMaster.id);
  assert.equal(offlineCourse?.availability, 'unavailable');
  assert.equal(offlineCourse?.materialReviewPending, undefined);
  assert.deepEqual(offlineCourse?.materialReviewVersionRequired, [{
    materialId: master.id, materialVersionId: secondVersion.id, materialVersionNumber: 2
  }]);
  await assert.rejects(
    repository.setCourseAvailability(courseMaster.id, 'available', later),
    /ACADEMY_COURSE_MATERIAL_REVIEW_PENDING/
  );

  const updatedCourseDraft: AcademyCourseDraftDoc = {
    ...courseDraft,
    chapters: courseDraft.chapters.map(chapter => ({
      ...chapter,
      materialReferences: chapter.materialReferences.map(reference => ({
        ...reference, materialVersionId: secondVersion.id, title: secondVersion.title,
        versionNumber: secondVersion.versionNumber
      }))
    })),
    workingRevision: 3, updatedIso: '2026-11-06T12:08:00.000Z', updatedByUid: 'admin-1'
  };
  await repository.saveCourseDraft(courseMaster.id, updatedCourseDraft, 2, 'admin-1');
  const updatedCourseVersion: AcademyCourseVersionDoc = {
    id: courseMaster.id + '__v2', courseId: courseMaster.id, versionNumber: 2,
    title: updatedCourseDraft.title, summary: updatedCourseDraft.summary,
    learningObjectives: updatedCourseDraft.learningObjectives, chapters: updatedCourseDraft.chapters,
    completionRequirements: updatedCourseDraft.completionRequirements,
    publishedIso: '2026-11-06T12:09:00.000Z', publishedByUid: 'admin-1',
    createdIso: '2026-11-06T12:09:00.000Z', createdByUid: 'admin-1', workingRevision: 3
  };
  const latestCourseMaster = await repository.get<AcademyCourseMasterDoc>('academy_courses', courseMaster.id);
  const nextCourseMaster: AcademyCourseMasterDoc = {
    ...latestCourseMaster!, publicationStatus: 'published',
    currentPublishedVersionId: updatedCourseVersion.id, latestVersionNumber: 2,
    updatedIso: updatedCourseVersion.publishedIso!
  };
  await repository.publishCourseVersion(courseMaster.id, updatedCourseVersion, nextCourseMaster, 3, 'admin-1');
  const revisedCourse = await repository.get<AcademyCourseMasterDoc>('academy_courses', courseMaster.id);
  assert.equal(revisedCourse?.materialReviewVersionRequired, undefined);
  assert.equal(revisedCourse?.availability, 'unavailable', 'publishing a corrected version does not silently reactivate the course');
  await repository.setCourseAvailability(courseMaster.id, 'available', later);
  assert.equal((await repository.get<AcademyCourseMasterDoc>('academy_courses', courseMaster.id))?.availability, 'available');
}));

test('archiving a material requires a reason and retains all published versions', async () => withRepository(async repository => {
  await setupMaterialRepository(repository);
  await repository.createMaterialWithDraft(master, draft);
  const publishedVersion = version(1, draft, 1);
  const publishedMaster: AcademyMaterialMasterDoc = {
    ...master, publicationStatus: 'published', currentPublishedVersionId: publishedVersion.id,
    latestVersionNumber: 1, lastPublishedWorkingRevision: 1, updatedIso: later
  };
  await repository.publishMaterialVersion(master.id, publishedVersion, publishedMaster, 1, 'admin-1');
  await assert.rejects(repository.archiveMaterial(master.id, 1, 'admin-1', 'short', later), /ACADEMY_MATERIAL_ARCHIVE_REASON_INVALID/);
  const archived = await repository.archiveMaterial(master.id, 1, 'admin-1', 'Fachlich nicht mehr aktuell.', later);
  assert.equal(archived.publicationStatus, 'archived');
  assert.deepEqual(await repository.get('academy_material_versions', publishedVersion.id), publishedVersion);
}));
