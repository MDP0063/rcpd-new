import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCourseMaster,
  validateCourseParticipation,
  validateCourseVersion,
  validateCourseVersionForPublication,
  validatePrivateNote,
  validateProgramMaster,
  validateProgramVersion
} from './academyDomain.ts';
import type {
  AcademyCourseMasterDoc,
  AcademyCourseParticipationDoc,
  AcademyCourseVersionDoc,
  AcademyPrivateNoteDoc,
  AcademyProgramMasterDoc,
  AcademyProgramVersionDoc
} from '../src/types/academy.ts';

const courseMaster: AcademyCourseMasterDoc = {
  id: 'course_1', code: 'SOP-01', ownerUid: 'user_1',
  publicationStatus: 'draft', availability: 'available',
  latestVersionNumber: 0, workingRevision: 1,
  createdIso: '2026-11-06T10:00:00.000Z', updatedIso: '2026-11-06T10:00:00.000Z'
};
const courseVersion: AcademyCourseVersionDoc = {
  id: 'course_1__v1', courseId: 'course_1', versionNumber: 1,
  title: 'Grundlagen', summary: '', learningObjectives: [],
  chapters: [{
    id: 'chapter_1', title: 'Einführung', required: true, order: 0,
    materialReferences: [{ materialId: 'material_1', materialVersionId: 'material_1__v1', required: true, order: 0 }]
  }],
  completionRequirements: [], createdIso: '2026-11-06T10:00:00.000Z',
  createdByUid: 'user_1', workingRevision: 1
};
const programMaster: AcademyProgramMasterDoc = {
  id: 'program_1', code: 'BASIC-01', ownerUid: 'user_1',
  publicationStatus: 'draft', availability: 'available',
  latestVersionNumber: 0, workingRevision: 1,
  createdIso: '2026-11-06T10:00:00.000Z', updatedIso: '2026-11-06T10:00:00.000Z'
};
const programVersion: AcademyProgramVersionDoc = {
  id: 'program_1__v1', programId: 'program_1', versionNumber: 1,
  title: 'Grundausbildung', summary: '',
  learningObjectives: [1, 2, 3].map(n => ({ id: `goal_${n}`, description: `Lernziel ${n}` })),
  courseReferences: [{ courseId: 'course_1', requirement: 'required', order: 0 }],
  createdIso: '2026-11-06T10:00:00.000Z', createdByUid: 'user_1', workingRevision: 1
};
const participation: AcademyCourseParticipationDoc = {
  id: 'participation_1', userUid: 'user_1', courseId: 'course_1',
  courseVersionId: 'course_1__v1', status: 'in_progress',
  createdIso: '2026-11-06T10:00:00.000Z', updatedIso: '2026-11-06T10:00:00.000Z'
};
const note: AcademyPrivateNoteDoc = {
  id: 'note_1', ownerUid: 'user_1', materialId: 'material_1',
  materialVersionId: 'material_1__v1', kind: 'note',
  content: 'Merken', tags: [], createdIso: '2026-11-06T10:00:00.000Z',
  updatedIso: '2026-11-06T10:00:00.000Z'
};

test('valid course master and version preserve concrete material version references', () => {
  assert.deepEqual(validateCourseMaster(courseMaster), { ok: true });
  assert.deepEqual(validateCourseVersion('course_1', courseVersion), { ok: true });
  const missingVersion = structuredClone(courseVersion);
  missingVersion.chapters[0].materialReferences[0].materialVersionId = '';
  assert.equal(validateCourseVersion('course_1', missingVersion).ok, false);
});

test('published course versions require at least one required completion condition while drafts remain editable', () => {
  assert.deepEqual(validateCourseVersion('course_1', courseVersion), { ok: true });
  assert.equal(validateCourseVersionForPublication('course_1', courseVersion).ok, false);

  const optionalOnly = {
    ...courseVersion,
    completionRequirements: [{
      id: 'req_optional', type: 'required_chapter' as const,
      targetId: 'chapter_1', required: false
    }]
  };
  assert.equal(validateCourseVersionForPublication('course_1', optionalOnly).ok, false);

  const publishable = {
    ...courseVersion,
    completionRequirements: [{
      id: 'req_chapter', type: 'required_chapter' as const,
      targetId: 'chapter_1', required: true
    }]
  };
  assert.deepEqual(validateCourseVersionForPublication('course_1', publishable), { ok: true });
});

