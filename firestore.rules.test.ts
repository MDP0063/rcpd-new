/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Payloads)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are strictly rejected by the boolean gates in firestore.rules.
 */

export interface DirtyDozenScenario {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list';
  payload: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  enforcedByRuleGate: string;
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Self-Privilege Escalation on Registration',
    collection: 'users/attacker1',
    operation: 'create',
    payload: {
      uid: 'attacker1',
      displayName: 'Rogue Cadet',
      badgeNumber: 'CA-9999',
      callsign: '1-A-99',
      rank: 'Chief of Police',
      role: 'admin',
      clearanceLevel: 5,
      division: 'Internal Affairs',
      whitelistStatus: 'whitelisted'
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: "incoming().role == 'applicant' && incoming().clearanceLevel == 1 && incoming().whitelistStatus == 'pending'"
  },
  {
    id: 2,
    name: 'Shadow Field Injection on User Update',
    collection: 'users/user1',
    operation: 'update',
    payload: {
      displayName: 'Officer Miller',
      isSuperAdmin: true
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'isValidUserPublic(incoming()) && incoming().diff(existing()).affectedKeys().hasOnly([...])'
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof',
    collection: 'training_modules/mod_spoof',
    operation: 'create',
    payload: {
      email: 'marlon.xv0063@gmail.com',
      email_verified: false
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'isVerified() -> request.auth.token.email_verified == true'
  },
  {
    id: 4,
    name: 'Horizontal PII Scraping',
    collection: 'users_private/other_officer_uid',
    operation: 'get',
    payload: { requesterUid: 'attacker_uid' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'isOwner(userId) || isAdmin()'
  },
  {
    id: 5,
    name: 'ID Poisoning Attack',
    collection: 'applications/invalid$id!with*spaces',
    operation: 'create',
    payload: { applicantUid: 'user1' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: "isValidId(applicationId) -> id.matches('^[a-zA-Z0-9_\\\\-]+$')"
  },
  {
    id: 6,
    name: '1MB String Resource Exhaustion',
    collection: 'applications/app_dos',
    operation: 'create',
    payload: { scenarioResponseLength: 50000 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'data.scenarioResponse.size() <= 3000'
  },
  {
    id: 7,
    name: 'Terminal State Bypass on Whitelist Application',
    collection: 'applications/app_closed',
    operation: 'update',
    payload: { existingStatus: 'rejected', newScenarioResponse: 'Edited after rejection' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: "!(existing().status in ['accepted', 'rejected'])"
  },
  {
    id: 8,
    name: 'Applicant Self-Approving Whitelist',
    collection: 'applications/app1',
    operation: 'update',
    payload: { status: 'accepted' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: "incoming().status == existing().status && affectedKeys().hasOnly(...without status)"
  },
  {
    id: 9,
    name: 'Unauthorized Curriculum Injection',
    collection: 'training_modules/mod_unauthorized',
    operation: 'create',
    payload: { authorUid: 'regular_cadet' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'isAdmin()'
  },
  {
    id: 10,
    name: 'Progress Spoofing for Another Officer',
    collection: 'user_progress/prog_spoof',
    operation: 'create',
    payload: { authUid: 'user1', userId: 'user2', status: 'passed', scorePercent: 100 },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'isAdmin() || incoming().userId == request.auth.uid'
  },
  {
    id: 11,
    name: 'Immortal Timestamp Tampering',
    collection: 'user_progress/prog1',
    operation: 'update',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'incoming().createdAt == existing().createdAt'
  },
  {
    id: 12,
    name: 'Client Timestamp Forgery',
    collection: 'applications/app_forged_time',
    operation: 'create',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRuleGate: 'incoming().createdAt == request.time'
  }
];
