import assert from 'node:assert/strict';
import test from 'node:test';
import { getDefaultGranularPermissions, normalizeGranularPermissions } from './rolePermissions.ts';

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
    assignedCourseCodes: []
  });

  assert.equal(permissions.canExportReports, true);
  assert.equal(permissions.canGradeAssignedCourses, true);
  assert.deepEqual(permissions.assignedCourseCodes, ['*']);
});

test('missing permissions use safe role defaults', () => {
  assert.equal(normalizeGranularPermissions('colonel').canExportReports, false);
  assert.equal(normalizeGranularPermissions('admin').canExportReports, true);
});