test('published course master requires an immutable published version pointer', () => {
  const published = { ...courseMaster, publicationStatus: 'published' as const };
  assert.equal(validateCourseMaster(published).ok, false);
  assert.equal(validateCourseMaster({ ...published, currentPublishedVersionId: 'course_1__v1' }).ok, true);
});

test('program versions require three to six learning objectives and explicit course requirement', () => {
  assert.deepEqual(validateProgramMaster(programMaster), { ok: true });
  assert.deepEqual(validateProgramVersion('program_1', programVersion), { ok: true });
  assert.equal(validateProgramVersion('program_1', {
    ...programVersion, learningObjectives: programVersion.learningObjectives.slice(0, 2)
  }).ok, false);
});

test('participation cannot be marked completed without a completion timestamp', () => {
  assert.deepEqual(validateCourseParticipation(participation), { ok: true });
  assert.equal(validateCourseParticipation({ ...participation, status: 'completed' }).ok, false);
});

test('private notes require owner and exact material version; bookmark cannot contain note text', () => {
  assert.deepEqual(validatePrivateNote(note), { ok: true });
  assert.equal(validatePrivateNote({ ...note, materialVersionId: '' }).ok, false);
  assert.equal(validatePrivateNote({ ...note, kind: 'bookmark', content: 'text' }).ok, false);
});

test('private notes support multiple unique exact material-version sources while preserving the original reference', () => {
  const multiSource = {
    ...note,
    sources: [
      { materialId: 'material_1', materialVersionId: 'material_1__v1' },
      { materialId: 'material_2', materialVersionId: 'material_2__v3' }
    ]
  };
  assert.deepEqual(validatePrivateNote(multiSource), { ok: true });
  assert.equal(validatePrivateNote({ ...multiSource, sources: [multiSource.sources[0], multiSource.sources[0]] }).ok, false);
  assert.deepEqual(validatePrivateNote({ ...multiSource, sources: [multiSource.sources[1]] }), { ok: true });
  assert.equal(validatePrivateNote({ ...multiSource, kind: 'bookmark', sources: multiSource.sources }).ok, false);
  assert.equal(validatePrivateNote({ ...multiSource, sources: Array.from({ length: 26 }, (_, index) => ({
    materialId: `material_${index}`, materialVersionId: `material_${index}__v1`
  })) }).ok, false);
});

test('private note source anchors are optional but strictly validated', () => {
  const anchored = {
    ...note,
    sources: [{
      materialId: 'material_1',
      materialVersionId: 'material_1__v1',
      anchor: {
        kind: 'markdown' as const,
        quote: 'Selected passage',
        prefix: 'before ',
        suffix: ' after',
        headingPath: ['Grundlagen', 'Zugriff']
      }
    }]
  };
  assert.deepEqual(validatePrivateNote(anchored), { ok: true });
  assert.equal(validatePrivateNote({ ...anchored, sources: [{ ...anchored.sources[0], anchor: {
    ...anchored.sources[0].anchor, quote: 'x'.repeat(1001)
  }}] }).ok, false);
  assert.equal(validatePrivateNote({ ...anchored, sources: [{ ...anchored.sources[0], anchor: {
    kind: 'code', quote: 'x', prefix: '', suffix: '', startLine: 0, endLine: 1
  }}] }).ok, false);
  assert.equal(validatePrivateNote({ ...note, sources: [{ materialId: 'material_1', materialVersionId: 'material_1__v1' }] }).ok, true);
});

test('private notes reject malformed optional title and content values', () => {
  assert.equal(validatePrivateNote({ ...note, title: { text: 'invalid' } } as never).ok, false);
  assert.equal(validatePrivateNote({ ...note, content: { text: 'invalid' } } as never).ok, false);
  assert.equal(validatePrivateNote({ ...note, kind: 'bookmark', content: { text: 'invalid' } } as never).ok, false);
  assert.equal(validatePrivateNote({ ...note, title: 'x'.repeat(201) }).ok, false);
});

