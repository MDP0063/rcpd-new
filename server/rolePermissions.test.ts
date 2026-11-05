import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDefaultGranularPermissions,
  getDefaultExamWorkshopPermissions,
  normalizeExamWorkshopPermissions,
  normalizeGranularPermissions
} from './rolePermissions.ts';

test('only administrators receive report and export permission by default', () => {
  assert.equal(getDefaultGranularPermissions('admin').canExportReports, true);
  assert.equal(getDefaultGranularPermissions('colonel').canExportReports, false);
  assert.equal(getDefaultGranularPermissions('officer').canExportReports, false);
});

test('non-admin accounts cannot retain legacy or explicitly granted report export permission', () => {
  for (const role of ['colonel', 'officer', 'rookie', 'trainee'] as const) {
    const permissions = normalizeGranularPermissions(role, {
      canExportReports: true,
      canGradeAssignedCourses: true,
      assignedCourseCodes: [' sop-01 ']
    });
    assert.equal(permissions.canExportReports, false);
    assert.equal(permissions.canGradeAssignedCourses, true);
    assert.deepEqual(permissions.assignedCourseCodes, ['SOP-01']);
  }
});

test('admin permissions remain authoritative and cannot be downgraded by granular input', () => {
  const permissions = normalizeGranularPermissions('admin', {
    canExportReports: false,
    canGradeAssignedCourses: false,
    assignedCourseCodes: [],
    examWorkshop: { hasAccess: false } as never
  });
  assert.equal(permissions.canExportReports, true);
  assert.equal(permissions.canGradeAssignedCourses, true);
  assert.deepEqual(permissions.assignedCourseCodes, ['*']);
  assert.equal(permissions.examWorkshop?.hasAccess, true);
  assert.equal(permissions.examWorkshop?.tests.canUpdateExisting, true);
});

test('Colonels may request workshop access by default but do not receive access automatically', () => {
  const permissions = getDefaultExamWorkshopPermissions('colonel');
  assert.equal(permissions.canRequestAccess, true);
  assert.equal(permissions.hasAccess, false);
  assert.equal(permissions.tests.canView, false);
});

test('other roles need explicit permission to request workshop access', () => {
  assert.equal(getDefaultExamWorkshopPermissions('officer').canRequestAccess, false);
  const permissions = normalizeExamWorkshopPermissions('officer', { canRequestAccess: true });
  assert.equal(permissions.canRequestAccess, true);
  assert.equal(permissions.hasAccess, false);
});

test('workshop category permissions are normalized independently', () => {
  const permissions = normalizeExamWorkshopPermissions('colonel', {
    hasAccess: true,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: false },
    finalExams: { canView: true, canCreate: false, canEdit: false, canUpdateExisting: false },
    publication: {
      newTestsRequireApproval: false,
      newFinalExamsRequireApproval: true,
      testUpdatesRequireApproval: true,
      finalExamUpdatesRequireApproval: true
    },
    lockedUpdateExamIds: ['exam_1', 'exam_1', '../bad', 4 as never]
  });
  assert.deepEqual(permissions.tests, {
    canView: true, canCreate: true, canEdit: true, canUpdateExisting: false
  });
  assert.equal(permissions.finalExams.canView, true);
  assert.equal(permissions.finalExams.canCreate, false);
  assert.equal(permissions.publication.newFinalExamsRequireApproval, true);
  assert.deepEqual(permissions.lockedUpdateExamIds, ['exam_1']);
});

test('administrator permissions always bypass granular workshop configuration', () => {
  const permissions = normalizeExamWorkshopPermissions('admin', {
    hasAccess: false,
    canRequestAccess: false
  });
  assert.equal(permissions.hasAccess, true);
  assert.equal(permissions.tests.canView, true);
  assert.equal(permissions.finalExams.canUpdateExisting, true);
});

test('missing permissions use safe role defaults', () => {
  assert.equal(normalizeGranularPermissions('colonel').canExportReports, false);
  assert.equal(normalizeGranularPermissions('admin').canExportReports, true);
  assert.equal(normalizeGranularPermissions('colonel').examWorkshop?.hasAccess, false);
});
