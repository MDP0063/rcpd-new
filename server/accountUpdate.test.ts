import assert from 'node:assert/strict';
import test from 'node:test';
import type { GranularPermissions, UserPrivateProfile, UserPublicProfile } from '../src/types/portal.ts';
import {
  hasAccountRecordChanged,
  shouldNotifyAccountPermissionsUpdated,
  type AccountChangeSnapshot
} from './accountUpdate.ts';

const permissions: GranularPermissions = {
  assignedCourseCodes: ['SOP-01'],
  canGradeAssignedCourses: true,
  canManageEvents: false,
  canPublishAnnouncements: false,
  canReviewStandardRequests: false,
  canExportReports: false
};

function snapshot(): AccountChangeSnapshot {
  const publicProfile: UserPublicProfile = {
    uid: 'user-1',
    username: 'officer1',
    displayName: 'Officer One',
    badgeNumber: 'CA-1001',
    callsign: '10-1',
    rank: 'Patrol Officer',
    role: 'officer',
    clearanceLevel: 5,
    division: 'Patrol',
    whitelistStatus: 'whitelisted',
    granularPermissions: { ...permissions, assignedCourseCodes: [...permissions.assignedCourseCodes] },
    updatedIso: '2026-11-05T10:00:00.000Z'
  };
  const privateProfile: UserPrivateProfile = {
    uid: 'user-1',
    email: 'officer1@example.test',
    discordTag: 'officer1#0001',
    steamHex: 'steam:verified',
    supervisorNotes: 'Initial note',
    updatedIso: '2026-11-05T10:00:00.000Z'
  };
  return {
    username: 'officer1',
    passwordHash: 'existing-hash',
    publicProfile,
    privateProfile
  };
}

test('timestamp-only updates do not create another account audit event', () => {
  const before = snapshot();
  const after = snapshot();
  after.publicProfile.updatedIso = '2026-11-05T10:05:00.000Z';
  after.privateProfile.updatedIso = '2026-11-05T10:05:00.000Z';

  assert.equal(hasAccountRecordChanged(before, after), false);
});

test('actual public or private account changes are detected', () => {
  const before = snapshot();
  const after = snapshot();
  after.publicProfile.displayName = 'Officer Updated';
  assert.equal(hasAccountRecordChanged(before, after), true);

  const privateChange = snapshot();
  privateChange.privateProfile.supervisorNotes = 'Updated note';
  assert.equal(hasAccountRecordChanged(before, privateChange), true);
});

test('username and password hash changes are detected', () => {
  const before = snapshot();
  const usernameChange = snapshot();
  usernameChange.username = 'new-name';
  assert.equal(hasAccountRecordChanged(before, usernameChange), true);

  const passwordChange = snapshot();
  passwordChange.passwordHash = 'new-hash';
  assert.equal(hasAccountRecordChanged(before, passwordChange), true);
});

test('unchanged role and permission values do not send repeated notifications', () => {
  assert.equal(
    shouldNotifyAccountPermissionsUpdated('officer', 'officer', permissions, { ...permissions }),
    false
  );
});

test('real permission or role changes still send a notification', () => {
  const changedPermissions = { ...permissions, canGradeAssignedCourses: false };
  assert.equal(
    shouldNotifyAccountPermissionsUpdated('officer', 'officer', permissions, changedPermissions),
    true
  );
  assert.equal(
    shouldNotifyAccountPermissionsUpdated('officer', 'colonel', permissions, permissions),
    true
  );
});

test('course-code ordering and duplicate entries do not create false permission changes', () => {
  const reordered = {
    ...permissions,
    assignedCourseCodes: ['SOP-01', 'SOP-01']
  };
  assert.equal(
    shouldNotifyAccountPermissionsUpdated('officer', 'officer', permissions, reordered),
    false
  );
});