test('course versions reject duplicate objectives and malformed chapter ordering', () => {
  const duplicateObjectives = {
    ...courseVersion,
    learningObjectives: [
      { id: 'goal_1', description: 'Ziel eins' },
      { id: 'goal_1', description: 'Ziel zwei' }
    ]
  };
  assert.equal(validateCourseVersion('course_1', duplicateObjectives).ok, false);

  const malformedChapter = structuredClone(courseVersion);
  malformedChapter.chapters[0].order = -1;
  assert.equal(validateCourseVersion('course_1', malformedChapter).ok, false);

  const malformedRequirement = {
    ...courseVersion,
    completionRequirements: [{
      id: 'requirement_1',
      type: 'unknown' as never,
      targetId: 'chapter_1',
      required: true
    }]
  };
  assert.equal(validateCourseVersion('course_1', malformedRequirement).ok, false);
});

test('program course references require unique courses and non-negative order', () => {
  const invalidOrder = {
    ...programVersion,
    courseReferences: [{ courseId: 'course_1', requirement: 'required' as const, order: -1 }]
  };
  assert.equal(validateProgramVersion('program_1', invalidOrder).ok, false);
});

test('archived course masters require complete audit metadata', () => {
  const archived = {
    ...courseMaster,
    publicationStatus: 'archived' as const,
    archivedIso: '2026-11-06T11:00:00.000Z',
    archivedByUid: 'admin_1'
  };
  assert.equal(validateCourseMaster(archived).ok, false);
  assert.equal(validateCourseMaster({ ...archived, archiveReason: 'Kurs wurde ersetzt.' }).ok, true);
});

test('domain validators return validation errors for malformed runtime values', () => {
  assert.equal(validateCourseVersion('course_1', null as never).ok, false);
  assert.equal(validateProgramVersion('program_1', null as never).ok, false);
  assert.equal(validateCourseMaster(null as never).ok, false);
  assert.equal(validatePrivateNote(null as never).ok, false);
});


test('course completion requirements must target content actually pinned in the course version', () => {
  const chapterRequirement = {
    ...courseVersion,
    completionRequirements: [{
      id: 'req_chapter', type: 'required_chapter' as const,
      targetId: 'chapter_1', required: true
    }]
  };
  assert.equal(validateCourseVersion('course_1', chapterRequirement).ok, true);

  const materialRequirement = {
    ...courseVersion,
    completionRequirements: [{
      id: 'req_material', type: 'required_material' as const,
      targetId: 'material_1', required: true
    }]
  };
  assert.equal(validateCourseVersion('course_1', materialRequirement).ok, true);

  const missingChapter = {
    ...courseVersion,
    completionRequirements: [{
      id: 'req_chapter', type: 'required_chapter' as const,
      targetId: 'not-in-course', required: true
    }]
  };
  assert.equal(validateCourseVersion('course_1', missingChapter).ok, false);

  const missingMaterial = {
    ...courseVersion,
    completionRequirements: [{
      id: 'req_material', type: 'required_material' as const,
      targetId: 'not-in-course', required: true
    }]
  };
  assert.equal(validateCourseVersion('course_1', missingMaterial).ok, false);
});


test('course chapters and completion requirements reject non-string descriptions', () => {
  const malformedChapter = {
    ...courseVersion,
    chapters: [{ ...courseVersion.chapters[0], description: { text: 'invalid runtime value' } }]
  };
  assert.equal(validateCourseVersion('course_1', malformedChapter as never).ok, false);

  const malformedRequirement = {
    ...courseVersion,
    completionRequirements: [{
      id: 'req_chapter', type: 'required_chapter' as const,
      targetId: 'chapter_1', required: true, description: { text: 'invalid runtime value' }
    }]
  };
  assert.equal(validateCourseVersion('course_1', malformedRequirement as never).ok, false);
});


test('course and program summaries reject malformed runtime values', () => {
  assert.equal(validateCourseVersion('course_1', {
    ...courseVersion, summary: { text: 'invalid' }
  } as never).ok, false);
  assert.equal(validateProgramVersion('program_1', {
    ...programVersion, summary: { text: 'invalid' }
  } as never).ok, false);
  assert.equal(validateCourseVersion('course_1', {
    ...courseVersion, summary: 'x'.repeat(2001)
  }).ok, false);
  assert.equal(validateProgramVersion('program_1', {
    ...programVersion, summary: 'x'.repeat(2001)
  }).ok, false);
});
