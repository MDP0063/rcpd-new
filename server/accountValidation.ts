import type { ApplicationStatus, OfficerRole, WhitelistStatus } from '../src/types/portal.ts';

const officerRoles = new Set<string>(['admin', 'colonel', 'officer', 'rookie', 'trainee']);
const whitelistStatuses = new Set<string>(['whitelisted', 'probation', 'pending', 'suspended', 'revoked']);
const applicationStatuses = new Set<string>(['pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected']);
const whitelistPromotionRoles = new Set<string>(['trainee', 'rookie', 'officer', 'colonel']);
const rankChangeRequestRoles = new Set<string>(['rookie', 'officer', 'colonel']);

export function isOfficerRole(value: unknown): value is OfficerRole {
  return typeof value === 'string' && officerRoles.has(value);
}

export function isWhitelistStatus(value: unknown): value is WhitelistStatus {
  return typeof value === 'string' && whitelistStatuses.has(value);
}

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && applicationStatuses.has(value);
}

/** Ränge, die ein Admin bei Annahme eines Whitelist-Antrags zuweisen darf. */
export function isWhitelistPromotionRole(value: unknown): value is Exclude<OfficerRole, 'admin'> {
  return typeof value === 'string' && whitelistPromotionRoles.has(value);
}

/** Rangstufen, die im bestehenden Beförderungsantrag angeboten werden. */
export function isRankChangeRequestRole(value: unknown): value is 'rookie' | 'officer' | 'colonel' {
  return typeof value === 'string' && rankChangeRequestRoles.has(value);
}

export interface AdministratorRoleRecord {
  uid: string;
  publicProfile: {
    role: OfficerRole;
  };
}

/** Prevents a role change from removing the final administrator account. */
export function wouldRemoveLastAdministrator(
  accounts: ReadonlyArray<AdministratorRoleRecord>,
  targetUid: string,
  nextRole: OfficerRole
): boolean {
  const target = accounts.find(account => account.uid === targetUid);
  if (!target || target.publicProfile.role !== 'admin' || nextRole === 'admin') {
    return false;
  }
  return accounts.filter(account => account.publicProfile.role === 'admin').length <= 1;
}
