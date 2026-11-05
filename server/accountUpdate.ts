import type {
  GranularPermissions,
  UserPrivateProfile,
  UserPublicProfile
} from '../src/types/portal.ts';

export interface AccountChangeSnapshot {
  username: string;
  passwordHash?: string;
  publicProfile: UserPublicProfile;
  privateProfile: UserPrivateProfile;
}

function withoutUpdatedIso<T extends { updatedIso?: string }>(profile: T): Omit<T, 'updatedIso'> {
  const { updatedIso: _updatedIso, ...meaningfulFields } = profile;
  return meaningfulFields;
}

export function hasAccountRecordChanged(
  before: AccountChangeSnapshot,
  after: AccountChangeSnapshot
): boolean {
  return (
    before.username !== after.username ||
    before.passwordHash !== after.passwordHash ||
    JSON.stringify(withoutUpdatedIso(before.publicProfile)) !==
      JSON.stringify(withoutUpdatedIso(after.publicProfile)) ||
    JSON.stringify(withoutUpdatedIso(before.privateProfile)) !==
      JSON.stringify(withoutUpdatedIso(after.privateProfile))
  );
}

function canonicalPermissions(permissions: GranularPermissions): string {
  return JSON.stringify({
    ...permissions,
    assignedCourseCodes: [...new Set(permissions.assignedCourseCodes)].sort()
  });
}

export function shouldNotifyAccountPermissionsUpdated(
  previousRole: string,
  nextRole: string,
  previousPermissions: GranularPermissions,
  nextPermissions: GranularPermissions
): boolean {
  return (
    previousRole !== nextRole ||
    canonicalPermissions(previousPermissions) !== canonicalPermissions(nextPermissions)
  );
}
