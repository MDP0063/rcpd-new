import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { randomBytes } from 'node:crypto';
import {
  AttemptLimiter,
  consumeRecoveryEmailQuota,
  createSessionToken,
  extractBearerToken,
  findIdentityMismatch,
  generatePassword,
  hashPassword,
  hashRecoveryToken,
  hasActiveRecoveryToken,
  readSessionUid,
  parseAllowedOrigins,
  safeEqual,
  tokenSignature,
  validateNewPassword,
  verifyPassword,
  verifySessionToken
} from './server/auth.ts';
import { canReadModule, refreshAccountPresence } from './server/access.ts';
import { openFirestoreStore, type FirestoreStore } from './server/firestoreStore.ts';
import {
  createFirestoreExamRepository,
  createJsonExamRepository,
  type ExamRepository,
  type ExamDocument
} from './server/examRepository.ts';
import { createLegacyVerificationDoc } from './server/examLegacy.ts';
import { createAcademyApiRouter } from './server/academyApi.ts';
import {
  createFirestoreAcademyRepository,
  createJsonAcademyRepository,
  validateAcademyRepositoryBackupSnapshot,
  type AcademyRepository
} from './server/academyRepository.ts';
import { hasAccountRecordChanged, shouldNotifyAccountPermissionsUpdated } from './server/accountUpdate.ts';
import { createExamDraft, getExamWorkshopDefinitionHash, publishExamDraft, updateExamDraft } from './server/examWorkshop.ts';
import { canAccessExamWorkshopExam, canRequestExamWorkshopAccess, examWorkshopPublicationRequiresApproval, hasExamWorkshopAccess, resolveExamWorkshopActor } from './server/examWorkshopAccess.ts';
import { projectExamWorkshopMaster, restoreDelegatedMatchingIds } from './server/examWorkshopProjection.ts';
import { getActiveExamAttempt, projectStartedExamAttempt, startExamAttempt } from './server/examAttemptService.ts';
import { saveExamAttemptAnswers } from './server/examAutosaveService.ts';
import { submitExamAttempt } from './server/examSubmitService.ts';
import { correctCompletedExamReview, gradeExamAttempt, listCompletedManualReviews, listExamReviews, listOwnExamResults } from './server/examReviewService.ts';
import {
  addExamComment,
  archiveExamMaster,
  listExamComments,
  listExamPublicationRequests,
  refreshPendingExamPublicationRequest,
  submitExamPublicationRequest,
  updateExamPublicationRequestDecision,
  type ExamPublicationRequestDocument
} from './server/examWorkshopRequests.ts';
import { listParticipantExamCatalog } from './server/examParticipantCatalog.ts';
import type { LegacyExamInput } from './server/examLegacy.ts';
import { migrateLegacyExamData } from './server/examMigration.ts';
import {
  validateExamRepositorySnapshot,
  validateLegacyVerificationSources
} from './server/examBackup.ts';
import type { LegacyProgressRecord } from './server/examTypes.ts';
import type {
  AcademyCourseMasterDoc,
  AcademyCourseVersionDoc,
  AcademyProgramMasterDoc,
  AcademyProgramVersionDoc,
  AcademyCourseParticipationDoc,
  AcademyProgramParticipationDoc,
  AcademyProgressEvidenceDoc,
  AcademyCompletionCorrectionDoc,
  AcademyPrivateNoteDoc
} from './src/types/academy.ts';
import { describeError } from './server/errors.ts';
import { getAuthenticatedApiBodyPolicy } from './server/apiBodyPolicy.ts';
import { newId } from './server/ids.ts';
import { isApplicationStatus, isOfficerRole, isRankChangeRequestRole, isWhitelistPromotionRole, isWhitelistStatus } from './server/accountValidation.ts';
import { canAccessDirectMessage, isPendingPortalRequest, isReviewableApplicationStatus, parsePortalDatabaseText, validateApplicationSubmission } from './server/portalLegacyGuards.ts';
import { isRenderDeployHook, isSafeHttpUrl, isSafePdfDataUrl, limitText } from './server/validate.ts';
import {
  AcademyExamDoc,
  AnnouncementCategory,
  AnnouncementDoc,
  AnnouncementPriority,
  AuditLogDoc,
  CalendarEventCategory,
  CalendarEventDoc,
  DirectMessageDoc,
  GranularPermissions,
  MessagePriority,
  OfficerRole,
  PortalBackupSnapshot,
  PortalDeploymentConfig,
  PortalNotificationDoc,
  PortalRequestDoc,
  PublicActivityDoc,
  RequestCategory,
  RequestStatus,
  ROLE_HIERARCHY,
  TrainingModuleDoc,
  UserPrivateProfile,
  UserProgressDoc,
  UserPublicProfile,
  WhitelistApplicationDoc,
  WhitelistStatus
} from './src/types/portal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredAccountRecord {
  uid: string;
  username: string;
  passwordHash?: string;
  /** Altlast aus älteren Datenbanken: wird beim Laden gehasht und entfernt. */
  password?: string;
  /** Erhöhen, um alle zuvor ausgestellten Sitzungen dieses Kontos zu widerrufen. */
  sessionVersion?: number;
  isOnline: boolean;
  lastSeenIso: string;
  publicProfile: UserPublicProfile;
  privateProfile: UserPrivateProfile;
}

export interface PortalDatabaseState {
  version: number;
  accounts: StoredAccountRecord[];
  applications: WhitelistApplicationDoc[];
  modules: TrainingModuleDoc[];
  exams: AcademyExamDoc[];
  progress: UserProgressDoc[];
  academy_courses?: AcademyCourseMasterDoc[];
  academy_course_versions?: AcademyCourseVersionDoc[];
  academy_programs?: AcademyProgramMasterDoc[];
  academy_program_versions?: AcademyProgramVersionDoc[];
  academy_course_participations?: AcademyCourseParticipationDoc[];
  academy_program_participations?: AcademyProgramParticipationDoc[];
  academy_progress_evidence?: AcademyProgressEvidenceDoc[];
  academy_completion_corrections?: AcademyCompletionCorrectionDoc[];
  /** Private collection: never include in public state responses. */
  academy_private_notes?: AcademyPrivateNoteDoc[];
  announcements?: AnnouncementDoc[];
  messages?: DirectMessageDoc[];
  requests?: PortalRequestDoc[];
  events?: CalendarEventDoc[];
  auditLogs?: AuditLogDoc[];
  notifications?: PortalNotificationDoc[];
  deploymentConfig?: PortalDeploymentConfig;
  /** Private, gehashte Einmal-Credentials; wird nicht an Client-APIs ausgegeben. */
  adminRecovery?: { tokenHash: string; expiresAt: string; requestedAt: string } | null;
  /** Persistentes globales Versandkontingent für Admin-Recovery-E-Mails. */
  adminRecoveryRateLimit?: { windowStartedAt: string; count: number } | null;
}

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'portal-db-v3.json');
// Speicher: JSON-Datei (Standard) oder Firestore (STORAGE_BACKEND=firestore).
// Mit Firestore liegt der Zustand im Speicher des Servers und wird gebündelt nach Firestore geschrieben.
let store: FirestoreStore | null = null;
let examRepository: ExamRepository | null = null;
let academyRepository: AcademyRepository | null = null;
let examMaintenanceActive = false;
let examMaintenanceOperation: 'backup' | 'restore' | 'migration' | null = null;
let examRestoreInProgress = false;
let memoryState: PortalDatabaseState | null = null;
const DUMMY_HASH = hashPassword('dummy-passwort-fuer-gleiche-antwortzeit');

// Online threshold: 45 seconds since last heartbeat or login
const ONLINE_THRESHOLD_MS = 45 * 1000;

function computeIsOnline(record: StoredAccountRecord): boolean {
  if (!record.isOnline || !record.lastSeenIso) return false;
  const diff = Date.now() - new Date(record.lastSeenIso).getTime();
  return diff <= ONLINE_THRESHOLD_MS;
}

export { getDefaultGranularPermissions } from './server/rolePermissions.ts';
import { getDefaultGranularPermissions, normalizeExamWorkshopPermissions, normalizeGranularPermissions } from './server/rolePermissions.ts';

function canActorEditCourseCode(caller: StoredAccountRecord, courseCode?: string): boolean {
  const role = caller.publicProfile.role;
  if (role === 'admin' || role === 'colonel') return true;
  const perms =
    caller.publicProfile.granularPermissions || getDefaultGranularPermissions(role);
  if (!perms.canGradeAssignedCourses) return false;
  if (!courseCode) return perms.assignedCourseCodes.includes('*');
  const normalizedTarget = courseCode.trim().toUpperCase();
  return (
    perms.assignedCourseCodes.includes('*') ||
    perms.assignedCourseCodes.some(c => c.toUpperCase() === normalizedTarget)
  );
}

function appendAuditLog(
  state: PortalDatabaseState,
  actor: StoredAccountRecord,
  category: AuditLogDoc['category'],
  actionTitle: string,
  targetLabel: string,
  details: string
) {
  if (!Array.isArray(state.auditLogs)) {
    state.auditLogs = [];
  }
  const entry: AuditLogDoc = {
    id: newId('aud'),
    actorUid: actor.uid,
    actorName: actor.publicProfile.displayName,
    actorBadge: actor.publicProfile.badgeNumber,
    actorRole: actor.publicProfile.role,
    category,
    actionTitle,
    targetLabel,
    details,
    createdIso: new Date().toISOString()
  };
  state.auditLogs.unshift(entry);
  if (state.auditLogs.length > 500) {
    state.auditLogs = state.auditLogs.slice(0, 500);
  }
}

function pushNotification(
  state: PortalDatabaseState,
  recipientUid: string,
  type: PortalNotificationDoc['type'],
  title: string,
  message: string,
  linkSection: PortalNotificationDoc['linkSection']
) {
  if (!Array.isArray(state.notifications)) {
    state.notifications = [];
  }
  // New Academy collections are additive: existing legacy modules/progress remain untouched.
  if (!Array.isArray(state.academy_courses)) state.academy_courses = [];
  if (!Array.isArray(state.academy_course_versions)) state.academy_course_versions = [];
  if (!Array.isArray(state.academy_programs)) state.academy_programs = [];
  if (!Array.isArray(state.academy_program_versions)) state.academy_program_versions = [];
  if (!Array.isArray(state.academy_course_participations)) state.academy_course_participations = [];
  if (!Array.isArray(state.academy_program_participations)) state.academy_program_participations = [];
  if (!Array.isArray(state.academy_progress_evidence)) state.academy_progress_evidence = [];
  if (!Array.isArray(state.academy_completion_corrections)) state.academy_completion_corrections = [];
  if (!Array.isArray(state.academy_private_notes)) state.academy_private_notes = [];
  const item: PortalNotificationDoc = {
    id: newId('notif'),
    recipientUid,
    type,
    title,
    message,
    linkSection,
    readByUids: [],
    createdIso: new Date().toISOString()
  };
  state.notifications.unshift(item);
  if (state.notifications.length > 300) {
    state.notifications = state.notifications.slice(0, 300);
  }
}

function buildRecentPublicActivity(state: PortalDatabaseState): PublicActivityDoc[] {
  const candidates: PublicActivityDoc[] = [];
  // Preserve Array.find()'s first-match behavior while avoiding repeated account scans.
  const accountDisplayNames = new Map<string, string>();
  for (const account of state.accounts) {
    if (!accountDisplayNames.has(account.uid)) {
      accountDisplayNames.set(account.uid, account.publicProfile.displayName);
    }
  }

  // 1. Extract public actions from auditLogs (ANNOUNCEMENT, ACADEMY_DOC, CALENDAR_EVENT)
  for (const log of state.auditLogs || []) {
    if (log.category === 'ANNOUNCEMENT' && !log.actionTitle.toLowerCase().includes('gelöscht')) {
      candidates.push({
        id: `pub_${log.id}`,
        actionType: 'New Announcement',
        actionLabelDe: 'Neue Bekanntmachung veröffentlicht',
        title: log.targetLabel,
        actorName: log.actorName,
        targetSection: 'announcements',
        createdIso: log.createdIso
      });
    } else if (
      log.category === 'ACADEMY_DOC' &&
      !log.actionTitle.toLowerCase().includes('gelöscht') &&
      !log.actionTitle.toLowerCase().includes('entwurf')
    ) {
      const isExam =
        log.actionTitle.toLowerCase().includes('prüfung') ||
        log.actionTitle.toLowerCase().includes('test');
      const isUpdate = log.actionTitle.toLowerCase().includes('bearbeitet');
      candidates.push({
        id: `pub_${log.id}`,
        actionType: isExam
          ? 'New Exam Published'
          : isUpdate
          ? 'Training Module Updated'
          : 'New Training Module Published',
        actionLabelDe: isExam
          ? 'Neue Prüfung / Test veröffentlicht'
          : isUpdate
          ? 'Lehrbuch / Modul aktualisiert'
          : 'Neues Lehrbuch veröffentlicht',
        title: log.targetLabel,
        actorName: log.actorName,
        targetSection: 'academy',
        createdIso: log.createdIso
      });
    } else if (
      log.category === 'CALENDAR_EVENT' &&
      !log.actionTitle.toLowerCase().includes('gelöscht')
    ) {
      candidates.push({
        id: `pub_${log.id}`,
        actionType: 'New Calendar Event Scheduled',
        actionLabelDe: 'Neuer Kalender-Termin angesetzt',
        title: log.targetLabel,
        actorName: log.actorName,
        targetSection: 'calendar',
        createdIso: log.createdIso
      });
    }
  }

  // 2. Also include existing announcements, training modules, exams, and calendar events
  for (const ann of state.announcements || []) {
    candidates.push({
      id: `pub_ann_${ann.id}`,
      actionType: 'New Announcement',
      actionLabelDe: 'Neue Bekanntmachung veröffentlicht',
      title: ann.title,
      actorName: ann.authorName,
      targetSection: 'announcements',
      createdIso: ann.createdIso
    });
  }

  for (const mod of state.modules || []) {
    const authorName = accountDisplayNames.get(mod.authorUid);
    candidates.push({
      id: `pub_mod_${mod.id}`,
      actionType: 'New Training Module Published',
      actionLabelDe: 'Neues Lehrbuch veröffentlicht',
      title: `${mod.code} — ${mod.title}`,
      actorName: authorName || 'Academy Command',
      targetSection: 'academy',
      createdIso: mod.updatedIso || new Date().toISOString()
    });
  }

  for (const ex of state.exams || []) {
    const authorName = accountDisplayNames.get(ex.authorUid);
    candidates.push({
      id: `pub_ex_${ex.id}`,
      actionType: 'New Exam Published',
      actionLabelDe: 'Neue Prüfung / Test veröffentlicht',
      title: `${ex.moduleCode} — ${ex.title}`,
      actorName: authorName || 'Academy Command',
      targetSection: 'academy',
      createdIso: ex.updatedIso || new Date().toISOString()
    });
  }

  for (const evt of state.events || []) {
    candidates.push({
      id: `pub_evt_${evt.id}`,
      actionType: 'New Calendar Event Scheduled',
      actionLabelDe: 'Neuer Kalender-Termin angesetzt',
      title: evt.title,
      actorName: evt.instructorName,
      targetSection: 'calendar',
      createdIso: evt.createdIso
    });
  }

  // Sort newest first and deduplicate by actionType + title
  candidates.sort(
    (a, b) => new Date(b.createdIso).getTime() - new Date(a.createdIso).getTime()
  );

  const unique: PublicActivityDoc[] = [];
  const seenKeys = new Set<string>();
  for (const item of candidates) {
    const key = `${item.actionType}::${item.title.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      unique.push(item);
      if (unique.length >= 5) break;
    }
  }

  return unique;
}

function initialAdminPassword(): string {
  const fromEnv = process.env.ADMIN_INITIAL_PASSWORD;
  if (fromEnv && !validateNewPassword(fromEnv)) return fromEnv;
  const generated = generatePassword();
  console.warn(
    '[Sicherheit] ADMIN_INITIAL_PASSWORD fehlt oder ist zu kurz. ' +
      `Das Passwort für "Admin1" wurde zufällig erzeugt: ${generated}`
  );
  return generated;
}

/** Hasht Klartext-Passwörter aus älteren Datenbanken. Gibt true zurück, wenn etwas geändert wurde. */
function migrateLegacyPasswords(state: PortalDatabaseState): boolean {
  let changed = false;
  for (const acc of state.accounts) {
    if (typeof acc.password === 'string') {
      if (!acc.passwordHash && acc.password.length > 0) {
        acc.passwordHash = hashPassword(acc.password);
      }
      delete acc.password;
      changed = true;
    }
  }
  return changed;
}

/** Konto ohne Passwort-Felder, für Antworten an den Client. */
function toAdminView(acc: StoredAccountRecord) {
  const { password: _legacy, passwordHash: _hash, sessionVersion: _sessionVersion, ...rest } = acc;
  return rest;
}

function createInitialDatabase(): PortalDatabaseState {
  const nowIso = new Date().toISOString();
  const tomorrowIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const inThreeDaysIso = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();

  // Only Admin1 is pre-created by default; no pre-programmed tests or textbooks!
  const initialAccounts: StoredAccountRecord[] = [
    {
      uid: 'usr_admin_1',
      username: 'Admin1',
      passwordHash: hashPassword(initialAdminPassword()),
      isOnline: false,
      lastSeenIso: nowIso,
      publicProfile: {
        uid: 'usr_admin_1',
        username: 'Admin1',
        displayName: 'Chief Administrator',
        badgeNumber: 'CA-0001',
        callsign: '1-ADMIN',
        rank: ROLE_HIERARCHY.admin.defaultRank,
        role: 'admin',
        clearanceLevel: 10,
        division: 'Office of the Chief of Police (Command Administration)',
        whitelistStatus: 'whitelisted',
        granularPermissions: getDefaultGranularPermissions('admin'),
        isOnline: false,
        lastSeenIso: nowIso,
        updatedIso: nowIso
      },
      privateProfile: {
        uid: 'usr_admin_1',
        email: 'admin1@post.ca.gov',
        discordTag: 'admin1#0001',
        steamHex: 'steam:11000010a000001',
        supervisorNotes:
          'Master Administrator Account (Volle System-, Konten- & Rollenberechtigung).',
        updatedIso: nowIso
      }
    }
  ];

  const defaultAnnouncements: AnnouncementDoc[] = [
    {
      id: 'ann_welcome_1',
      title: 'Inbetriebnahme des CA-POST Officer & Academy Intranets',
      category: 'Dienstanweisung',
      priority: 'important',
      content:
        'Willkommen im offiziellen Dienst- und Ausbildungsportal. Bitte prüft regelmäßig das Ankündigungs-Modul auf aktuelle Dienstanweisungen, nutzt das interne Nachrichtensystem für die dienstliche Kommunikation und reicht Anträge auf Rangänderungen, Sonderfreigaben oder Belobigungen direkt über das Antragsformular ein.',
      authorUid: 'usr_admin_1',
      authorName: 'Chief Administrator',
      authorRank: ROLE_HIERARCHY.admin.defaultRank,
      pinned: true,
      acknowledgedByUids: ['usr_admin_1'],
      createdIso: nowIso
    }
  ];

  const defaultEvents: CalendarEventDoc[] = [
    {
      id: 'evt_default_1',
      title: 'Taktisches Grundlagentraining & Funkdisziplin (SOP-01)',
      category: 'Training & Lehrgang',
      courseCode: 'SOP-01',
      location: 'CA-POST Regional Training Center · Übungsplatz Nord',
      startIso: tomorrowIso,
      durationMinutes: 90,
      maxParticipants: 20,
      instructorName: 'Chief Administrator',
      instructorUid: 'usr_admin_1',
      description:
        'Praktische Übungseinheit zu Funkverkehr, Fahrzeugkontrollen (High-Risk Traffic Stops) und Eigensicherung im Streifendienst.',
      mandatoryForRoles: ['trainee', 'rookie'],
      attendees: [
        {
          uid: 'usr_admin_1',
          displayName: 'Chief Administrator',
          badgeNumber: 'CA-0001',
          role: 'admin',
          status: 'attending',
          updatedIso: nowIso
        }
      ],
      createdIso: nowIso
    },
    {
      id: 'evt_default_2',
      title: 'Wöchentliche Dienstbesprechung & Einsatznachbereitung',
      category: 'Dienstbesprechung',
      courseCode: 'BRIEF-01',
      location: 'Hauptquartier · Besprechungsraum 204',
      startIso: inThreeDaysIso,
      durationMinutes: 45,
      maxParticipants: 40,
      instructorName: 'Chief Administrator',
      instructorUid: 'usr_admin_1',
      description:
        'Besprechung aktueller Dienstanweisungen, Beförderungen, offener Lehrgänge und Koordination kommender Sondereinsätze.',
      mandatoryForRoles: ['admin', 'colonel', 'officer', 'rookie', 'trainee'],
      attendees: [],
      createdIso: nowIso
    }
  ];

  const initialAuditLogs: AuditLogDoc[] = [
    {
      id: 'aud_init_1',
      actorUid: 'usr_admin_1',
      actorName: 'Chief Administrator',
      actorBadge: 'CA-0001',
      actorRole: 'admin',
      category: 'ACCOUNT_ROLE',
      actionTitle: 'System-Initialisierung & Master-Admin bereitgestellt',
      targetLabel: 'Admin1 (CA-0001)',
      details:
        'CA-POST Officer & Academy Intranet initialisiert. Audit-Trail, Live-Benachrichtigungen und granulare Lehrgangs-Berechtigungen aktiv.',
      createdIso: nowIso
    }
  ];

  const defaultModules: TrainingModuleDoc[] = [
    {
      id: 'mod_default_sop01',
      title: 'Streifendienst, Eigensicherung & Funkdisziplin',
      code: 'SOP-01',
      category: 'SOP & Policy',
      minClearance: ROLE_HIERARCHY.trainee.defaultClearance,
      requiredRole: 'trainee',
      embedType: 'document',
      contentMarkdown: `# 1. Grundsätze des Streifendienstes (SOP-01)

Jeder Beamte des California POST Dienstportals vertritt im täglichen Streifendienst die rechtsstaatlichen Grundsätze der Verhältnismäßigkeit, Eigensicherung und professionellen Kommunikation. Vor Beginn jeder Schicht sind Dienstfahrzeug, Funkgerät und persönliche Schutzausrüstung vollständig auf Einsatzbereitschaft zu prüfen.

## 2. Funkdisziplin & 10-Codes im Einsatzfunk

Der Funkverkehr ist sachlich, knapp und eindeutig zu führen. Vor jedem Funkspruch ist das eigene Rufzeichen (Callsign) zu nennen.

- 10-4: Verstanden / Bestätigung der Durchsage
- 10-7: Außer Dienst / Nicht einsatzbereit
- 10-8: Im Dienst / Einsatzbereit auf Streife
- 10-20: Aktueller Standort der Einheit
- 10-99: Beamter in unmittelbarer Gefahr — Höchste Priorität für alle Einheiten

## 3. Taktische Eigensicherung bei Fahrzeugkontrollen (Traffic Stops)

Bei jeder Verkehrskontrolle ist der Streifenwagen leicht versetzt hinter dem Zielobjekt zu positionieren, um einen sicheren Korridor für die herantretende Kraft zu schaffen. Vor dem Verlassen des Streifenwagens werden Kennzeichen, Fahrzeugtyp und Standort (10-20) an die Leitstelle durchgegeben.`,
      externalUrl: '',
      pdfDataUrl: '',
      pdfFileName: '',
      interactiveCode: '',
      estimatedMinutes: 20,
      authorUid: 'usr_admin_1',
      updatedIso: nowIso
    },
    {
      id: 'mod_default_pc102',
      title: 'California Penal Code & Eingriffsrecht im Vollzugsdienst',
      code: 'PC-102',
      category: 'California Penal Code',
      minClearance: ROLE_HIERARCHY.trainee.defaultClearance,
      requiredRole: 'trainee',
      embedType: 'document',
      contentMarkdown: `# 1. Rechtsgrundlagen für freiheitsentziehende Maßnahmen

Eine vorläufige Festnahme (Arrest) setzt einen hinreichenden Tatverdacht (Probable Cause) voraus. Bei einer kurzzeitigen Festhaltung zur Sachverhaltsklärung (Detention / Terry Stop) genügt ein begründeter Anfangsverdacht (Reasonable Suspicion) auf Basis konkreter, artikulierbarer Tatsachen.

## 2. Belehrungspflichten (Miranda Warning)

Vor jeder formellen Vernehmung einer in Gewahrsam befindlichen Person ist die Belehrung vollständig und dokumentiert durchzuführen:

- Sie haben das Recht zu schweigen.
- Alles, was Sie sagen, kann und wird vor Gericht gegen Sie verwendet werden.
- Sie haben das Recht, zu jeder Vernehmung einen Verteidiger hinzuzuziehen.
- Wenn Sie sich keinen Verteidiger leisten können, wird Ihnen auf Staatskosten ein Pflichtverteidiger bestellt.

## 3. Grundsatz der Verhältnismäßigkeit (Use of Force Continuum)

Unmittelbarer Zwang darf nur angewendet werden, soweit mildere Mittel (insbesondere deeskalierende Ansprache und klare Handlungsanweisungen) keinen Erfolg versprechen oder aufgrund einer gegenwärtigen Gefahr nicht möglich sind.`,
      externalUrl: '',
      pdfDataUrl: '',
      pdfFileName: '',
      interactiveCode: '',
      estimatedMinutes: 25,
      authorUid: 'usr_admin_1',
      updatedIso: nowIso
    }
  ];

  const defaultExams: AcademyExamDoc[] = [
    {
      id: 'exam_default_test01',
      title: 'Grundlagenprüfung: Funkdisziplin & Verkehrskontrollen (SOP-01)',
      moduleCode: 'SOP-01',
      assessmentStage: 'test',
      minClearance: ROLE_HIERARCHY.trainee.defaultClearance,
      passingScore: 70,
      timeLimitMinutes: 15,
      examFormat: 'structured_quiz',
      questionsPayload: JSON.stringify([
        {
          id: 'q1',
          question: 'Welche Angaben müssen der Leitstelle vor dem Verlassen des Streifenwagens bei einer Verkehrskontrolle übermittelt werden?',
          options: [
            'Nur der eigene Vorname ohne Standortangabe',
            'Standort (10-20), Fahrzeugtyp und Kennzeichen des kontrollierten Fahrzeugs',
            'Eine Meldung erfolgt erst nach Abschluss der gesamten Kontrolle'
          ],
          correctIndex: 1,
          explanation: 'Zur Eigensicherung müssen Standort (10-20), Fahrzeugbeschreibung und Kennzeichen immer vor dem Herantreten durchgegeben werden.'
        },
        {
          id: 'q2',
          question: 'Welche Bedeutung hat der Funkcode 10-8 im regulären Dienstbetrieb?',
          options: [
            'Im Dienst / Einsatzbereit auf Streife',
            'Schichtende / Außer Dienst',
            'Anforderung eines Abschleppfahrzeugs'
          ],
          correctIndex: 0,
          explanation: '10-8 meldet die Einheit als einsatzbereit im Streifendienst.'
        },
        {
          id: 'q3',
          question: 'Wann ist ein Beschuldigter zwingend nach den Miranda-Grundsätzen zu belehren?',
          options: [
            'Bei jeder allgemeinen Verkehrskontrolle noch vor der Ausweiskontrolle',
            'Vor einer formellen Vernehmung in amtlichem Gewahrsam (Custodial Interrogation)',
            'Nur bei Ordnungswidrigkeiten im ruhenden Verkehr'
          ],
          correctIndex: 1,
          explanation: 'Die Miranda-Belehrung ist zwingend erforderlich, sobald sich eine Person in Gewahrsam befindet und vernommen werden soll.'
        }
      ]),
      interactiveWidgetCode: '',
      authorUid: 'usr_admin_1',
      updatedIso: nowIso
    },
    {
      id: 'exam_default_final01',
      title: 'Offizielle CA-POST Abschlussprüfung: Recht & Einsatztaktik',
      moduleCode: 'PC-102',
      assessmentStage: 'final_exam',
      minClearance: ROLE_HIERARCHY.rookie.defaultClearance,
      passingScore: 80,
      timeLimitMinutes: 25,
      examFormat: 'structured_quiz',
      questionsPayload: JSON.stringify([
        {
          id: 'fq1',
          question: 'Welcher rechtliche Maßstab ist für eine kurzzeitige Festhaltung zur Sachverhaltsklärung (Terry Stop / Detention) erforderlich?',
          options: [
            'Reine Vermutung ohne konkrete Anhaltspunkte',
            'Begründeter Anfangsverdacht aufgrund konkreter Tatsachen (Reasonable Suspicion)',
            'Rechtskräftiges Gerichtsurteil'
          ],
          correctIndex: 1,
          explanation: 'Für eine kurzzeitige Festhaltung (Detention) ist Reasonable Suspicion auf Basis konkreter Tatsachen erforderlich.'
        },
        {
          id: 'fq2',
          question: 'Wie wird der Streifenwagen bei einer regulären Verkehrskontrolle zur Eigensicherung abgestellt?',
          options: [
            'Leicht versetzt hinter dem angehaltenen Fahrzeug, um einen geschützten Korridor zu bilden',
            'Unmittelbar vor der Motorhaube des angehaltenen Fahrzeugs',
            'Auf der gegenüberliegenden Straßenseite entgegen der Fahrtrichtung'
          ],
          correctIndex: 0,
          explanation: 'Die leicht versetzte Positionierung hinter dem Zielfahrzeug schützt die eingesetzten Kräfte vor dem fließenden Verkehr.'
        },
        {
          id: 'fq3',
          question: 'Welcher Funkcode signalisiert höchste Dringlichkeit (Beamter in unmittelbarer Gefahr)?',
          options: [
            '10-4',
            '10-20',
            '10-99'
          ],
          correctIndex: 2,
          explanation: '10-99 steht für einen Beamten in akuter Notlage und hat im Funkverkehr höchste Priorität.'
        }
      ]),
      interactiveWidgetCode: '',
      authorUid: 'usr_admin_1',
      updatedIso: nowIso
    }
  ];

  return {
    version: 3,
    accounts: initialAccounts,
    applications: [],
    modules: defaultModules,
    exams: defaultExams,
    progress: [],
    academy_courses: [],
    academy_course_versions: [],
    academy_programs: [],
    academy_program_versions: [],
    academy_course_participations: [],
    academy_program_participations: [],
    academy_progress_evidence: [],
    academy_completion_corrections: [],
    academy_private_notes: [],
    announcements: defaultAnnouncements,
    messages: [],
    requests: [],
    events: defaultEvents,
    auditLogs: initialAuditLogs,
    notifications: [],
    deploymentConfig: {
      githubRepoUrl: 'https://github.com/DEIN-BENUTZERNAME/ca-post-officer-portal.git',
      renderServiceUrl: 'https://rcpd-new.onrender.com',
      renderDeployHookUrl: '',
      branchName: 'main',
      autoDeployEnabled: true,
      completedSteps: [],
      updatedIso: nowIso
    }
  };
}

function ensureDeploymentConfig(state: PortalDatabaseState): PortalDeploymentConfig {
  if (!state.deploymentConfig) {
    state.deploymentConfig = {
      githubRepoUrl: 'https://github.com/DEIN-BENUTZERNAME/ca-post-officer-portal.git',
      renderServiceUrl: 'https://rcpd-new.onrender.com',
      renderDeployHookUrl: '',
      branchName: 'main',
      autoDeployEnabled: true,
      completedSteps: [],
      updatedIso: new Date().toISOString()
    };
  } else if (!state.deploymentConfig.renderServiceUrl) {
    state.deploymentConfig.renderServiceUrl = 'https://rcpd-new.onrender.com';
  }
  if (!Array.isArray(state.announcements)) {
    state.announcements = [];
  }
  if (!Array.isArray(state.messages)) {
    state.messages = [];
  }
  if (!Array.isArray(state.requests)) {
    state.requests = [];
  }
  if (!Array.isArray(state.events)) {
    state.events = createInitialDatabase().events || [];
  }
  if (!Array.isArray(state.auditLogs)) {
    state.auditLogs = createInitialDatabase().auditLogs || [];
  }
  if (!Array.isArray(state.notifications)) {
    state.notifications = [];
  }
  if (!Array.isArray(state.modules) || (state.modules.length === 0 && (!state.progress || state.progress.length === 0))) {
    state.modules = createInitialDatabase().modules;
  }
  if (!Array.isArray(state.exams) || (state.exams.length === 0 && (!state.progress || state.progress.length === 0))) {
    state.exams = createInitialDatabase().exams;
  }
  for (const acc of state.accounts) {
    if (!acc.publicProfile.granularPermissions) {
      acc.publicProfile.granularPermissions = getDefaultGranularPermissions(
        acc.publicProfile.role
      );
    }
  }
  return state.deploymentConfig;
}

/** Interne Referenz auf ausgelagerte PDF-Teilstücke; wird niemals an den Browser ausgegeben. */
type ModuleWithLazyBlobs = TrainingModuleDoc & {
  __lazyBlobChunks?: Record<string, number>;
};

/** Modul ohne PDF-Inhalt; der Client lädt es erst beim Öffnen über /api/academy/modules/:id/pdf. */
function toClientModule(mod: TrainingModuleDoc): TrainingModuleDoc {
  const internal = mod as ModuleWithLazyBlobs;
  const { pdfDataUrl, __lazyBlobChunks, ...rest } = internal;
  return {
    ...rest,
    hasPdf: Boolean(mod.hasPdf || pdfDataUrl || __lazyBlobChunks?.pdfDataUrl)
  };
}

/**
 * Prüfungsfragen für den Browser: Lösungsschlüssel und Erläuterungen bleiben
 * ausschließlich auf dem Server. Die Antworten werden nach Abgabe serverseitig ausgewertet.
 */
// Firestore state reads reuse the same immutable exam objects. Cache the sanitized payload
// per object; WeakMap entries disappear automatically when a saved exam is replaced.
const clientExamQuestionPayloadCache = new WeakMap<AcademyExamDoc, string>();

function toClientExam(exam: AcademyExamDoc): AcademyExamDoc {
  const cachedPayload = clientExamQuestionPayloadCache.get(exam);
  if (cachedPayload !== undefined) {
    return { ...exam, questionsPayload: cachedPayload };
  }

  let publicQuestions: Array<{ id: string; question: string; options: string[] }> = [];
  try {
    const parsed: unknown = JSON.parse(exam.questionsPayload || '[]');
    if (Array.isArray(parsed)) {
      publicQuestions = parsed.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const question = item as Record<string, unknown>;
        if (
          typeof question.id !== 'string' ||
          typeof question.question !== 'string' ||
          !Array.isArray(question.options) ||
          !question.options.every(option => typeof option === 'string')
        ) {
          return [];
        }
        return [{
          id: question.id,
          question: question.question,
          options: question.options as string[]
        }];
      });
    }
  } catch {
    // Fehlerhafte gespeicherte Frage-Payloads werden geschlossen behandelt.
  }
  const sanitizedPayload = JSON.stringify(publicQuestions);
  clientExamQuestionPayloadCache.set(exam, sanitizedPayload);
  return { ...exam, questionsPayload: sanitizedPayload };
}

/** Nur lesen, ohne Kopie (für die Sitzungsprüfung bei jedem Request). Ergebnis nie verändern. */
function peekDatabase(): PortalDatabaseState {
  if (store && memoryState) return memoryState;
  return loadDatabase();
}

function loadDatabase(): PortalDatabaseState {
  // Kopie, damit unvollständige Änderungen in einem Request nie im Speicher hängen bleiben.
  if (store && memoryState) return structuredClone(memoryState);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  // An existing but invalid database is never replaced with an empty initial state.
  // Preserve the original file and fail the request/startup path so recovery can use a backup.
  const parsed = parsePortalDatabaseText(raw) as unknown as PortalDatabaseState;
  ensureDeploymentConfig(parsed);
  if (migrateLegacyPasswords(parsed)) {
    saveDatabase(parsed);
  }
  return parsed;
}

function saveDatabase(state: PortalDatabaseState) {
  if (store) {
    memoryState = state;
    store.scheduleSave(state as unknown as Record<string, unknown>);
    return;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

/** Persistiert einen vollständigen Portal-State und bestätigt Firestore-Schreibfehler an den Aufrufer. */
async function saveDatabaseAndWait(state: PortalDatabaseState): Promise<void> {
  saveDatabase(state);
  if (store) await store.flushStrict();
}


/** Prüft die Felder eines Lehrmaterials. Gibt eine Fehlermeldung zurück oder null. */
function validateModuleFields(
  fields: { title?: unknown; externalUrl?: unknown; pdfDataUrl?: unknown; requiredRole?: unknown },
  requireTitle: boolean
): string | null {
  if (requireTitle && (typeof fields.title !== 'string' || fields.title.trim().length === 0)) {
    return 'Bitte einen Titel angeben.';
  }
  if (typeof fields.title === 'string' && fields.title.length > 200) {
    return 'Der Titel ist zu lang (höchstens 200 Zeichen).';
  }
  if (fields.externalUrl !== undefined && !isSafeHttpUrl(String(fields.externalUrl).trim())) {
    return 'Die externe Adresse muss mit http:// oder https:// beginnen.';
  }
  if (fields.pdfDataUrl !== undefined && !isSafePdfDataUrl(String(fields.pdfDataUrl))) {
    return 'Das hochgeladene Dokument ist kein gültiges PDF.';
  }
  if (
    fields.requiredRole &&
    !Object.prototype.hasOwnProperty.call(ROLE_HIERARCHY, String(fields.requiredRole))
  ) {
    return 'Unbekannte Rolle.';
  }
  return null;
}

async function initFirestoreStorage() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    console.error('STORAGE_BACKEND=firestore gesetzt, aber FIREBASE_SERVICE_ACCOUNT fehlt.');
    process.exit(1);
  }
  // Bei Fehlern bewusst abbrechen statt auf die JSON-Datei auszuweichen, damit keine Daten auseinanderlaufen.
  store = await openFirestoreStore({
    serviceAccount,
    databaseId: process.env.FIREBASE_DATABASE_ID || undefined
  });
  let initial = (await store.loadAll()) as unknown as PortalDatabaseState | null;
  if (!initial) {
    // Erster Start mit Firestore: vorhandene JSON-Datei übernehmen, sonst neu anlegen.
    let fromFile: PortalDatabaseState | null = null;
    try {
      fromFile = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as PortalDatabaseState;
    } catch {
      fromFile = null;
    }
    initial = fromFile && fromFile.accounts?.length ? fromFile : createInitialDatabase();
    console.log(
      `[Firestore] Noch keine Daten vorhanden, ${fromFile ? 'übernehme die JSON-Datei' : 'lege eine neue Datenbank an'}.`
    );
  }
  ensureDeploymentConfig(initial);
  migrateLegacyPasswords(initial);
  memoryState = initial;
  store.scheduleSave(initial as unknown as Record<string, unknown>);
  await store.flush();

  const shutdown = () => {
    void store?.flush().finally(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  console.log('[Firestore] Speicher bereit.');
}

export function getExamRepository(): ExamRepository {
  if (!examRepository) throw new Error('EXAM_REPOSITORY_NOT_INITIALIZED');
  return examRepository;
}
function getAcademyRepository(): AcademyRepository {
  if (!academyRepository) throw new Error('ACADEMY_REPOSITORY_NOT_INITIALIZED');
  return academyRepository;
}

async function startServer() {
  if (process.env.STORAGE_BACKEND === 'firestore') {
    await initFirestoreStorage();
  }
  examRepository = store
    ? createFirestoreExamRepository(store.getDatabase())
    : createJsonExamRepository(DATA_DIR);
  academyRepository = store
    ? createFirestoreAcademyRepository(store.getDatabase())
    : createJsonAcademyRepository(DATA_DIR);
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Hinter dem Render-Proxy kommt die echte Client-IP aus X-Forwarded-For.
  app.set('trust proxy', 1);

  const sessionSecret = process.env.SESSION_SECRET || '';
  if (sessionSecret.length < 32) {
    console.warn(
      '[Sicherheit] SESSION_SECRET fehlt oder ist kürzer als 32 Zeichen. ' +
        'Es wird ein zufälliger Wert verwendet; alle Sitzungen enden bei jedem Neustart.'
    );
  }
  const SESSION_SECRET = sessionSecret.length >= 32 ? sessionSecret : generatePassword() + generatePassword();
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  const whitelistApiKey = process.env.WHITELIST_API_KEY || '';
  const loginByUser = new AttemptLimiter(8, 10 * 60 * 1000);
  const loginByIp = new AttemptLimiter(40, 10 * 60 * 1000);
  const recoveryByIp = new AttemptLimiter(3, 15 * 60 * 1000);
  const resetByIp = new AttemptLimiter(5, 15 * 60 * 1000);
  const revokedTokens = new Map<string, number>();

  // CORS nur für ausdrücklich erlaubte Herkunft (ALLOWED_ORIGINS). Gleiche Herkunft braucht keins.
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Api-Key');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  const PUBLIC_ROUTES = new Set([
    'GET /api/health',
    'GET /api/v1/health',
    'POST /api/auth/login',
    'POST /api/auth/recovery/request',
    'POST /api/auth/recovery/reset'
  ]);
  const WHITELIST_ROUTES = new Set([
    'GET /api/v1/whitelist/verify',
    'GET /api/whitelist/verify'
  ]);
  const smallJson = express.json({ limit: '16kb' });
  const examAutosaveJson = express.json({ limit: '64kb' });
  const standardJson = express.json({ limit: '1mb' });
  const largeJson = express.json({ limit: '25mb' });

  // Schritt 1: Sitzung prüfen. Ohne gültiges Token gibt es nur die öffentlichen Routen.
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
      next();
      return;
    }
    const routeKey = `${req.method} ${req.path}`;
    if (PUBLIC_ROUTES.has(routeKey)) {
      smallJson(req, res, next);
      return;
    }

    // Die Whitelist-Abfrage darf auch ein Server mit API-Key stellen (z. B. die Roblox-Anbindung).
    if (WHITELIST_ROUTES.has(routeKey) && whitelistApiKey) {
      const key = req.headers['x-api-key'];
      if (typeof key === 'string' && safeEqual(key, whitelistApiKey)) {
        next();
        return;
      }
    }

    const token = extractBearerToken(req.headers.authorization);
    // Die UID aus dem Token dient zunächst nur zum Kontonachschlagen. Erst danach
    // wird die Signatur inklusive Session-Version gegen den gespeicherten Account geprüft.
    const tokenUid = token ? readSessionUid(token) : null;
    const account = tokenUid ? peekDatabase().accounts.find(a => a.uid === tokenUid) : undefined;
    const uid = account && token
      ? verifySessionToken(token, SESSION_SECRET, Date.now(), account.sessionVersion ?? 0)
      : null;
    if (!token || !uid || !account || revokedTokens.has(tokenSignature(token))) {
      res.status(401).json({ error: 'Nicht angemeldet oder Sitzung abgelaufen.' });
      return;
    }
    const status = account.publicProfile.whitelistStatus;
    if (status === 'suspended' || status === 'revoked') {
      res.status(403).json({ error: 'Dieses Dienstkonto ist gesperrt.' });
      return;
    }
    res.locals.sessionUid = uid;
    res.locals.sessionToken = token;
    next();
  });

  // Schritt 2: Body lesen. Nur angemeldete Nutzer dürfen große Uploads (PDF-Handbücher) schicken.
  app.use('/api', (req, res, next) => {
    const bodyPolicy = getAuthenticatedApiBodyPolicy(req.method, req.path);
    if (bodyPolicy === 'exam-autosave' || bodyPolicy === 'exam-submit') {
      res.locals.examRequestReceivedAtMs = Date.now();
    }
    if (PUBLIC_ROUTES.has(`${req.method} /api${req.path}`) || !res.locals.sessionUid) {
      next();
      return;
    }
    if (bodyPolicy === 'exam-autosave') {
      examAutosaveJson(req, res, next);
      return;
    }
    if (bodyPolicy === 'exam-submit') {
      smallJson(req, res, next);
      return;
    }
    if (bodyPolicy === 'large') {
      largeJson(req, res, next);
      return;
    }
    standardJson(req, res, next);
  });

  // Schritt 3: Der Client darf nur sich selbst als Absender angeben.
  app.use('/api', (req, res, next) => {
    const sessionUid = res.locals.sessionUid as string | undefined;
    if (!sessionUid) {
      next();
      return;
    }
    const mismatch = findIdentityMismatch(sessionUid, req.query, req.body);
    if (mismatch) {
      res.status(403).json({ error: 'Die Kennung stimmt nicht mit der angemeldeten Sitzung überein.' });
      return;
    }
    next();
  });

  // Während Backup/Restore werden alle prüfungsbezogenen Schreibwege serverseitig pausiert.
  app.use('/api', async (req, res, next) => {
    const isExamWrite =
      (req.method === 'POST' && req.path === '/requests' && req.body?.category === 'exam_workshop_access') ||
      (req.method === 'PUT' && /^\/requests\/[^/]+\/review$/.test(req.path) &&
        (peekDatabase().requests || []).some(item => item.id === req.path.split('/')[2] && item.category === 'exam_workshop_access')) ||
      (req.method === 'POST' && (
        [
          '/academy/exams',
          '/academy/instructor-grade',
          '/progress',
          '/admin/exams',
          '/admin/exams/legacy-verifications',
          '/admin/exams/migrate-legacy'
        ].includes(req.path) ||
        /^\/academy\/exams\/[^/]+\/attempts\/[^/]+\/(submit|grade)$/.test(req.path) ||
        /^\/admin\/exams\/[^/]+\/publish$/.test(req.path)
      )) ||
      (req.method === 'PUT' && (
        /^\/academy\/exams\/[^/]+$/.test(req.path) ||
        /^\/workshop\/exams\/[^/]+$/.test(req.path)
      )) ||
      (req.method === 'POST' && (
        req.path === '/workshop/exams' ||
        /^\/admin\/exams\/[^/]+\/archive$/.test(req.path) ||
        /^\/workshop\/exams\/[^/]+\/(comments|publication-request)$/.test(req.path) ||
        /^\/admin\/exam-workshop\/publication-requests\/[^/]+\/(approve)$/.test(req.path) ||
        /^\/workshop\/exams\/[^/]+\/publish$/.test(req.path)
      )) ||
      (req.method === 'PUT' && /^\/admin\/exam-workshop\/publication-requests\/[^/]+\/decision$/.test(req.path)) ||
      (req.method === 'DELETE' && req.path.startsWith('/academy/exams/'));
    if (!isExamWrite) {
      next();
      return;
    }
    try {
      if (examMaintenanceActive || await getExamRepository().isMaintenanceMode()) {
        res.status(503).json({
          error: 'Prüfungsfunktionen sind wegen einer laufenden Datensicherung oder Wiederherstellung vorübergehend pausiert.'
        });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  });

  if (!academyRepository) throw new Error('ACADEMY_REPOSITORY_NOT_INITIALIZED');
  app.use('/api/academy', async (_req, res, next) => {
    try {
      if (examMaintenanceActive || await getExamRepository().isMaintenanceMode()) {
        res.status(503).json({ error: 'Die Academy ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  }, createAcademyApiRouter(
    academyRepository,
    uid => {
      const account = peekDatabase().accounts.find(item => item.uid === uid);
      return account ? {
        uid: account.uid,
        role: account.publicProfile.role,
        canGradeAssignedCourses: (account.publicProfile.granularPermissions || getDefaultGranularPermissions(account.publicProfile.role)).canGradeAssignedCourses,
        assignedCourseCodes: (account.publicProfile.granularPermissions || getDefaultGranularPermissions(account.publicProfile.role)).assignedCourseCodes
      } : null;
    },
    async (actorUid, actionTitle, targetLabel, details, category = 'ACADEMY_DOC') => {
      const state = loadDatabase();
      const actor = state.accounts.find(item => item.uid === actorUid);
      if (!actor) throw new Error('ACADEMY_AUDIT_ACTOR_MISSING');
      appendAuditLog(state, actor, category, actionTitle, targetLabel, details);
      await saveDatabaseAndWait(state);
    }
  ));

  // ==========================================================================
  // ADMIN EXAM WORKSHOP API — ausschließlich für den Admin-Account
  // ==========================================================================

  function getExamWorkshopAccount(res: express.Response): StoredAccountRecord | null {
    const sessionUid = res.locals.sessionUid as string | undefined;
    if (!sessionUid) return null;
    return peekDatabase().accounts.find(account => account.uid === sessionUid) || null;
  }

  function getExamWorkshopActor(res: express.Response) {
    const account = getExamWorkshopAccount(res);
    return account ? { account, actor: resolveExamWorkshopActor(account) } : null;
  }

  function getExamWorkshopAdmin(res: express.Response) {
    const sessionUid = res.locals.sessionUid as string | undefined;
    if (!sessionUid) return null;
    const dbState = peekDatabase();
    const caller = dbState.accounts.find(account => account.uid === sessionUid);
    return caller?.publicProfile.role === 'admin' ? caller : null;
  }

  async function examWorkshopMaintenanceActive(): Promise<boolean> {
    return examMaintenanceActive || await getExamRepository().isMaintenanceMode();
  }

  function recordExamWorkshopAudit(actorUid: string, action: string, target: string, details: string): void {
    const dbState = loadDatabase();
    const actor = dbState.accounts.find(account => account.uid === actorUid);
    if (!actor) return;
    appendAuditLog(dbState, actor, 'EXAM_WORKSHOP', action, target, details.slice(0, 1000));
    saveDatabase(dbState);
  }

  app.get('/api/admin/exams', async (_req, res, next) => {
    try {
      if (!getExamWorkshopAdmin(res)) {
        res.status(403).json({ error: 'Die Prüfungswerkstatt ist ausschließlich dem Administrator vorbehalten.' });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      const exams = await getExamRepository().list('exam_masters');
      exams.sort((a, b) => String(b.updatedIso ?? '').localeCompare(String(a.updatedIso ?? '')));
      res.json({ exams: exams.map(exam => projectExamWorkshopMaster(exam, true)) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/exams/:id', async (req, res, next) => {
    try {
      if (!getExamWorkshopAdmin(res)) {
        res.status(403).json({ error: 'Die Prüfungswerkstatt ist ausschließlich dem Administrator vorbehalten.' });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      const exam = await getExamRepository().get('exam_masters', req.params.id);
      if (!exam) {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      res.json({ exam: projectExamWorkshopMaster(exam, true) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/exams', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const caller = getExamWorkshopAdmin(res);
      if (!caller) {
        res.status(403).json({ error: 'Nur der Administrator darf Prüfungen in der Werkstatt anlegen.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Die Prüfungswerkstatt ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const master = await createExamDraft(
        getExamRepository(),
        newId('exam'),
        caller.uid,
        req.body?.definition
      );
      recordExamWorkshopAudit(caller.uid, 'Prüfungsentwurf erstellt', String(master.id), 'Neuer Entwurf angelegt.');
      res.status(201).json({ exam: master });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('EXAM_WORKSHOP_INPUT_INVALID:')) {
        res.status(400).json({ error: 'Die Prüfungsdaten enthalten ungültige oder unzulässige Angaben.' });
        return;
      }
      next(error);
    }
  });

  app.put('/api/academy/exams/:id', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const caller = getExamWorkshopAdmin(res);
      if (!caller) {
        res.status(403).json({ error: 'Nur der Administrator darf Prüfungsentwürfe bearbeiten.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Die Prüfungswerkstatt ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const exam = await updateExamDraft(
        getExamRepository(),
        req.params.id,
        caller.uid,
        req.body?.definition
      );
      await refreshPendingExamPublicationRequest(getExamRepository(), req.params.id);
      res.json({ exam });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('EXAM_WORKSHOP_INPUT_INVALID:')) {
        res.status(400).json({ error: 'Die Prüfungsdaten enthalten ungültige oder unzulässige Angaben.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_DOCUMENT_NOT_FOUND') {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_MASTER_ARCHIVED') {
        res.status(409).json({ error: 'Archivierte Prüfungen können nicht bearbeitet werden.' });
        return;
      }
      next(error);
    }
  });

  app.post('/api/admin/exams/:id/publish', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const caller = getExamWorkshopAdmin(res);
      if (!caller) {
        res.status(403).json({ error: 'Nur der Administrator darf Prüfungen veröffentlichen.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Die Prüfungswerkstatt ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const result = await publishExamDraft(getExamRepository(), req.params.id, caller.uid);
      recordExamWorkshopAudit(caller.uid, 'Prüfung veröffentlicht', `${req.params.id} — ${(result.master as ExamDocument).title || 'Unbenannte Prüfung'}`, `Version ${result.version.versionNumber} veröffentlicht.`);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'EXAM_DOCUMENT_NOT_FOUND') {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_MASTER_ARCHIVED') {
        res.status(409).json({ error: 'Archivierte Prüfungen können nicht veröffentlicht werden.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_LEGACY_FORMAT_NOT_PUBLISHABLE') {
        res.status(409).json({ error: 'Historische interaktive Prüfungen können nicht über die neue Werkstatt veröffentlicht werden.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_PUBLICATION_VALIDATION_FAILED') {
        const validation = (error as Error & { validation?: unknown }).validation;
        res.status(422).json({ error: 'Die Prüfung ist noch nicht veröffentlichungsfähig.', validation });
        return;
      }
      if (error instanceof Error && (
        error.message === 'EXAM_VERSION_SEQUENCE_INVALID' ||
        error.message === 'EXAM_DOCUMENT_ALREADY_EXISTS'
      )) {
        res.status(409).json({ error: 'Die Prüfungsversion konnte wegen eines Versionskonflikts nicht veröffentlicht werden. Bitte lade den aktuellen Stand neu.' });
        return;
      }
      next(error);
    }
  });

  app.post('/api/admin/exams/:id/archive', async (req, res, next) => {
    try {
      const reviewer = getExamWorkshopAdmin(res);
      if (!reviewer) {
        res.status(403).json({ error: 'Nur der Administrator darf Prüfungen archivieren.' });
        return;
      }
      const reason = req.body?.reason;
      if (typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 1000) {
        res.status(400).json({ error: 'Bitte gib einen Archivierungsgrund mit höchstens 1.000 Zeichen ein.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Die Prüfungswerkstatt ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const exam = await archiveExamMaster(getExamRepository(), req.params.id,
        { uid: reviewer.uid, displayName: reviewer.publicProfile.displayName }, reason);
      recordExamWorkshopAudit(reviewer.uid, 'Prüfung archiviert', `${exam.id} — ${exam.title || 'Unbenannte Prüfung'}`, reason);
      res.json({ exam: projectExamWorkshopMaster(exam, true) });
    } catch (error) {
      sendExamWorkshopGovernanceError(error, res, next);
    }
  });

  // ==========================================================================
  // GRANULAR EXAM WORKSHOP API — authorization is resolved from the session.
  // Admin-only management routes above remain available to the administrator.
  // ==========================================================================

  app.get('/api/workshop/exams', async (_req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const context = getExamWorkshopActor(res);
      if (!context || !hasExamWorkshopAccess(context.actor)) {
        res.status(403).json({ error: 'Kein Zugang zur Prüfungswerkstatt.' });
        return;
      }
      const exams = await getExamRepository().list('exam_masters');
      const visible = exams.filter(exam =>
        (exam.assessmentStage === 'test' || exam.assessmentStage === 'final_exam') &&
        canAccessExamWorkshopExam(context.actor, exam.assessmentStage, 'view', exam.id)
      );
      visible.sort((a, b) => String(b.updatedIso ?? '').localeCompare(String(a.updatedIso ?? '')));
      res.json({ exams: visible.map(exam => projectExamWorkshopMaster(exam, context.actor.role === 'admin', SESSION_SECRET)) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/workshop/exams/:id', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const context = getExamWorkshopActor(res);
      if (!context || !hasExamWorkshopAccess(context.actor)) {
        res.status(403).json({ error: 'Kein Zugang zur Prüfungswerkstatt.' });
        return;
      }
      const exam = await getExamRepository().get('exam_masters', req.params.id);
      if (!exam || (exam.assessmentStage !== 'test' && exam.assessmentStage !== 'final_exam') ||
          !canAccessExamWorkshopExam(context.actor, exam.assessmentStage, 'view', exam.id)) {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      res.json({ exam: projectExamWorkshopMaster(exam, context.actor.role === 'admin', SESSION_SECRET) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/workshop/exams', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const context = getExamWorkshopActor(res);
      if (!context || !hasExamWorkshopAccess(context.actor)) {
        res.status(403).json({ error: 'Kein Zugang zur Prüfungswerkstatt.' });
        return;
      }
      const stage = req.body?.definition?.assessmentStage;
      if (stage !== 'test' && stage !== 'final_exam') {
        res.status(400).json({ error: 'Die Prüfungsart ist ungültig.' });
        return;
      }
      if (!canAccessExamWorkshopExam(context.actor, stage, 'create')) {
        res.status(403).json({ error: 'Du darfst in diesem Bereich keine Prüfungen erstellen.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Die Prüfungswerkstatt ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const exam = await createExamDraft(
        getExamRepository(),
        newId('exam'),
        context.account.uid,
        req.body.definition
      );
      recordExamWorkshopAudit(context.account.uid, 'Prüfungsentwurf erstellt', String(exam.id), 'Neuer Entwurf angelegt.');
      res.status(201).json({ exam: projectExamWorkshopMaster(exam, context.actor.role === 'admin', SESSION_SECRET) });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('EXAM_WORKSHOP_INPUT_INVALID:')) {
        res.status(400).json({ error: 'Die Prüfungsdaten enthalten ungültige oder unzulässige Angaben.' });
        return;
      }
      next(error);
    }
  });

  app.put('/api/workshop/exams/:id', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const context = getExamWorkshopActor(res);
      if (!context || !hasExamWorkshopAccess(context.actor)) {
        res.status(403).json({ error: 'Kein Zugang zur Prüfungswerkstatt.' });
        return;
      }
      const existing = await getExamRepository().get('exam_masters', req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      if (existing.assessmentStage !== 'test' && existing.assessmentStage !== 'final_exam') {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      const isOwnUnpublishedDraft =
        existing.status === 'draft' &&
        !existing.currentPublishedVersionId &&
        existing.authorUid === context.account.uid;
      const action = isOwnUnpublishedDraft ? 'edit' : 'update_existing';
      if (!canAccessExamWorkshopExam(context.actor, existing.assessmentStage, action, existing.id)) {
        res.status(403).json({ error: 'Du darfst diese bestehende Prüfung nicht bearbeiten.' });
        return;
      }
      const expectedRevision = req.body?.expectedRevision;
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
        res.status(400).json({ error: 'Die Prüfungsrevision fehlt oder ist ungültig. Bitte lade die Prüfung erneut.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Die Prüfungswerkstatt ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const definition = context.actor.role === 'admin'
        ? req.body?.definition
        : restoreDelegatedMatchingIds(req.body?.definition, existing, SESSION_SECRET);
      const exam = await updateExamDraft(
        getExamRepository(),
        req.params.id,
        context.account.uid,
        definition,
        undefined,
        expectedRevision,
        context.actor.role !== 'admin'
      );
      await refreshPendingExamPublicationRequest(getExamRepository(), req.params.id);
      recordExamWorkshopAudit(context.account.uid, 'Prüfung geändert', `${exam.id} — ${exam.title || 'Unbenannte Prüfung'}`, `Arbeitsrevision ${exam.workingRevision} gespeichert.`);
      res.json({ exam: projectExamWorkshopMaster(exam, context.actor.role === 'admin', SESSION_SECRET) });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('EXAM_WORKSHOP_INPUT_INVALID:')) {
        res.status(400).json({ error: 'Die Prüfungsdaten enthalten ungültige oder unzulässige Angaben.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_DOCUMENT_NOT_FOUND') {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_MASTER_ARCHIVED') {
        res.status(409).json({ error: 'Archivierte Prüfungen können nicht bearbeitet werden.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_WORKING_REVISION_CONFLICT') {
        res.status(409).json({ error: 'Die Prüfung wurde zwischenzeitlich geändert. Bitte lade die aktuelle Version und übertrage deine Änderungen erneut.' });
        return;
      }
      if (error instanceof Error && error.message === 'EXAM_ASSESSMENT_STAGE_IMMUTABLE') {
        res.status(409).json({ error: 'Die Prüfungsart kann nach dem Erstellen nicht mehr geändert werden.' });
        return;
      }
      next(error);
    }
  });

  function sendExamWorkshopGovernanceError(error: unknown, res: express.Response, next: express.NextFunction) {
    const code = error instanceof Error ? error.message : '';
    const responses: Record<string, { status: number; message: string }> = {
      EXAM_DOCUMENT_NOT_FOUND: { status: 404, message: 'Prüfung nicht gefunden.' },
      EXAM_MASTER_ARCHIVED: { status: 409, message: 'Archivierte Prüfungen können nicht bearbeitet werden.' },
      EXAM_WORKING_REVISION_CONFLICT: { status: 409, message: 'Die Prüfung wurde zwischenzeitlich geändert. Bitte lade die aktuelle Version neu.' },
      EXAM_PUBLICATION_REQUEST_PENDING: { status: 409, message: 'Für diese Prüfung liegt bereits ein offener Freigabeantrag vor.' },
      EXAM_PUBLICATION_REQUEST_NOT_FOUND: { status: 404, message: 'Freigabeantrag nicht gefunden.' },
      EXAM_PUBLICATION_REQUEST_NOT_PENDING: { status: 409, message: 'Dieser Freigabeantrag ist nicht mehr offen.' },
      EXAM_PUBLICATION_REQUEST_REVISION_CONFLICT: { status: 409, message: 'Der Freigabeantrag bezieht sich nicht mehr auf den aktuellen Prüfungsstand.' },
      EXAM_PUBLICATION_REQUEST_DUPLICATE_PENDING: { status: 409, message: 'Für diese Prüfung existieren mehrere offene Freigabeanträge.' },
      EXAM_COMMENT_INVALID: { status: 400, message: 'Der Kommentar ist ungültig oder zu lang.' },
      EXAM_ASSESSMENT_STAGE_INVALID: { status: 400, message: 'Die Prüfungsart ist ungültig.' },
      EXAM_LEGACY_FORMAT_NOT_PUBLISHABLE: { status: 409, message: 'Historische interaktive Prüfungen können nicht über die neue Werkstatt veröffentlicht werden.' },
      EXAM_VERSION_SEQUENCE_INVALID: { status: 409, message: 'Die Prüfungsversion konnte wegen eines Versionskonflikts nicht veröffentlicht werden.' },
      EXAM_NO_UNPUBLISHED_CHANGES: { status: 409, message: 'Seit der letzten Veröffentlichung gibt es keine inhaltlichen Änderungen.' },
      EXAM_DOCUMENT_ALREADY_EXISTS: { status: 409, message: 'Die Prüfungsversion existiert bereits.' }
    };
    const response = responses[code];
    if (response) {
      res.status(response.status).json({ error: response.message });
      return;
    }
    if (code === 'EXAM_PUBLICATION_VALIDATION_FAILED') {
      res.status(422).json({
        error: 'Die Prüfung ist noch nicht veröffentlichungsfähig.',
        validation: (error as Error & { validation?: unknown }).validation
      });
      return;
    }
    next(error);
  }

  function getExamWorkshopExamAction(
    context: ReturnType<typeof getExamWorkshopActor>,
    exam: ExamDocument
  ): 'edit' | 'update_existing' | null {
    if (!context) return null;
    const ownDraft =
      exam.status === 'draft' &&
      !exam.currentPublishedVersionId &&
      exam.authorUid === context.account.uid;
    return ownDraft ? 'edit' : 'update_existing';
  }

  app.get('/api/workshop/exams/:id/comments', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const context = getExamWorkshopActor(res);
      const exam = await getExamRepository().get('exam_masters', req.params.id);
      if (!context || !exam || (exam.assessmentStage !== 'test' && exam.assessmentStage !== 'final_exam') ||
          !hasExamWorkshopAccess(context.actor) ||
          !canAccessExamWorkshopExam(context.actor, exam.assessmentStage, 'view', exam.id)) {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      res.json({ comments: await listExamComments(getExamRepository(), exam.id) });
    } catch (error) {
      sendExamWorkshopGovernanceError(error, res, next);
    }
  });

  app.post('/api/workshop/exams/:id/comments', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const context = getExamWorkshopActor(res);
      const exam = await getExamRepository().get('exam_masters', req.params.id);
      if (!context || !exam || (exam.assessmentStage !== 'test' && exam.assessmentStage !== 'final_exam') ||
          !hasExamWorkshopAccess(context.actor) ||
          !canAccessExamWorkshopExam(context.actor, exam.assessmentStage, 'view', exam.id)) {
        res.status(403).json({ error: 'Du darfst für diese Prüfung keine Kommentare abgeben.' });
        return;
      }
      if (exam.status === 'archived') {
        res.status(409).json({ error: 'Archivierte Prüfungen sind schreibgeschützt.' });
        return;
      }
      const comment = await addExamComment(
        getExamRepository(),
        exam.id,
        { uid: context.account.uid, displayName: context.account.publicProfile.displayName || context.account.username },
        req.body?.body
      );
      const dbState = loadDatabase();
      const author = dbState.accounts.find(account => account.uid === context.account.uid);
      if (author) {
        appendAuditLog(dbState, author, 'EXAM_WORKSHOP', 'Kommentar zur Prüfung erstellt', `${exam.id} — ${exam.title || 'Unbenannte Prüfung'}`, 'Kommentar im Prüfungsverlauf erstellt.');
        saveDatabase(dbState);
      }
      res.status(201).json({ comment });
    } catch (error) {
      sendExamWorkshopGovernanceError(error, res, next);
    }
  });

  app.post('/api/workshop/exams/:id/publication-request', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const context = getExamWorkshopActor(res);
      const exam = await getExamRepository().get('exam_masters', req.params.id);
      if (!context || !exam || (exam.assessmentStage !== 'test' && exam.assessmentStage !== 'final_exam') ||
          !hasExamWorkshopAccess(context.actor)) {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      const action = getExamWorkshopExamAction(context, exam);
      if (!action || !canAccessExamWorkshopExam(context.actor, exam.assessmentStage, action, exam.id)) {
        res.status(403).json({ error: 'Du darfst diese Prüfung nicht zur Veröffentlichung einreichen.' });
        return;
      }
      const expectedRevision = req.body?.expectedRevision;
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
        res.status(400).json({ error: 'Die Prüfungsrevision fehlt oder ist ungültig. Bitte lade die Prüfung erneut.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Die Prüfungswerkstatt ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const requiresApproval = examWorkshopPublicationRequiresApproval(
        context.actor,
        exam.assessmentStage,
        Boolean(exam.currentPublishedVersionId)
      );
      if (requiresApproval) {
        const request = await submitExamPublicationRequest(
          getExamRepository(),
          exam.id,
          { uid: context.account.uid, displayName: context.account.publicProfile.displayName || context.account.username },
          expectedRevision
        );
        recordExamWorkshopAudit(context.account.uid, 'Veröffentlichungsantrag eingereicht', `${exam.id} — ${exam.title || 'Unbenannte Prüfung'}`, `Revision ${request.submittedRevision}; Antrag ${request.id}.`);
        res.status(202).json({ requiresApproval: true, request });
        return;
      }
      const result = await publishExamDraft(
        getExamRepository(), exam.id, context.account.uid, new Date().toISOString(), undefined, expectedRevision
      );
      recordExamWorkshopAudit(context.account.uid, 'Prüfung veröffentlicht', `${result.master.id} — ${(result.master as ExamDocument).title || 'Unbenannte Prüfung'}`, `Version ${result.version.versionNumber} veröffentlicht.`);
      res.json(context.actor.role === 'admin'
        ? { requiresApproval: false, ...result }
        : {
            requiresApproval: false,
            master: projectExamWorkshopMaster(result.master, false, SESSION_SECRET),
            version: {
              id: result.version.id,
              examId: result.version.examId,
              versionNumber: result.version.versionNumber,
              publishedAtIso: result.version.publishedAtIso
            }
          });
    } catch (error) {
      sendExamWorkshopGovernanceError(error, res, next);
    }
  });

  app.get('/api/admin/exam-workshop/publication-requests', async (_req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      if (!getExamWorkshopAdmin(res)) {
        res.status(403).json({ error: 'Nur der Administrator darf Freigabeanträge einsehen.' });
        return;
      }
      const requests = await listExamPublicationRequests(getExamRepository());
      res.json({ requests });
    } catch (error) {
      sendExamWorkshopGovernanceError(error, res, next);
    }
  });

  app.post('/api/admin/exam-workshop/publication-requests/:id/approve', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const reviewer = getExamWorkshopAdmin(res);
      if (!reviewer) {
        res.status(403).json({ error: 'Nur der Administrator darf Freigabeanträge genehmigen.' });
        return;
      }
      const request = await getExamRepository().get('exam_publication_requests', req.params.id) as ExamPublicationRequestDocument | null;
      if (!request) {
        res.status(404).json({ error: 'Freigabeantrag nicht gefunden.' });
        return;
      }
      const result = await publishExamDraft(
        getExamRepository(),
        request.examId,
        reviewer.uid,
        new Date().toISOString(),
        {
          requestId: request.id,
          reviewerName: reviewer.publicProfile.displayName,
          reviewComment: typeof req.body?.reviewComment === 'string' ? req.body.reviewComment : ''
        }
      );
      recordExamWorkshopAudit(reviewer.uid, 'Veröffentlichung genehmigt', `${request.examId} — ${(result.master as ExamDocument).title || 'Unbenannte Prüfung'}`, `Antrag ${request.id}; Version ${result.version.versionNumber}.`);
      res.json({ request: await getExamRepository().get('exam_publication_requests', request.id), ...result });
    } catch (error) {
      sendExamWorkshopGovernanceError(error, res, next);
    }
  });

  app.put('/api/admin/exam-workshop/publication-requests/:id/decision', async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const reviewer = getExamWorkshopAdmin(res);
      if (!reviewer) {
        res.status(403).json({ error: 'Nur der Administrator darf Freigabeanträge entscheiden.' });
        return;
      }
      const decision = req.body?.decision;
      if (decision !== 'returned' && decision !== 'rejected' && decision !== 'archived') {
        res.status(400).json({ error: 'Die Entscheidung ist ungültig.' });
        return;
      }
      if (typeof req.body?.reviewComment !== 'string' || req.body.reviewComment.trim().length < 3 || req.body.reviewComment.length > 1000) {
        res.status(400).json({ error: 'Bitte gib eine nachvollziehbare Begründung mit höchstens 1.000 Zeichen ein.' });
        return;
      }
      const request = await updateExamPublicationRequestDecision(
        getExamRepository(),
        req.params.id,
        { uid: reviewer.uid, displayName: reviewer.publicProfile.displayName },
        decision,
        typeof req.body?.reviewComment === 'string' ? req.body.reviewComment : ''
      );
      recordExamWorkshopAudit(reviewer.uid, decision === 'returned' ? 'Prüfung zur Überarbeitung zurückgegeben' : decision === 'rejected' ? 'Veröffentlichung abgelehnt' : 'Prüfung archiviert', request.examId, `Antrag ${request.id}; ${request.reviewComment || 'Begründung nicht angegeben.'}`);
      res.json({ request });
    } catch (error) {
      sendExamWorkshopGovernanceError(error, res, next);
    }
  });

  function getExamParticipant(res: express.Response) {
    const sessionUid = res.locals.sessionUid as string | undefined;
    if (!sessionUid) return null;
    const account = peekDatabase().accounts.find(record => record.uid === sessionUid);
    if (!account) return null;
    return {
      uid: account.uid,
      displayName: account.publicProfile.displayName || account.username,
      clearanceLevel: account.publicProfile.clearanceLevel
    };
  }

  function sendExamAttemptError(error: unknown, res: express.Response, next: express.NextFunction) {
    const code = error instanceof Error ? error.message : '';
    const responses: Record<string, { status: number; message: string }> = {
      EXAM_DOCUMENT_NOT_FOUND: { status: 404, message: 'Prüfung nicht gefunden.' },
      EXAM_PARTICIPANT_INVALID: { status: 403, message: 'Das Teilnehmerkonto konnte nicht verifiziert werden.' },
      EXAM_ATTEMPT_COURSE_INVALID: { status: 400, message: 'Bitte wähle einen gültigen Lehrgang aus.' },
      EXAM_REQUEST_TIME_INVALID: { status: 400, message: 'Die Anfrage konnte zeitlich nicht verarbeitet werden.' },
      EXAM_NOT_STARTABLE: { status: 409, message: 'Diese Prüfung ist derzeit nicht zur Teilnahme freigegeben.' },
      EXAM_COURSE_NOT_ASSIGNED: { status: 403, message: 'Diese Prüfung ist dem ausgewählten Lehrgang nicht zugewiesen.' },
      EXAM_CLEARANCE_INSUFFICIENT: { status: 403, message: 'Deine aktuelle Freigabestufe reicht für diese Prüfung nicht aus.' },
      EXAM_PUBLISHED_VERSION_INVALID: { status: 409, message: 'Die veröffentlichte Prüfungsversion ist derzeit nicht verfügbar.' },
      EXAM_ATTEMPT_SNAPSHOT_INVALID: { status: 409, message: 'Der gespeicherte Prüfungsversuch ist nicht konsistent. Bitte wende dich an den Administrator.' },
      EXAM_ATTEMPT_LIMIT_REACHED: { status: 409, message: 'Das zulässige Versuchskontingent für diesen Lehrgang ist ausgeschöpft.' },
      EXAM_PREREQUISITE_NOT_MET: { status: 403, message: 'Die Voraussetzungen für diese Prüfung sind noch nicht erfüllt.' },
      ACTIVE_ATTEMPT_DIFFERENT_COURSE: { status: 409, message: 'Für diese Prüfung läuft bereits ein Versuch in einem anderen Lehrgang. Dieser Versuch kann nicht übertragen werden.' },
      EXAM_MULTIPLE_ACTIVE_ATTEMPTS: { status: 409, message: 'Es besteht ein widersprüchlicher aktiver Prüfungsstatus. Bitte wende dich an den Administrator.' },
      EXAM_ATTEMPT_HISTORY_LIMIT: { status: 503, message: 'Die Prüfungshistorie ist zu umfangreich, um das Versuchskontingent sicher zu prüfen. Bitte wende dich an den Administrator.' },
      EXAM_ATTEMPT_LIMIT_INVALID: { status: 409, message: 'Die Versuchseinstellungen dieser Prüfung sind ungültig. Bitte wende dich an den Administrator.' },
      EXAM_EXTRA_ATTEMPTS_INVALID: { status: 409, message: 'Die administrativen Versuchseinstellungen sind ungültig. Bitte wende dich an den Administrator.' },
      EXAM_PREREQUISITE_INVALID: { status: 409, message: 'Die Prüfungsvoraussetzungen sind ungültig. Bitte wende dich an den Administrator.' },
      EXAM_MANUAL_UNLOCKS_INVALID: { status: 409, message: 'Die Freigabeeinstellungen dieser Prüfung sind ungültig. Bitte wende dich an den Administrator.' },
      EXAM_TIME_LIMIT_INVALID: { status: 409, message: 'Das Zeitlimit dieser Prüfung ist ungültig. Bitte wende dich an den Administrator.' },
      EXAM_ATTEMPT_ID_INVALID: { status: 500, message: 'Der Prüfungsversuch konnte nicht angelegt werden.' },
      EXAM_ATTEMPT_NOT_FOUND: { status: 404, message: 'Prüfungsversuch nicht gefunden.' },
      EXAM_REVIEW_NOT_PENDING: { status: 409, message: 'Dieser Versuch wartet nicht mehr auf eine manuelle Bewertung.' },
      EXAM_REVIEW_CORRECTION_NOT_COMPLETED: { status: 409, message: 'Dieser Versuch hat keine abgeschlossene manuelle Bewertung, die korrigiert werden kann.' },
      EXAM_REVIEW_CORRECTION_REASON_INVALID: { status: 400, message: 'Bitte gib eine nachvollziehbare Korrekturbegründung mit mindestens 10 Zeichen ein.' },
      EXAM_REVIEW_CORRECTION_TIME_INVALID: { status: 400, message: 'Der Korrekturzeitpunkt ist ungültig.' },
      EXAM_REVIEW_CORRECTION_LIMIT: { status: 409, message: 'Für diesen Prüfungsversuch wurde die maximale Zahl an Korrekturen erreicht.' },
      EXAM_ATTEMPT_CORRECTION_INVALID: { status: 409, message: 'Die Korrekturhistorie des Prüfungsversuchs ist ungültig.' },
      EXAM_SELF_REVIEW_FORBIDDEN: { status: 403, message: 'Du darfst deinen eigenen Prüfungsversuch nicht bewerten.' },
      EXAM_MANUAL_GRADES_INVALID: { status: 400, message: 'Die manuelle Bewertung enthält ungültige Punkte oder Fragen.' },
      EXAM_MANUAL_GRADES_INCOMPLETE: { status: 400, message: 'Bitte bewerte alle offenen Freitextfragen.' },
      EXAM_ATTEMPT_FORBIDDEN: { status: 403, message: 'Du darfst nur deinen eigenen Prüfungsversuch speichern.' },
      EXAM_ATTEMPT_NOT_ACTIVE: { status: 409, message: 'Dieser Prüfungsversuch ist nicht mehr aktiv.' },
      EXAM_REVISION_INVALID: { status: 400, message: 'Die Autosave-Revision ist ungültig.' },
      EXAM_REVISION_JUMP_INVALID: { status: 409, message: 'Die Autosave-Revision liegt zu weit voraus. Bitte lade den gespeicherten Stand neu.' },
      EXAM_AUTOSAVE_TOO_LARGE: { status: 413, message: 'Die zu speichernden Antworten überschreiten die zulässige Größe.' },
      EXAM_ANSWERS_INVALID: { status: 400, message: 'Das Antwortformat ist ungültig.' },
      EXAM_ANSWER_QUESTION_UNKNOWN: { status: 400, message: 'Die Antwort enthält eine unbekannte Frage.' },
      EXAM_ANSWER_INVALID: { status: 400, message: 'Eine oder mehrere Antworten sind ungültig.' },
      EXAM_ATTEMPT_REVISION_INVALID: { status: 409, message: 'Der gespeicherte Revisionsstand ist ungültig.' },
      EXAM_ATTEMPT_EXPIRED: { status: 409, message: 'Das Zeitlimit ist abgelaufen. Die verspäteten Antworten wurden nicht gespeichert.' },
      EXAM_ATTEMPT_DEADLINE_INVALID: { status: 409, message: 'Das gespeicherte Zeitlimit ist ungültig.' },
      EXAM_CATALOG_LIMIT: { status: 503, message: 'Der Prüfungskatalog ist derzeit zu umfangreich. Bitte wende dich an den Administrator.' },
      EXAM_CATALOG_SNAPSHOT_INVALID: { status: 503, message: 'Eine veröffentlichte Prüfung ist derzeit nicht verfügbar. Bitte wende dich an den Administrator.' },
      EXAM_CATALOG_ASSIGNMENT_INVALID: { status: 503, message: 'Eine Prüfungszuweisung ist derzeit ungültig. Bitte wende dich an den Administrator.' }
    };
    const response = responses[code];
    if (response) {
      res.status(response.status).json({ error: response.message });
      return;
    }
    next(error);
  }

  app.get('/api/academy/exam-reviews', async (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const sessionUid = res.locals.sessionUid as string | undefined;
      const caller = peekDatabase().accounts.find(account => account.uid === sessionUid);
      const permissions = caller && (caller.publicProfile.granularPermissions || getDefaultGranularPermissions(caller.publicProfile.role));
      const canReviewAnyCourse = Boolean(caller && (
        caller.publicProfile.role === 'admin' || caller.publicProfile.role === 'colonel' ||
        (permissions?.canGradeAssignedCourses && permissions.assignedCourseCodes.length > 0)
      ));
      if (!caller || !canReviewAnyCourse) {
        res.status(403).json({ error: 'Für manuelle Prüfungsbewertungen fehlt die Berechtigung.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) { res.status(503).json({ error: 'Das Prüfungssystem ist vorübergehend pausiert.' }); return; }
      const role = caller.publicProfile.role;
      const allowed = role === 'admin' || role === 'colonel' ? ['*'] : permissions!.assignedCourseCodes;
      res.json({ reviews: await listExamReviews(getExamRepository(), allowed) });
    } catch (error) { sendExamAttemptError(error, res, next); }
  });

  app.post('/api/academy/exams/:id/attempts/:attemptId/grade', async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const sessionUid = res.locals.sessionUid as string | undefined;
      const caller = peekDatabase().accounts.find(account => account.uid === sessionUid);
      const attempt = await getExamRepository().get('exam_attempts', req.params.attemptId);
      if (!caller || !attempt || attempt.examId !== req.params.id) {
        res.status(403).json({ error: 'Für diese Prüfungsbewertung fehlt die Berechtigung.' });
        return;
      }
      if (attempt.userId === caller.uid) throw new Error('EXAM_SELF_REVIEW_FORBIDDEN');
      if (!canActorEditCourseCode(caller, String(attempt.attemptCourseCode || ''))) {
        res.status(403).json({ error: 'Für diese Prüfungsbewertung fehlt die Berechtigung.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) { res.status(503).json({ error: 'Das Prüfungssystem ist vorübergehend pausiert.' }); return; }
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).some(key => key !== 'grades')) {
        res.status(400).json({ error: 'Die Bewertungsanfrage ist ungültig.' }); return;
      }
      const submission = await gradeExamAttempt(getExamRepository(), req.params.id, req.params.attemptId, caller.uid, req.body.grades);
      recordExamWorkshopAudit(caller.uid, 'Freitextprüfung bewertet', req.params.id, `Versuch ${req.params.attemptId} manuell bewertet.`);
      res.json({ submission });
    } catch (error) { sendExamAttemptError(error, res, next); }
  });


  // Nachträgliche Korrekturen abgeschlossener manueller Bewertungen sind Admins und Colonels vorbehalten.
  app.get('/api/academy/exam-review-corrections', async (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const sessionUid = res.locals.sessionUid as string | undefined;
      const caller = peekDatabase().accounts.find(account => account.uid === sessionUid);
      if (!caller || !['admin', 'colonel'].includes(caller.publicProfile.role)) {
        res.status(403).json({ error: 'Nachträgliche Bewertungskorrekturen sind ausschließlich Admins und Colonels vorbehalten.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) { res.status(503).json({ error: 'Das Prüfungssystem ist vorübergehend pausiert.' }); return; }
      res.json({ reviews: await listCompletedManualReviews(getExamRepository()) });
    } catch (error) { sendExamAttemptError(error, res, next); }
  });

  app.post('/api/academy/exams/:id/attempts/:attemptId/correct-review', async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const sessionUid = res.locals.sessionUid as string | undefined;
      const caller = peekDatabase().accounts.find(account => account.uid === sessionUid);
      if (!caller || !['admin', 'colonel'].includes(caller.publicProfile.role)) {
        res.status(403).json({ error: 'Nachträgliche Bewertungskorrekturen sind ausschließlich Admins und Colonels vorbehalten.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) { res.status(503).json({ error: 'Das Prüfungssystem ist vorübergehend pausiert.' }); return; }
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) ||
          Object.keys(req.body).some(key => key !== 'grades' && key !== 'reason')) {
        res.status(400).json({ error: 'Die Korrekturanfrage ist ungültig.' }); return;
      }
      const submission = await correctCompletedExamReview(
        getExamRepository(), req.params.id, req.params.attemptId, caller.uid,
        req.body.grades, req.body.reason
      );
      recordExamWorkshopAudit(caller.uid, 'Manuelle Prüfungsbewertung korrigiert', req.params.id,
        'Versuch ' + req.params.attemptId + ' korrigiert. Begründung: ' + String(req.body.reason).trim().slice(0, 800));
      res.json({ submission });
    } catch (error) { sendExamAttemptError(error, res, next); }
  });

  app.get('/api/academy/exam-results', async (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const participant = getExamParticipant(res);
      if (!participant) { res.status(403).json({ error: 'Das Teilnehmerkonto konnte nicht verifiziert werden.' }); return; }
      if (await examWorkshopMaintenanceActive()) { res.status(503).json({ error: 'Das Prüfungssystem ist vorübergehend pausiert.' }); return; }
      res.json({ results: await listOwnExamResults(getExamRepository(), participant.uid) });
    } catch (error) { sendExamAttemptError(error, res, next); }
  });


  // Teilnehmer erhalten ausschließlich freigegebene Metadaten, niemals Fragen oder Lösungsschlüssel.
  app.get('/api/academy/exams/catalog', async (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const participant = getExamParticipant(res);
      if (!participant) {
        res.status(403).json({ error: 'Das Teilnehmerkonto konnte nicht verifiziert werden.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Das Prüfungssystem ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const exams = await listParticipantExamCatalog(getExamRepository(), participant.clearanceLevel);
      res.json({ exams });
    } catch (error) {
      sendExamAttemptError(error, res, next);
    }
  });

  // Start und Wiederaufnahme liefern ausschließlich die sichere Prüflingsprojektion.
  app.post('/api/academy/exams/:id/start', async (req, res, next) => {
    const requestReceivedAtMs = Date.now();
    res.setHeader('Cache-Control', 'no-store');
    try {
      const participant = getExamParticipant(res);
      if (!participant) {
        res.status(403).json({ error: 'Das Teilnehmerkonto konnte nicht verifiziert werden.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Das Prüfungssystem ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const result = await startExamAttempt(
        getExamRepository(),
        req.params.id,
        participant,
        req.body?.attemptCourseCode,
        requestReceivedAtMs
      );
      res.status(result.created ? 201 : 200).json({
        attempt: projectStartedExamAttempt(result, requestReceivedAtMs)
      });
    } catch (error) {
      sendExamAttemptError(error, res, next);
    }
  });


  app.put('/api/academy/exams/:id/attempts/:attemptId/autosave', async (req, res, next) => {
    const requestReceivedAtMs = Number(res.locals.examRequestReceivedAtMs);
    res.setHeader('Cache-Control', 'no-store');
    try {
      const participant = getExamParticipant(res);
      if (!participant) {
        res.status(403).json({ error: 'Das Teilnehmerkonto konnte nicht verifiziert werden.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Das Prüfungssystem ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const body = req.body;
      if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).some(key => key !== 'revision' && key !== 'answers') ||
        !Object.prototype.hasOwnProperty.call(body, 'revision') ||
        !Object.prototype.hasOwnProperty.call(body, 'answers')
      ) {
        res.status(400).json({ error: 'Die Autosave-Anfrage ist ungültig.' });
        return;
      }
      const result = await saveExamAttemptAnswers(
        getExamRepository(),
        req.params.id,
        req.params.attemptId,
        participant.uid,
        body.revision,
        body.answers,
        Number.isSafeInteger(requestReceivedAtMs) ? requestReceivedAtMs : Date.now()
      );
      if (result.expired) {
        res.status(409).json({
          error: 'Das Zeitlimit ist abgelaufen. Es wurden ausschließlich die zuletzt gespeicherten Antworten ausgewertet.',
          expired: true,
          status: result.finalStatus
        });
        return;
      }
      res.json({
        attempt: result.attempt,
        saved: result.saved,
        stale: result.stale
      });
    } catch (error) {
      sendExamAttemptError(error, res, next);
    }
  });


  // Die Abgabe wertet ausschließlich den letzten serverseitig gespeicherten Autosave-Stand aus.
  app.post('/api/academy/exams/:id/attempts/:attemptId/submit', async (req, res, next) => {
    const requestReceivedAtMs = Number(res.locals.examRequestReceivedAtMs);
    res.setHeader('Cache-Control', 'no-store');
    try {
      const participant = getExamParticipant(res);
      if (!participant) {
        res.status(403).json({ error: 'Das Teilnehmerkonto konnte nicht verifiziert werden.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Das Prüfungssystem ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      // Antworten gehören ausschließlich in den revisionsgesicherten Autosave-Endpunkt.
      // So kann eine Abgabe keine nicht gespeicherten oder nachträglich manipulierten Werte einschleusen.
      if (
        req.body !== undefined &&
        (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length > 0)
      ) {
        res.status(400).json({ error: 'Die Abgabe darf keine Antworten enthalten. Bitte speichere sie zuerst über Autosave.' });
        return;
      }
      const result = await submitExamAttempt(
        getExamRepository(),
        req.params.id,
        req.params.attemptId,
        participant.uid,
        Number.isSafeInteger(requestReceivedAtMs) ? requestReceivedAtMs : Date.now()
      );
      res.status(result.expired ? 409 : 200).json({
        submission: result.submission,
        expired: result.expired,
        alreadySubmitted: result.alreadySubmitted
      });
    } catch (error) {
      sendExamAttemptError(error, res, next);
    }
  });

  app.get('/api/academy/exams/:id/attempt', async (req, res, next) => {
    const requestReceivedAtMs = Date.now();
    res.setHeader('Cache-Control', 'no-store');
    try {
      const participant = getExamParticipant(res);
      if (!participant) {
        res.status(403).json({ error: 'Das Teilnehmerkonto konnte nicht verifiziert werden.' });
        return;
      }
      if (await examWorkshopMaintenanceActive()) {
        res.status(503).json({ error: 'Das Prüfungssystem ist wegen einer Datensicherung oder Wiederherstellung vorübergehend pausiert.' });
        return;
      }
      const attempt = await getActiveExamAttempt(
        getExamRepository(),
        req.params.id,
        participant.uid,
        req.query.attemptCourseCode,
        requestReceivedAtMs
      );
      if (!attempt) {
        res.status(404).json({ error: 'Für diese Prüfung besteht kein aktiver Versuch.' });
        return;
      }
      res.json({ attempt });
    } catch (error) {
      sendExamAttemptError(error, res, next);
    }
  });

  // 1. Health Endpoint (Supports both /api/health and /api/v1/health)
  app.get(['/api/health', '/api/v1/health'], (_req, res) => {
    res.json({
      status: 'operational',
      agency: 'California Department of Justice — POST Officer Portal',
      environment: process.env.NODE_ENV || 'development',
      storage: store ? 'firestore' : 'json',
      appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
      timestamp: new Date().toISOString()
    });
  });

  // Admin-Wiederherstellung: Empfänger und Zielkonto sind ausschließlich serverseitig festgelegt.
  app.post('/api/auth/recovery/request', async (req, res) => {
    const genericMessage = 'Wenn die Wiederherstellung verfügbar ist, erhält der Administrator in Kürze eine E-Mail.';
    const ipKey = `recovery:${req.ip}`;
    const waitMs = recoveryByIp.retryAfterMs(ipKey);
    if (waitMs > 0) {
      res.setHeader('Retry-After', String(Math.ceil(waitMs / 1000)));
      res.status(429).json({ error: 'Zu viele Wiederherstellungsanfragen. Bitte warte einige Minuten.' });
      return;
    }
    recoveryByIp.recordFailure(ipKey);

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.ADMIN_RECOVERY_EMAIL?.trim();
    const appUrl = process.env.APP_URL?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim() || 'RCPD Portal <onboarding@resend.dev>';
    if (!apiKey || !recipient || !appUrl || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      console.error('[Admin-Recovery] Konfiguration unvollständig (Secrets werden nicht protokolliert).');
      res.status(503).json({ error: 'Die Wiederherstellung ist derzeit nicht konfiguriert.' });
      return;
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(appUrl);
      if (baseUrl.protocol !== 'https:' && !(baseUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(baseUrl.hostname))) {
        throw new Error('APP_URL muss HTTPS verwenden.');
      }
    } catch {
      res.status(503).json({ error: 'Die Wiederherstellung ist derzeit nicht korrekt konfiguriert.' });
      return;
    }

    const dbState = loadDatabase();
    const admin = dbState.accounts.find(a => a.uid === 'usr_admin_1' && a.publicProfile.role === 'admin');
    if (!admin) {
      res.json({ ok: true, message: genericMessage });
      return;
    }
    const now = Date.now();
    // Ein bereits versendeter, noch gültiger Link darf niemals durch eine neue Anfrage ungültig werden.
    if (hasActiveRecoveryToken(dbState.adminRecovery?.expiresAt, now)) {
      res.json({ ok: true, message: genericMessage });
      return;
    }

    const quota = consumeRecoveryEmailQuota(dbState.adminRecoveryRateLimit, now, 3, 60 * 60 * 1000);
    if (!quota.allowed) {
      res.json({ ok: true, message: genericMessage });
      return;
    }
    dbState.adminRecoveryRateLimit = quota.state;

    const rawToken = randomBytes(32).toString('base64url');
    dbState.adminRecovery = {
      tokenHash: hashRecoveryToken(rawToken),
      expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
      requestedAt: new Date(now).toISOString()
    };
    saveDatabase(dbState);
    try {
      if (store) await store.flush();
      const recoveryUrl = new URL('/', baseUrl);
      recoveryUrl.hash = new URLSearchParams({ adminRecovery: rawToken }).toString();
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject: 'RCPD – Wiederherstellung des Administrator-Zugangs',
          html: `<p>Es wurde eine Wiederherstellung des Administrator-Zugangs angefordert.</p><p><a href="${recoveryUrl.toString()}">Administrator-Passwort sicher zurücksetzen</a></p><p>Der Link ist 15 Minuten gültig und kann nur einmal verwendet werden. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.</p>`,
          text: `Es wurde eine Wiederherstellung des Administrator-Zugangs angefordert. Öffne diesen einmaligen Link innerhalb von 15 Minuten: ${recoveryUrl.toString()} Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.`
        })
      });
      if (!emailResponse.ok) {
        console.error('[Admin-Recovery] Resend-Versand fehlgeschlagen. HTTP-Status:', emailResponse.status);
        dbState.adminRecovery = null;
        saveDatabase(dbState);
        if (store) await store.flush();
        res.status(503).json({ error: 'Die Wiederherstellungs-E-Mail konnte nicht versendet werden.' });
        return;
      }
      res.json({ ok: true, message: genericMessage });
    } catch (error) {
      console.error('[Admin-Recovery] Anfrage fehlgeschlagen:', error instanceof Error ? error.message : 'Unbekannter Fehler');
      dbState.adminRecovery = null;
      saveDatabase(dbState);
      if (store) await store.flush().catch(() => undefined);
      res.status(503).json({ error: 'Die Wiederherstellungs-E-Mail konnte nicht versendet werden.' });
    }
  });

  app.post('/api/auth/recovery/reset', async (req, res, next) => {
    try {
      const ipKey = `recovery-reset:${req.ip}`;
      const waitMs = resetByIp.retryAfterMs(ipKey);
      if (waitMs > 0) {
        res.setHeader('Retry-After', String(Math.ceil(waitMs / 1000)));
        res.status(429).json({ error: 'Zu viele Zurücksetzversuche. Bitte warte einige Minuten.' });
        return;
      }
      // Jeder Versuch zählt, auch ungültige Tokens und fehlerhafte Passwörter.
      resetByIp.recordFailure(ipKey);

      const { token, password } = req.body as { token?: string; password?: string };
      if (typeof token !== 'string' || token.length < 20 || token.length > 200 || typeof password !== 'string') {
        res.status(400).json({ error: 'Der Wiederherstellungslink oder das neue Passwort ist ungültig.' });
        return;
      }
      const passwordError = validateNewPassword(password);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }

      const dbState = loadDatabase();
      const recovery = dbState.adminRecovery;
      const admin = dbState.accounts.find(a => a.uid === 'usr_admin_1' && a.publicProfile.role === 'admin');
      if (!recovery || !admin || Date.parse(recovery.expiresAt) <= Date.now() || !safeEqual(hashRecoveryToken(token), recovery.tokenHash)) {
        res.status(400).json({ error: 'Der Wiederherstellungslink ist ungültig oder abgelaufen. Fordere bitte einen neuen Link an.' });
        return;
      }

      // Einmal-Token sofort verbrauchen und alle zuvor ausgestellten Admin-Sitzungen widerrufen.
      dbState.adminRecovery = null;
      admin.passwordHash = hashPassword(password);
      delete admin.password;
      admin.sessionVersion = (admin.sessionVersion ?? 0) + 1;
      appendAuditLog(dbState, admin, 'ACCOUNT_ROLE', 'Administrator-Passwort wiederhergestellt', 'Admin1', 'Passwort über den verifizierten E-Mail-Wiederherstellungslink zurückgesetzt.');
      saveDatabase(dbState);
      try {
        if (store) await store.flush();
      } catch (error) {
        console.error('[Admin-Recovery] Persistierung fehlgeschlagen:', error instanceof Error ? error.message : 'Unbekannter Fehler');
        res.status(503).json({ error: 'Die Änderung konnte nicht dauerhaft gespeichert werden. Bitte versuche es erneut.' });
        return;
      }
      res.json({ ok: true, message: 'Das Administrator-Passwort wurde zurückgesetzt. Du kannst dich jetzt mit deinem neuen Passwort anmelden.' });
    } catch (error) {
      next(error);
    }
  });

  // 2. Login Endpoint (No public self-registration — only Admin creates accounts)
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      res.status(400).json({ error: 'Bitte Benutzername und Passwort eingeben.' });
      return;
    }

    const ipKey = `ip:${req.ip}`;
    const userKey = `user:${username.trim().toLowerCase()}`;
    const waitMs = Math.max(loginByIp.retryAfterMs(ipKey), loginByUser.retryAfterMs(userKey));
    if (waitMs > 0) {
      res.setHeader('Retry-After', String(Math.ceil(waitMs / 1000)));
      res.status(429).json({
        error: 'Zu viele Anmeldeversuche. Bitte warte einige Minuten und versuche es erneut.'
      });
      return;
    }

    const dbState = loadDatabase();
    const candidate = dbState.accounts.find(
      a => a.username.toLowerCase() === username.trim().toLowerCase()
    );
    // Auch bei unbekanntem Benutzer wird gehasht, damit die Antwortzeit nichts verrät.
    const passwordOk = verifyPassword(password, candidate?.passwordHash ?? DUMMY_HASH);
    const matched = candidate && passwordOk ? candidate : undefined;

    if (!matched) {
      loginByIp.recordFailure(ipKey);
      loginByUser.recordFailure(userKey);
      res.status(401).json({
        error:
          'Ungültige Anmeldedaten. Neue Konten werden ausschließlich durch den Administrator vergeben.'
      });
      return;
    }
    loginByUser.reset(userKey);

    if (
      matched.publicProfile.whitelistStatus === 'suspended' ||
      matched.publicProfile.whitelistStatus === 'revoked'
    ) {
      res.status(403).json({
        error: `Dieses Dienstkonto ist aktuell gesperrt (Status: ${matched.publicProfile.whitelistStatus.toUpperCase()}). Bitte wende dich an den Administrator.`
      });
      return;
    }

    const nowIso = new Date().toISOString();
    matched.isOnline = true;
    matched.lastSeenIso = nowIso;
    matched.publicProfile.isOnline = true;
    matched.publicProfile.lastSeenIso = nowIso;
    saveDatabase(dbState);

    res.json({
      user: matched.publicProfile,
      isAdmin: matched.publicProfile.role === 'admin',
      token: createSessionToken(matched.uid, SESSION_SECRET, Date.now(), undefined, matched.sessionVersion ?? 0)
    });
  });

  // 3. Logout Endpoint (Marks account offline immediately)
  app.post('/api/auth/logout', (req, res) => {
    const token = res.locals.sessionToken as string | undefined;
    if (token) {
      const nowMs = Date.now();
      for (const [sig, expiresAt] of revokedTokens) {
        if (expiresAt <= nowMs) revokedTokens.delete(sig);
      }
      revokedTokens.set(tokenSignature(token), nowMs + 12 * 60 * 60 * 1000);
    }
    const { uid } = req.body as { uid?: string };
    if (uid) {
      const dbState = loadDatabase();
      const target = dbState.accounts.find(a => a.uid === uid);
      if (target) {
        const nowIso = new Date().toISOString();
        target.isOnline = false;
        target.lastSeenIso = nowIso;
        target.publicProfile.isOnline = false;
        target.publicProfile.lastSeenIso = nowIso;
        saveDatabase(dbState);
      }
    }
    res.json({ ok: true });
  });

  // Token für die Anmeldung des Browsers bei Firebase (nur für die Echtzeit-Benachrichtigung).
  app.get('/api/auth/firebase-token', async (_req, res) => {
    if (!store) {
      res.status(503).json({ error: 'Echtzeit-Anbindung ist nicht aktiviert.' });
      return;
    }
    try {
      const token = await store.createCustomToken(res.locals.sessionUid as string);
      res.json({ token });
    } catch (err) {
      console.error('[Firestore] Custom Token fehlgeschlagen:', err);
      res.status(500).json({ error: 'Firebase-Token konnte nicht erstellt werden.' });
    }
  });

  // Lightweight keep-alive used while Firestore real-time sync is connected.
  app.post('/api/portal/heartbeat', (req, res) => {
    const sessionUid = res.locals.sessionUid as string;
    const dbState = peekDatabase();
    const caller = dbState.accounts.find(account => account.uid === sessionUid);
    if (!caller) {
      res.status(401).json({ error: 'Sitzung abgelaufen oder Konto wurde gelöscht.' });
      return;
    }

    const now = Date.now();
    if (refreshAccountPresence(caller, now)) saveDatabase(dbState);
    res.json({
      ok: true,
      lastSeenIso: caller.lastSeenIso || new Date(now).toISOString()
    });
  });

  // 4. Heartbeat & Real-Time State Sync
  app.get('/api/portal/state', (req, res) => {
    const callerUid = String(req.query.uid || '');
    // This endpoint only projects the current state and refreshes the caller heartbeat.
    // Avoid cloning the complete in-memory database (including legacy PDF payloads) on every poll.
    const dbState = peekDatabase();
    const caller = dbState.accounts.find(a => a.uid === callerUid);

    if (!caller) {
      res.status(401).json({ error: 'Sitzung abgelaufen oder Konto wurde gelöscht.' });
      return;
    }

    if (
      caller.publicProfile.whitelistStatus === 'suspended' ||
      caller.publicProfile.whitelistStatus === 'revoked'
    ) {
      caller.isOnline = false;
      caller.publicProfile.isOnline = false;
      saveDatabase(dbState);
      res.status(403).json({ error: 'Dein Konto wurde durch den Administrator suspendiert.' });
      return;
    }

    // Update caller heartbeat (writes are throttled to avoid changing memory/Firestore on every poll).
    const now = Date.now();
    if (refreshAccountPresence(caller, now)) saveDatabase(dbState);
    const nowIso = caller.lastSeenIso || new Date(now).toISOString();

    const isAdmin = caller.publicProfile.role === 'admin';
    const isTrainee = caller.publicProfile.role === 'trainee';
    const callerPerms =
      normalizeGranularPermissions(
        caller.publicProfile.role,
        caller.publicProfile.granularPermissions
      );

    // Recompute live online flags for all accounts
    const publicRoster = dbState.accounts.map(a => ({
      ...a.publicProfile,
      granularPermissions: normalizeGranularPermissions(
        a.publicProfile.role,
        a.publicProfile.granularPermissions
      ),
      isOnline: computeIsOnline(a),
      lastSeenIso: a.lastSeenIso
    }));

    // Filter out final_exam for trainees on the backend as well
    const visibleExams = dbState.exams.filter(exam => exam.status !== 'archived' &&
      (!isTrainee || exam.assessmentStage !== 'final_exam'));

    const canSeeAllProgress =
      isAdmin ||
      caller.publicProfile.role === 'colonel' ||
      callerPerms.canGradeAssignedCourses;

    const canSeeAllRequests =
      isAdmin ||
      caller.publicProfile.role === 'colonel' ||
      callerPerms.canReviewStandardRequests;

    const myNotifications = (dbState.notifications || []).filter(
      n => n.recipientUid === caller.uid || n.recipientUid === 'ALL'
    );

    res.json({
      currentUser: {
        ...caller.publicProfile,
        granularPermissions: callerPerms,
        isOnline: true,
        lastSeenIso: nowIso
      },
      isAdmin,
      roster: publicRoster,
      // STRICTLY ADMIN ONLY: Full accounts list with passwords, online status, and private notes
      adminAccounts: isAdmin
        ? dbState.accounts.map(a => ({
            uid: a.uid,
            username: a.username,
            isOnline: computeIsOnline(a),
            lastSeenIso: a.lastSeenIso,
            publicProfile: {
              ...a.publicProfile,
              granularPermissions: normalizeGranularPermissions(
                a.publicProfile.role,
                a.publicProfile.granularPermissions
              ),
              isOnline: computeIsOnline(a),
              lastSeenIso: a.lastSeenIso
            },
            privateProfile: a.privateProfile
          }))
        : [],
      applications: isAdmin
        ? dbState.applications
        : dbState.applications.filter(appItem => appItem.applicantUid === caller.uid),
      modules: dbState.modules.map(toClientModule),
      exams: visibleExams.map(toClientExam),
      progress: canSeeAllProgress
        ? dbState.progress
        : dbState.progress.filter(p => p.userId === caller.uid),
      announcements: dbState.announcements || [],
      messages: (dbState.messages || []).filter(
        m =>
          m.recipientUid === caller.uid ||
          m.senderUid === caller.uid ||
          m.recipientUid === 'ALL'
      ),
      requests: canSeeAllRequests
        ? dbState.requests || []
        : (dbState.requests || []).filter(r => r.requesterUid === caller.uid),
      events: dbState.events || [],
      notifications: myNotifications,
      recentPublicActivity: buildRecentPublicActivity(dbState),
      auditLogs: isAdmin ? dbState.auditLogs || [] : [],
      deploymentConfig: isAdmin ? ensureDeploymentConfig(dbState) : undefined,
      dbStats: isAdmin
        ? {
            accountsCount: dbState.accounts.length,
            onlineCount: dbState.accounts.filter(a => computeIsOnline(a)).length,
            modulesCount: dbState.modules.length,
            examsCount: dbState.exams.length,
            applicationsCount: dbState.applications.length,
            progressCount: dbState.progress.length,
            announcementsCount: (dbState.announcements || []).length,
            messagesCount: (dbState.messages || []).length,
            requestsCount: (dbState.requests || []).length,
            eventsCount: (dbState.events || []).length,
            auditLogsCount: (dbState.auditLogs || []).length,
            sizeBytes: !store && fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0
          }
        : undefined
    });
  });

  // 5. ADMIN ONLY: Create New Account (Defaults to 'trainee' unless specified)
  app.post('/api/admin/accounts', (req, res) => {
    const {
      adminUid,
      username,
      password,
      displayName,
      badgeNumber,
      callsign,
      role,
      rank,
      division,
      whitelistStatus,
      discordTag,
      supervisorNotes,
      granularPermissions
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({
        error:
          'Zugriff verweigert. Neue Benutzerkonten können ausschließlich vom Administrator angelegt werden.'
      });
      return;
    }

    if (!username || !password) {
      res.status(400).json({ error: 'Benutzername und Passwort sind Pflichtfelder.' });
      return;
    }
    if (role !== undefined && role !== null && role !== '' && !isOfficerRole(role)) {
      res.status(400).json({ error: 'Die angegebene Kontorolle ist ungültig.' });
      return;
    }
    if (
      whitelistStatus !== undefined && whitelistStatus !== null && whitelistStatus !== '' &&
      !isWhitelistStatus(whitelistStatus)
    ) {
      res.status(400).json({ error: 'Der angegebene Whitelist-Status ist ungültig.' });
      return;
    }
    const passwordError = validateNewPassword(password);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }

    if (
      dbState.accounts.some(
        a => a.username.toLowerCase() === String(username).trim().toLowerCase()
      )
    ) {
      res.status(409).json({ error: 'Dieser Benutzername existiert bereits.' });
      return;
    }

    const uid = newId('usr');
    const nowIso = new Date().toISOString();
    // Default role is ALWAYS 'trainee' unless explicitly chosen otherwise by Admin
    const targetRole: OfficerRole =
      role === undefined || role === null || role === '' ? 'trainee' : role;
    const targetWhitelistStatus: WhitelistStatus =
      whitelistStatus === undefined || whitelistStatus === null || whitelistStatus === ''
        ? 'whitelisted'
        : whitelistStatus;
    const roleMeta = ROLE_HIERARCHY[targetRole];
    const normalizedPerms = normalizeGranularPermissions(targetRole, granularPermissions);

    const newAccount: StoredAccountRecord = {
      uid,
      username: String(username).trim(),
      passwordHash: hashPassword(String(password)),
      isOnline: false,
      lastSeenIso: nowIso,
      publicProfile: {
        uid,
        username: String(username).trim(),
        displayName: String(displayName || username)
          .trim()
          .slice(0, 80),
        badgeNumber: String(
          badgeNumber || `CA-${Math.floor(1000 + Math.random() * 8999)}`
        )
          .toUpperCase()
          .slice(0, 20),
        callsign: String(callsign || '10-TRN')
          .trim()
          .slice(0, 20),
        rank: String(rank || roleMeta.defaultRank)
          .trim()
          .slice(0, 50),
        role: targetRole,
        clearanceLevel: roleMeta.defaultClearance,
        division: String(division || 'Training & Evaluation Bureau')
          .trim()
          .slice(0, 60),
        whitelistStatus: targetWhitelistStatus,
        granularPermissions: normalizedPerms,
        isOnline: false,
        lastSeenIso: nowIso,
        updatedIso: nowIso
      },
      privateProfile: {
        uid,
        email: `${String(username).trim().toLowerCase()}@post.ca.gov`,
        discordTag: String(discordTag || `${String(username).trim().toLowerCase()}#0001`).slice(
          0,
          64
        ),
        steamHex: 'steam:verified',
        supervisorNotes: String(
          supervisorNotes || 'Vom Administrator persönlich angelegt.'
        ).slice(0, 2000),
        updatedIso: nowIso
      }
    };

    dbState.accounts.push(newAccount);
    appendAuditLog(
      dbState,
      caller,
      'ACCOUNT_ROLE',
      'Neues Dienstkonto angelegt',
      `${newAccount.publicProfile.displayName} (${newAccount.username} · ${newAccount.publicProfile.badgeNumber})`,
      `Start-Rang: ${targetRole.toUpperCase()} (${newAccount.publicProfile.rank}) · Abteilung: ${newAccount.publicProfile.division}`
    );
    saveDatabase(dbState);
    res.json({ account: toAdminView(newAccount) });
  });

  // 6. ADMIN ONLY: Update Any Account (Including Admin1's own username & password, role, granularPermissions, status)
  app.put('/api/admin/accounts/:targetUid', (req, res) => {
    const { targetUid } = req.params;
    const {
      adminUid,
      username,
      password,
      displayName,
      badgeNumber,
      callsign,
      role,
      rank,
      division,
      whitelistStatus,
      discordTag,
      supervisorNotes,
      granularPermissions
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({
        error:
          'Zugriff verweigert. Rang- und Kontenbearbeitung ist ausschließlich dem Administrator erlaubt.'
      });
      return;
    }

    if (role !== undefined && role !== null && role !== '' && !isOfficerRole(role)) {
      res.status(400).json({ error: 'Die angegebene Kontorolle ist ungültig.' });
      return;
    }
    if (whitelistStatus !== undefined && whitelistStatus !== null && whitelistStatus !== '' && !isWhitelistStatus(whitelistStatus)) {
      res.status(400).json({ error: 'Der angegebene Whitelist-Status ist ungültig.' });
      return;
    }



    const accountIdx = dbState.accounts.findIndex(a => a.uid === targetUid);
    if (accountIdx === -1) {
      res.status(404).json({ error: 'Benutzerkonto nicht gefunden.' });
      return;
    }

    const target = dbState.accounts[accountIdx];
    const previousRole = target.publicProfile.role;
    const previousStatus = target.publicProfile.whitelistStatus;
    const previousAccount = {
      username: target.username,
      passwordHash: target.passwordHash,
      publicProfile: { ...target.publicProfile },
      privateProfile: { ...target.privateProfile }
    };
    const nextUsername = username ? String(username).trim() : target.username;

    if (
      dbState.accounts.some(
        a => a.uid !== targetUid && a.username.toLowerCase() === nextUsername.toLowerCase()
      )
    ) {
      res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
      return;
    }

    if (password !== undefined && String(password).length > 0) {
      const passwordError = validateNewPassword(password);
      if (passwordError) {
        res.status(400).json({ error: passwordError });
        return;
      }
    }

    const nextRole: OfficerRole =
      role === undefined || role === null || role === '' ? previousRole : role;
    const nextWhitelistStatus: WhitelistStatus =
      whitelistStatus === undefined || whitelistStatus === null || whitelistStatus === ''
        ? target.publicProfile.whitelistStatus
        : whitelistStatus;
    const roleMeta = ROLE_HIERARCHY[nextRole];
    const previousPerms = normalizeGranularPermissions(
      previousRole,
      target.publicProfile.granularPermissions
    );
    const nextPerms = normalizeGranularPermissions(
      nextRole,
      granularPermissions !== undefined
        ? granularPermissions
        : previousRole !== nextRole
          ? undefined
          : target.publicProfile.granularPermissions
    );

    target.username = nextUsername;
    if (
      password !== undefined &&
      String(password).length > 0 &&
      !verifyPassword(String(password), target.passwordHash)
    ) {
      target.passwordHash = hashPassword(String(password));
      // A password change revokes every previously issued token for this account.
      target.sessionVersion = (target.sessionVersion ?? 0) + 1;
    }

    target.publicProfile = {
      ...target.publicProfile,
      username: nextUsername,
      displayName:
        displayName !== undefined
          ? String(displayName).trim()
          : target.publicProfile.displayName,
      badgeNumber:
        badgeNumber !== undefined
          ? String(badgeNumber).toUpperCase().trim()
          : target.publicProfile.badgeNumber,
      callsign:
        callsign !== undefined ? String(callsign).trim() : target.publicProfile.callsign,
      role: nextRole,
      rank:
        rank !== undefined
          ? String(rank).trim()
          : previousRole !== nextRole
            ? roleMeta.defaultRank
            : target.publicProfile.rank,
      clearanceLevel:
        previousRole !== nextRole
          ? roleMeta.defaultClearance
          : target.publicProfile.clearanceLevel,
      division:
        division !== undefined ? String(division).trim() : target.publicProfile.division,
      whitelistStatus: nextWhitelistStatus,
      granularPermissions: nextPerms
    };

    target.privateProfile = {
      ...target.privateProfile,
      discordTag:
        discordTag !== undefined
          ? String(discordTag).trim()
          : target.privateProfile.discordTag,
      supervisorNotes:
        supervisorNotes !== undefined
          ? String(supervisorNotes)
          : target.privateProfile.supervisorNotes
    };

    const accountChanged = hasAccountRecordChanged(previousAccount, target);
    const permissionsOrRoleChanged = shouldNotifyAccountPermissionsUpdated(
      previousRole,
      nextRole,
      previousPerms,
      nextPerms
    );

    if (accountChanged) {
      const nowIso = new Date().toISOString();
      target.publicProfile.updatedIso = nowIso;
      target.privateProfile.updatedIso = nowIso;

      appendAuditLog(
        dbState,
        caller,
        'ACCOUNT_ROLE',
        previousRole !== nextRole
          ? `Rangänderung durchgeführt (${previousRole.toUpperCase()} → ${nextRole.toUpperCase()})`
          : previousStatus !== target.publicProfile.whitelistStatus
            ? `Kontostatus geändert (${previousStatus} → ${target.publicProfile.whitelistStatus})`
            : 'Konto- & Berechtigungsdaten aktualisiert',
        `${target.publicProfile.displayName} (${target.username} · ${target.publicProfile.badgeNumber})`,
        `Rolle: ${nextRole.toUpperCase()} · Status: ${target.publicProfile.whitelistStatus} · Lehrgangs-Freigaben: ${
          nextPerms.assignedCourseCodes.join(', ') || 'Keine'
        }`
      );
    }

    if (JSON.stringify(previousPerms.examWorkshop) !== JSON.stringify(nextPerms.examWorkshop)) {
      appendAuditLog(
        dbState,
        caller,
        'EXAM_WORKSHOP',
        'Berechtigungen der Prüfungswerkstatt geändert',
        `${target.publicProfile.displayName} (${target.publicProfile.badgeNumber})`,
        `Werkstattzugang: ${nextPerms.examWorkshop?.hasAccess ? 'erteilt' : 'nicht erteilt'} · Zugangsbeantragung: ${nextPerms.examWorkshop?.canRequestAccess ? 'erlaubt' : 'nicht erlaubt'} · Rechte für Tests und Abschlussprüfungen wurden aktualisiert.`
      );
    }

    if (permissionsOrRoleChanged) {
      pushNotification(
        dbState,
        target.uid,
        'role_updated',
        'Dienstkonto & Berechtigungen aktualisiert',
        `Dein System-Rang lautet nun ${nextRole.toUpperCase()} (${target.publicProfile.rank}). Zugewiesene Ausbilder-Lehrgänge: ${
          nextPerms.assignedCourseCodes.join(', ') || 'Standard'
        }.`,
        'dashboard'
      );
    }

    // Cascade displayName and badgeNumber updates to related records
    for (const p of dbState.progress || []) {
      if (p.userId === target.uid) {
        p.userName = target.publicProfile.displayName;
      }
    }
    for (const r of dbState.requests || []) {
      if (r.requesterUid === target.uid) {
        r.requesterName = target.publicProfile.displayName;
        r.requesterBadge = target.publicProfile.badgeNumber;
        r.requesterCurrentRole = target.publicProfile.role;
      }
    }
    for (const appDoc of dbState.applications || []) {
      if (appDoc.applicantUid === target.uid) {
        appDoc.applicantName = target.publicProfile.displayName;
      }
    }
    for (const evt of dbState.events || []) {
      for (const att of evt.attendees || []) {
        if (att.uid === target.uid) {
          att.displayName = target.publicProfile.displayName;
          att.badgeNumber = target.publicProfile.badgeNumber;
          att.role = target.publicProfile.role;
        }
      }
    }

    if (accountChanged) saveDatabase(dbState);
    res.json({ account: toAdminView(target) });
  });

  // 7. ADMIN ONLY: Delete Account
  app.delete('/api/admin/accounts/:targetUid', (req, res) => {
    const { targetUid } = req.params;
    const adminUid = String(req.query.adminUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);

    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Zugriff verweigert.' });
      return;
    }

    if (targetUid === caller.uid) {
      res
        .status(400)
        .json({ error: 'Du kannst dein eigenes aktives Administratorkonto nicht löschen.' });
      return;
    }

    const target = dbState.accounts.find(a => a.uid === targetUid);
    dbState.accounts = dbState.accounts.filter(a => a.uid !== targetUid);
    dbState.progress = (dbState.progress || []).filter(p => p.userId !== targetUid);
    for (const evt of dbState.events || []) {
      evt.attendees = (evt.attendees || []).filter(a => a.uid !== targetUid);
    }
    if (target) {
      appendAuditLog(
        dbState,
        caller,
        'ACCOUNT_ROLE',
        'Dienstkonto gelöscht',
        `${target.publicProfile.displayName} (${target.username})`,
        `Konto mit Dienstnummer ${target.publicProfile.badgeNumber} wurde dauerhaft entfernt.`
      );
    }
    saveDatabase(dbState);
    res.json({ deleted: true });
  });

  // 8. Whitelist Applications Submit & Admin Review
  app.post('/api/applications', (req, res) => {
    const {
      applicantUid,
      characterName,
      dateOfBirth,
      discordTag,
      priorExperience,
      scenarioResponse,
      penalCodeAck
    } = req.body;

    const applicationValidationError = validateApplicationSubmission(req.body);
    if (applicationValidationError) {
      res.status(400).json({ error: applicationValidationError });
      return;
    }

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === applicantUid);
    if (!caller) {
      res.status(401).json({ error: 'Ungültige Sitzung.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const existingIdx = dbState.applications.findIndex(a => a.applicantUid === applicantUid);

    if (existingIdx !== -1) {
      const existing = dbState.applications[existingIdx];
      if (existing.status === 'accepted' || existing.status === 'rejected') {
        res.status(400).json({ error: 'Abgeschlossene Bewerbungen sind schreibgeschützt.' });
        return;
      }
      dbState.applications[existingIdx] = {
        ...existing,
        characterName: String(characterName).trim(),
        dateOfBirth: String(dateOfBirth).trim(),
        discordTag: String(discordTag).trim(),
        priorExperience: String(priorExperience).trim(),
        scenarioResponse: String(scenarioResponse).trim(),
        penalCodeAck: Boolean(penalCodeAck),
        updatedIso: nowIso
      };
    } else {
      dbState.applications.unshift({
        id: newId('app'),
        applicantUid: caller.uid,
        applicantName: caller.publicProfile.displayName,
        characterName: String(characterName).trim(),
        dateOfBirth: String(dateOfBirth).trim(),
        discordTag: String(discordTag).trim(),
        priorExperience: String(priorExperience).trim(),
        scenarioResponse: String(scenarioResponse).trim(),
        penalCodeAck: Boolean(penalCodeAck),
        status: 'pending',
        reviewerUid: '',
        reviewerFeedback: '',
        updatedIso: nowIso
      });
    }

    saveDatabase(dbState);
    res.json({ ok: true });
  });

  app.put('/api/admin/applications/:appId', (req, res) => {
    const { appId } = req.params;
    const { adminUid, status, reviewerFeedback, promoteToRole } = req.body;
    if (!isApplicationStatus(status)) {
      res.status(400).json({ error: 'Der Bewerbungsstatus ist ungültig.' });
      return;
    }
    if (
      status === 'accepted' && promoteToRole !== undefined && promoteToRole !== null && promoteToRole !== '' &&
      !isWhitelistPromotionRole(promoteToRole)
    ) {
      res.status(400).json({ error: 'Der zugewiesene Zielrang ist ungültig.' });
      return;
    }
    const assignedRole = isWhitelistPromotionRole(promoteToRole) ? promoteToRole : 'trainee';
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res
        .status(403)
        .json({ error: 'Nur der Administrator darf über Bewerbungen und Rollen entscheiden.' });
      return;
    }

    const appItem = dbState.applications.find(a => a.id === appId);
    if (!appItem) {
      res.status(404).json({ error: 'Bewerbungsakte nicht gefunden.' });
      return;
    }
    if (!isReviewableApplicationStatus(appItem.status)) {
      res.status(409).json({ error: 'Diese Bewerbungsakte wurde bereits abschließend entschieden.' });
      return;
    }
    if (
      reviewerFeedback !== undefined &&
      (typeof reviewerFeedback !== 'string' || reviewerFeedback.length > 2000)
    ) {
      res.status(400).json({ error: 'Das Prüfer-Feedback darf höchstens 2.000 Zeichen lang sein.' });
      return;
    }

    const nowIso = new Date().toISOString();
    appItem.status = status;
    appItem.reviewerUid = caller.uid;
    appItem.reviewerFeedback = String(reviewerFeedback || '').trim();
    appItem.updatedIso = nowIso;

    const applicantAccount = dbState.accounts.find(a => a.uid === appItem.applicantUid);
    if (applicantAccount) {
      if (status === 'accepted') {
        const nextRole: OfficerRole = assignedRole;
        const meta = ROLE_HIERARCHY[nextRole];
        applicantAccount.publicProfile.role = nextRole;
        applicantAccount.publicProfile.rank = meta.defaultRank;
        applicantAccount.publicProfile.clearanceLevel = meta.defaultClearance;
        applicantAccount.publicProfile.whitelistStatus = 'whitelisted';
        applicantAccount.publicProfile.granularPermissions = getDefaultGranularPermissions(nextRole);
      } else if (status === 'rejected') {
        applicantAccount.publicProfile.whitelistStatus = 'revoked';
      }
    }

    appendAuditLog(
      dbState,
      caller,
      'REQUEST_REVIEW',
      `Personalbogen Form 2-251 geprüft (${status.toUpperCase()})`,
      appItem.applicantName,
      `Status: ${status} · Feedback: ${appItem.reviewerFeedback || 'Keine Anmerkung'}`
    );

    pushNotification(
      dbState,
      appItem.applicantUid,
      'request_reviewed',
      `Personalbogen (Form 2-251): ${status.toUpperCase()}`,
      `Dein Personalbogen wurde von ${caller.publicProfile.displayName} geprüft: ${
        appItem.reviewerFeedback || status
      }`,
      'whitelist'
    );

    saveDatabase(dbState);
    res.json({ ok: true });
  });

  // 9. Academy Textbooks/PDFs & Code Tests/Final Exams (Editable by Admin, Colonel, or Granular Course Instructor)
  app.post('/api/academy/modules', (req, res) => {
    const {
      title,
      code,
      category,
      requiredRole,
      embedType,
      contentMarkdown,
      externalUrl,
      pdfDataUrl,
      pdfFileName,
      interactiveCode,
      estimatedMinutes
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === res.locals.sessionUid);
    const courseCode = String(code || 'SOP-01').trim();
    if (!caller || !canActorEditCourseCode(caller, courseCode)) {
      res.status(403).json({
        error:
          'Zugriff verweigert. Nur Admin, Colonel oder für diesen Lehrgangs-Code freigeschaltete Ausbilder dürfen dieses Lehrmaterial anlegen.'
      });
      return;
    }

    if (embedType === 'pdf_upload' || (typeof pdfDataUrl === 'string' && pdfDataUrl.length > 0)) {
      res.status(400).json({ error: 'Neue PDF-Uploads sind vorübergehend deaktiviert. Vorhandene PDFs bleiben weiterhin verfügbar.' });
      return;
    }

    const moduleError = validateModuleFields(
      { title, externalUrl, pdfDataUrl, requiredRole },
      true
    );
    if (moduleError) {
      res.status(400).json({ error: moduleError });
      return;
    }

    const reqRole: OfficerRole = requiredRole || 'trainee';
    const newMod: TrainingModuleDoc = {
      id: newId('mod'),
      title: String(title).trim(),
      code: courseCode,
      category: category || 'SOP & Policy',
      minClearance: ROLE_HIERARCHY[reqRole]?.defaultClearance || 1,
      requiredRole: reqRole,
      embedType: embedType || 'document',
      contentMarkdown: limitText(contentMarkdown, 200_000),
      externalUrl: String(externalUrl || '').trim(),
      pdfDataUrl: String(pdfDataUrl || ''),
      pdfFileName: limitText(pdfFileName, 200),
      interactiveCode: limitText(interactiveCode, 200_000),
      estimatedMinutes: Number(estimatedMinutes) || 25,
      authorUid: caller.uid,
      updatedIso: new Date().toISOString()
    };

    dbState.modules.push(newMod);
    appendAuditLog(
      dbState,
      caller,
      'ACADEMY_DOC',
      'Lehrbuch / Handbuch hinzugefügt',
      `${newMod.code} — ${newMod.title}`,
      `Format: ${newMod.embedType} · Mindest-Rang: ${newMod.requiredRole.toUpperCase()}`
    );
    saveDatabase(dbState);
    res.json({ module: toClientModule(newMod) });
  });

  app.put('/api/academy/modules/:modId', (req, res) => {
    const { modId } = req.params;
    const {
      title,
      code,
      category,
      requiredRole,
      embedType,
      contentMarkdown,
      externalUrl,
      pdfDataUrl,
      pdfFileName,
      interactiveCode,
      estimatedMinutes
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === res.locals.sessionUid);
    const idx = dbState.modules.findIndex(m => m.id === modId);
    if (idx === -1) {
      res.status(404).json({ error: 'Lehrmaterial nicht gefunden.' });
      return;
    }

    const targetCode = code !== undefined ? String(code).trim() : dbState.modules[idx].code;
    if (!caller || !canActorEditCourseCode(caller, targetCode)) {
      res.status(403).json({
        error: 'Keine Lehrgangs-Berechtigung zum Bearbeiten dieses Moduls.'
      });
      return;
    }

    if (
      (typeof pdfDataUrl === 'string' && pdfDataUrl.length > 0) ||
      (embedType === 'pdf_upload' && dbState.modules[idx].embedType !== 'pdf_upload')
    ) {
      res.status(400).json({ error: 'Neue PDF-Uploads sind vorübergehend deaktiviert. Vorhandene PDFs bleiben weiterhin verfügbar.' });
      return;
    }

    const moduleError = validateModuleFields(
      { title, externalUrl, pdfDataUrl, requiredRole },
      false
    );
    if (moduleError) {
      res.status(400).json({ error: moduleError });
      return;
    }

    const reqRole: OfficerRole = requiredRole || dbState.modules[idx].requiredRole;
    const updatedModule: ModuleWithLazyBlobs = {
      ...dbState.modules[idx],
      title: title !== undefined ? String(title).trim() : dbState.modules[idx].title,
      code: targetCode,
      category: category || dbState.modules[idx].category,
      requiredRole: reqRole,
      minClearance: ROLE_HIERARCHY[reqRole]?.defaultClearance || 1,
      embedType: embedType || dbState.modules[idx].embedType,
      contentMarkdown:
        contentMarkdown !== undefined
          ? limitText(contentMarkdown, 200_000)
          : dbState.modules[idx].contentMarkdown,
      externalUrl:
        externalUrl !== undefined
          ? String(externalUrl).trim()
          : dbState.modules[idx].externalUrl,
      // PDF payloads and filenames are immutable through the temporary upload lock.
      // This preserves existing Firestore blob references during ordinary metadata edits.
      pdfDataUrl: dbState.modules[idx].pdfDataUrl,
      pdfFileName: dbState.modules[idx].pdfFileName,
      interactiveCode:
        interactiveCode !== undefined
          ? limitText(interactiveCode, 200_000)
          : dbState.modules[idx].interactiveCode,
      estimatedMinutes: Number(estimatedMinutes) || dbState.modules[idx].estimatedMinutes,
      updatedIso: new Date().toISOString()
    };
    dbState.modules[idx] = updatedModule;

    appendAuditLog(
      dbState,
      caller,
      'ACADEMY_DOC',
      'Lehrbuch / Handbuch bearbeitet',
      `${dbState.modules[idx].code} — ${dbState.modules[idx].title}`,
      `Aktualisiert durch ${caller.publicProfile.displayName}`
    );
    saveDatabase(dbState);
    res.json({ module: toClientModule(updatedModule) });
  });

  app.get('/api/academy/modules/:modId/pdf', async (req, res) => {
    // Read-only: avoid cloning the complete portal state, including legacy PDF payloads.
    const dbState = peekDatabase();
    const caller = dbState.accounts.find(a => a.uid === res.locals.sessionUid);
    const mod = dbState.modules.find(m => m.id === req.params.modId);
    if (!caller || !mod) {
      res.status(404).json({ error: 'Handbuch nicht gefunden.' });
      return;
    }
    if (
      !canReadModule(
        ROLE_HIERARCHY[caller.publicProfile.role]?.rankOrder,
        ROLE_HIERARCHY[mod.requiredRole]?.rankOrder
      )
    ) {
      res.status(403).json({ error: 'Für dieses Handbuch fehlt dir der nötige Rang.' });
      return;
    }

    let pdfDataUrl = mod.pdfDataUrl || '';
    const lazyChunkCount = (mod as ModuleWithLazyBlobs).__lazyBlobChunks?.pdfDataUrl;
    if (!pdfDataUrl && lazyChunkCount) {
      if (!store) {
        res.status(503).json({ error: 'Das Handbuch ist derzeit nicht verfügbar.' });
        return;
      }
      try {
        pdfDataUrl = await store.loadBlobChunks('modules', mod.id, 'pdfDataUrl', lazyChunkCount);
      } catch (error) {
        console.error('[Firestore] PDF-Teilstücke konnten nicht geladen werden:', error);
        res.status(503).json({ error: 'Das Handbuch konnte nicht geladen werden. Bitte versuche es erneut.' });
        return;
      }
    }
    res.json({ pdfDataUrl });
  });

  app.delete('/api/academy/modules/:modId', (req, res) => {
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === res.locals.sessionUid);
    const targetMod = dbState.modules.find(m => m.id === req.params.modId);
    if (!targetMod) {
      res.status(404).json({ error: 'Modul nicht gefunden.' });
      return;
    }
    if (!caller || !canActorEditCourseCode(caller, targetMod.code)) {
      res.status(403).json({ error: 'Zugriff verweigert.' });
      return;
    }
    dbState.modules = dbState.modules.filter(m => m.id !== req.params.modId);
    appendAuditLog(
      dbState,
      caller,
      'ACADEMY_DOC',
      'Lehrbuch / Handbuch gelöscht',
      `${targetMod.code} — ${targetMod.title}`,
      `Modul wurde aus dem Ausbildungsbereich entfernt.`
    );
    saveDatabase(dbState);
    res.json({ deleted: true });
  });

  app.post('/api/academy/exams', (req, res) => {
    const {
      actorUid,
      title,
      moduleCode,
      assessmentStage,
      passingScore,
      timeLimitMinutes,
      examFormat,
      questionsPayload,
      interactiveWidgetCode
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === res.locals.sessionUid);
    const targetCode = String(moduleCode || 'TEST-01').trim();
    const stage = assessmentStage === 'final_exam' ? 'final_exam' : assessmentStage === 'test' ? 'test' : null;
    const actor = caller ? resolveExamWorkshopActor(caller) : null;
    if (!caller || !actor || !stage ||
        !canAccessExamWorkshopExam(actor, stage, 'create') ||
        (actor.role !== 'admin' && examWorkshopPublicationRequiresApproval(actor, stage, false)) ||
        !canActorEditCourseCode(caller, targetCode)) {
      res.status(403).json({
        error: 'Zugriff verweigert. Die Prüfungswerkstatt-Berechtigung und die Veröffentlichungsregel erlauben diese Legacy-Anlage nicht.'
      });
      return;
    }
    const newExam: AcademyExamDoc = {
      id: newId('exam'),
      title: String(title).trim(),
      moduleCode: targetCode,
      assessmentStage: stage,
      minClearance:
        stage === 'final_exam'
          ? ROLE_HIERARCHY.rookie.defaultClearance
          : ROLE_HIERARCHY.trainee.defaultClearance,
      passingScore: Number(passingScore) || 75,
      timeLimitMinutes: Number(timeLimitMinutes) || 20,
      examFormat: examFormat || 'interactive_code',
      questionsPayload: String(questionsPayload || '[]'),
      interactiveWidgetCode: String(interactiveWidgetCode || ''),
      authorUid: caller.uid,
      updatedIso: new Date().toISOString()
    };

    dbState.exams.push(newExam);
    appendAuditLog(
      dbState,
      caller,
      'ACADEMY_DOC',
      stage === 'final_exam' ? 'Abschlussprüfung angelegt' : 'Übungstest angelegt',
      `${newExam.moduleCode} — ${newExam.title}`,
      `Bestehensgrenze: ${newExam.passingScore}% · Format: ${newExam.examFormat}`
    );
    appendAuditLog(dbState, caller, 'EXAM_WORKSHOP', 'Legacy-Prüfung angelegt', `${newExam.moduleCode} — ${newExam.title}`, `Prüfungsbereich: ${stage}.`);
    saveDatabase(dbState);
    res.json({ exam: newExam });
  });

  app.delete('/api/academy/exams/:examId', (req, res) => {
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === res.locals.sessionUid);
    const targetExam = dbState.exams.find(e => e.id === req.params.examId);
    if (!targetExam) {
      res.status(404).json({ error: 'Prüfung nicht gefunden.' });
      return;
    }
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Nur der Administrator darf ältere Prüfungen archivieren.' });
      return;
    }
    const reason = req.body?.reason;
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 1000) {
      res.status(400).json({ error: 'Bitte gib einen Archivierungsgrund mit höchstens 1.000 Zeichen ein.' });
      return;
    }
    const archiveTime = new Date().toISOString();
    Object.assign(targetExam, { status: 'archived', archivedAtIso: archiveTime, archivedByUid: caller.uid, archivedReason: reason.trim(), updatedIso: archiveTime });
    appendAuditLog(
      dbState,
      caller,
      'ACADEMY_DOC',
      'Ältere Prüfung archiviert',
      `${targetExam.moduleCode} — ${targetExam.title}`,
      reason.trim()
    );
    appendAuditLog(dbState, caller, 'EXAM_WORKSHOP', 'Legacy-Prüfung archiviert', `${targetExam.moduleCode} — ${targetExam.title}`, reason.trim());
    saveDatabase(dbState);
    res.json({ archived: true });
  });

  // 9b. GRANULAR INSTRUCTOR COURSE GRADING (/api/academy/instructor-grade)
  // Allows Admin, Colonel, or an Officer assigned to a specific courseCode to assign a score/status to a trainee/officer
  app.post('/api/academy/instructor-grade', (req, res) => {
    const {
      instructorUid,
      targetUserUid,
      courseCode,
      targetTitle,
      targetType,
      status,
      scorePercent,
      instructorFeedback
    } = req.body;

    const dbState = loadDatabase();
    const instructor = dbState.accounts.find(a => a.uid === res.locals.sessionUid);
    const student = dbState.accounts.find(a => a.uid === targetUserUid);

    if (!instructor || !student) {
      res.status(404).json({ error: 'Ausbilder- oder Teilnehmer-Konto nicht gefunden.' });
      return;
    }

    const normalizedCode = String(courseCode || 'SOP-01')
      .trim()
      .toUpperCase();
    if (!canActorEditCourseCode(instructor, normalizedCode)) {
      res.status(403).json({
        error: `Keine Berechtigung für Lehrgang "${normalizedCode}". Du kannst nur in deinen zugewiesenen Lehrgangs-Codes Noten vergeben.`
      });
      return;
    }
    if (targetType !== 'module') {
      res.status(400).json({ error: 'Über diesen älteren Ausbilderpfad dürfen nur Lehrgangsfortschritte, keine Prüfungsresultate bewertet werden.' });
      return;
    }
    const numericScore = Number(scorePercent);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100 ||
        (status !== 'passed' && status !== 'failed' && status !== 'completed')) {
      res.status(400).json({ error: 'Bewertungsstatus oder Punktzahl ist ungültig.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const targetId = `crs_${normalizedCode}_${targetUserUid}`;
    const existingIdx = dbState.progress.findIndex(
      p => p.userId === student.uid && (p.targetId === targetId || p.courseCode === normalizedCode)
    );

    const record: UserProgressDoc = {
      id: existingIdx !== -1 ? dbState.progress[existingIdx].id : newId('prog'),
      userId: student.uid,
      userName: student.publicProfile.displayName,
      targetId,
      targetType: 'module',
      targetTitle: String(targetTitle || `Lehrgang ${normalizedCode}`).trim(),
      courseCode: normalizedCode,
      status: status || 'passed',
      scorePercent: Math.round(numericScore),
      attempts: existingIdx !== -1 ? dbState.progress[existingIdx].attempts + 1 : 1,
      evaluatedByName: `${instructor.publicProfile.displayName} (${instructor.publicProfile.badgeNumber})`,
      instructorFeedback: String(instructorFeedback || '').trim(),
      updatedIso: nowIso
    };

    if (existingIdx !== -1) {
      dbState.progress[existingIdx] = record;
    } else {
      dbState.progress.unshift(record);
    }

    appendAuditLog(
      dbState,
      instructor,
      'COURSE_GRADE',
      `Lehrgangs-Note vergeben (${normalizedCode})`,
      `${student.publicProfile.displayName} (${student.publicProfile.badgeNumber})`,
      `Ergebnis: ${record.scorePercent}% (${record.status.toUpperCase()}) · Bewertung: ${
        record.instructorFeedback || 'Bestätigt'
      }`
    );

    pushNotification(
      dbState,
      student.uid,
      'course_graded',
      `Neue Lehrgangs-Bewertung (${normalizedCode})`,
      `Ausbilder ${instructor.publicProfile.displayName} hat deinen Lehrgang "${record.targetTitle}" mit ${record.scorePercent}% (${record.status.toUpperCase()}) bewertet.`,
      'academy'
    );

    saveDatabase(dbState);
    res.json({ ok: true, progressRecord: record });
  });

  // 10. Self Progress Tracking
  app.post('/api/progress', (req, res) => {
    const { targetId, targetType, scorePercent, answers } = req.body;
    const callerUid = res.locals.sessionUid as string;
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === callerUid);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    if (typeof targetId !== 'string' || !targetId) {
      res.status(400).json({ error: 'targetId fehlt.' });
      return;
    }

    // Titel, Status und bei strukturierten Prüfungen auch die Note werden serverseitig bestimmt.
    let resolvedType: UserProgressDoc['targetType'];
    let resolvedTitle: string;
    let resolvedStatus: UserProgressDoc['status'];
    let resolvedScore: number;
    let explanations: Record<string, string> = {};

    if (targetType === 'module') {
      const mod = dbState.modules.find(m => m.id === targetId);
      if (!mod) {
        res.status(404).json({ error: 'Lehrmaterial nicht gefunden.' });
        return;
      }
      resolvedType = 'module';
      resolvedTitle = mod.title;
      resolvedStatus = 'completed';
      resolvedScore = 100;
    } else if (targetType === 'test' || targetType === 'final_exam') {
      const exam = dbState.exams.find(e => e.id === targetId);
      if (!exam) {
        res.status(404).json({ error: 'Prüfung nicht gefunden.' });
        return;
      }
      if (exam.assessmentStage !== targetType) {
        res.status(400).json({ error: 'Der Prüfungstyp stimmt nicht mit der gespeicherten Prüfung überein.' });
        return;
      }

      if (exam.examFormat === 'structured_quiz') {
        let questions: unknown;
        try {
          questions = JSON.parse(exam.questionsPayload || '[]');
        } catch {
          res.status(500).json({ error: 'Die gespeicherten Prüfungsfragen sind ungültig.' });
          return;
        }
        if (
          !Array.isArray(questions) ||
          questions.length === 0 ||
          questions.some((q: any) =>
            !q ||
            typeof q.id !== 'string' ||
            !q.id ||
            !Array.isArray(q.options) ||
            q.options.length < 2 ||
            !Number.isInteger(q.correctIndex) ||
            q.correctIndex < 0 ||
            q.correctIndex >= q.options.length
          )
        ) {
          res.status(500).json({ error: 'Die gespeicherten Prüfungsfragen sind unvollständig oder ungültig.' });
          return;
        }

        const questionIds = questions.map((q: any) => q.id);
        if (new Set(questionIds).size !== questionIds.length) {
          res.status(500).json({ error: 'Die Prüfung enthält doppelte Fragenkennungen.' });
          return;
        }
        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
          res.status(400).json({ error: 'Die Antworten fehlen oder sind ungültig.' });
          return;
        }
        const answerKeys = Object.keys(answers);
        if (
          answerKeys.length !== questionIds.length ||
          questionIds.some((id: string) =>
            !Object.prototype.hasOwnProperty.call(answers, id) ||
            !Number.isInteger(answers[id]) ||
            answers[id] < 0 ||
            answers[id] >= questions.find((q: any) => q.id === id).options.length
          )
        ) {
          res.status(400).json({ error: 'Bitte beantworte alle Fragen mit einer gültigen Auswahl.' });
          return;
        }

        const correctCount = questions.reduce(
          (count: number, question: any) => count + (answers[question.id] === question.correctIndex ? 1 : 0),
          0
        );
        resolvedScore = Math.round((correctCount / questions.length) * 100);
        explanations = questions.reduce((result: Record<string, string>, question: any) => {
          if (typeof question.explanation === 'string' && question.explanation.trim()) {
            result[question.id] = question.explanation;
          }
          return result;
        }, {});
      } else {
        // Interaktive Code-Prüfungen verwenden weiterhin die bisherige manuelle Selbsteinschätzung.
        // Die Absicherung dieser clientseitigen Eingabe ist ein separater Punkt.
        const score = Number(scorePercent);
        if (!Number.isFinite(score) || score < 0 || score > 100) {
          res.status(400).json({ error: 'scorePercent muss zwischen 0 und 100 liegen.' });
          return;
        }
        resolvedScore = Math.round(score);
      }

      resolvedType = targetType;
      resolvedTitle = exam.title;
      resolvedStatus = resolvedScore >= exam.passingScore ? 'passed' : 'failed';
    } else {
      res.status(400).json({ error: 'Ungültiger targetType.' });
      return;
    }

    const existingIdx = dbState.progress.findIndex(
      p => p.userId === caller.uid && p.targetId === targetId && p.targetType === resolvedType
    );

    // Eine Note, die ein Ausbilder vergeben hat, kann der Teilnehmer nicht selbst überschreiben.
    if (existingIdx !== -1 && dbState.progress[existingIdx].evaluatedByName) {
      res.status(409).json({
        error: 'Dieser Eintrag wurde von einem Ausbilder bewertet und kann nicht überschrieben werden.'
      });
      return;
    }

    const nowIso = new Date().toISOString();
    if (existingIdx !== -1) {
      dbState.progress[existingIdx] = {
        ...dbState.progress[existingIdx],
        status: resolvedStatus,
        scorePercent: resolvedScore,
        attempts: dbState.progress[existingIdx].attempts + 1,
        updatedIso: nowIso
      };
    } else {
      dbState.progress.unshift({
        id: `prog_${caller.uid}_${targetId}`,
        userId: caller.uid,
        userName: caller.publicProfile.displayName,
        targetId,
        targetType: resolvedType,
        targetTitle: resolvedTitle,
        status: resolvedStatus,
        scorePercent: resolvedScore,
        attempts: 1,
        updatedIso: nowIso
      });
    }

    saveDatabase(dbState);
    res.json({
      ok: true,
      scorePercent: resolvedScore,
      passed: resolvedStatus === 'passed',
      explanations
    });
  });

  // External Game-Server Whitelist Verification Webhook / REST Endpoint
  app.get(['/api/v1/whitelist/verify', '/api/whitelist/verify'], (req, res) => {
    const { badge, username } = req.query;
    const dbState = peekDatabase();
    const found = dbState.accounts.find(
      a =>
        (badge && a.publicProfile.badgeNumber.toLowerCase() === String(badge).toLowerCase()) ||
        (username && a.username.toLowerCase() === String(username).toLowerCase())
    );

    if (!found) {
      res.json({
        protocol: 'CA-POST-RP-BRIDGE-v1',
        verifiedAt: new Date().toISOString(),
        whitelisted: false,
        reason: 'ACCOUNT_NOT_FOUND'
      });
      return;
    }

    res.json({
      protocol: 'CA-POST-RP-BRIDGE-v1',
      verifiedAt: new Date().toISOString(),
      officer: {
        username: found.username,
        displayName: found.publicProfile.displayName,
        badgeNumber: found.publicProfile.badgeNumber,
        callsign: found.publicProfile.callsign,
        rank: found.publicProfile.rank,
        role: found.publicProfile.role,
        clearanceLevel: found.publicProfile.clearanceLevel,
        whitelistStatus: found.publicProfile.whitelistStatus,
        isOnline: computeIsOnline(found)
      },
      whitelisted:
        found.publicProfile.whitelistStatus === 'whitelisted' ||
        found.publicProfile.whitelistStatus === 'probation'
    });
  });

  // Generate Render.com Blueprint (Free Tier + Auto-Deploy on main) & GitHub Actions CI/CD manifest
  app.get(['/api/v1/deployment/manifests', '/api/deployment/manifests'], (_req, res) => {
    const dbState = loadDatabase();
    const cfg = ensureDeploymentConfig(dbState);

    const renderYaml = `services:
  - type: web
    name: ca-post-officer-portal
    runtime: node
    plan: free
    region: frankfurt
    branch: ${cfg.branchName || 'main'}
    autoDeploy: true
    buildCommand: npm install && npm run build
    startCommand: npm run start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000`;

    const githubWorkflow = `name: Verify Build & Auto-Deploy to Render

on:
  push:
    branches: [ "${cfg.branchName || 'main'}" ]
  pull_request:
    branches: [ "${cfg.branchName || 'main'}" ]

jobs:
  build-and-verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install Dependencies
        run: npm install --legacy-peer-deps --no-audit --no-fund

      - name: TypeScript Check & Production Build
        run: npm run lint && npm run build

      - name: Optional Render Deploy Hook Trigger
        if: github.ref == 'refs/heads/${cfg.branchName || 'main'}'
        env:
          RENDER_DEPLOY_HOOK_URL: \${{ secrets.RENDER_DEPLOY_HOOK_URL }}
        run: |
          if [ -n "$RENDER_DEPLOY_HOOK_URL" ]; then
            curl -fsSL -X POST "$RENDER_DEPLOY_HOOK_URL"
          else
            echo "Kein RENDER_DEPLOY_HOOK_URL Secret gesetzt — Render Auto-Deploy ueber ${cfg.branchName || 'main'} Branch aktiv."
          fi`;

    res.json({
      renderYaml,
      githubWorkflow,
      deploymentConfig: cfg
    });
  });

  // ADMIN ONLY: Update GitHub Repository URL, Render Service URL & Setup Checklist Progress
  app.put('/api/admin/deployment-config', (req, res) => {
    const {
      adminUid,
      githubRepoUrl,
      renderServiceUrl,
      renderDeployHookUrl,
      branchName,
      autoDeployEnabled,
      completedSteps
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res
        .status(403)
        .json({ error: 'Nur der Administrator kann die Deployment-Konfiguration ändern.' });
      return;
    }

    if (
      (typeof githubRepoUrl === 'string' && !isSafeHttpUrl(githubRepoUrl.trim())) ||
      (typeof renderServiceUrl === 'string' && !isSafeHttpUrl(renderServiceUrl.trim()))
    ) {
      res.status(400).json({ error: 'Adressen müssen mit http:// oder https:// beginnen.' });
      return;
    }
    if (typeof renderDeployHookUrl === 'string' && !isRenderDeployHook(renderDeployHookUrl.trim())) {
      res.status(400).json({
        error: 'Der Deploy-Hook muss mit https://api.render.com/deploy/ beginnen.'
      });
      return;
    }

    const cfg = ensureDeploymentConfig(dbState);
    if (typeof githubRepoUrl === 'string') cfg.githubRepoUrl = githubRepoUrl.trim();
    if (typeof renderServiceUrl === 'string') cfg.renderServiceUrl = renderServiceUrl.trim();
    if (typeof renderDeployHookUrl === 'string')
      cfg.renderDeployHookUrl = renderDeployHookUrl.trim();
    if (typeof branchName === 'string' && branchName.trim()) {
      cfg.branchName = limitText(branchName.trim(), 100);
    }
    if (typeof autoDeployEnabled === 'boolean') cfg.autoDeployEnabled = autoDeployEnabled;
    if (Array.isArray(completedSteps)) {
      cfg.completedSteps = completedSteps.slice(0, 50).map(step => limitText(step, 100));
    }
    cfg.updatedIso = new Date().toISOString();

    saveDatabase(dbState);
    res.json({ ok: true, deploymentConfig: cfg });
  });

  // ADMIN ONLY: verify one historical passed exam result; identity comes only from the session.
  app.post('/api/admin/exams/legacy-verifications', async (req, res, next) => {
    try {
      const sessionUid = res.locals.sessionUid as string;
      const dbState = loadDatabase();
      const caller = dbState.accounts.find(account => account.uid === sessionUid);
      if (!caller || caller.publicProfile.role !== 'admin') {
        res.status(403).json({ error: 'Nur der Administrator kann historische Prüfungsergebnisse verifizieren.' });
        return;
      }

      const { legacyProgressId, reason } = req.body as {
        legacyProgressId?: string;
        reason?: string;
      };
      if (
        typeof legacyProgressId !== 'string' ||
        !legacyProgressId.trim() ||
        legacyProgressId.length > 500 ||
        typeof reason !== 'string' ||
        !reason.trim() ||
        reason.length > 1000
      ) {
        res.status(400).json({ error: 'Bitte einen gültigen Legacy-Nachweis und eine Begründung mit maximal 1.000 Zeichen angeben.' });
        return;
      }

      const source = dbState.progress.find(record => record.id === legacyProgressId);
      if (!source) {
        res.status(404).json({ error: 'Der historische Fortschrittsdatensatz wurde nicht gefunden.' });
        return;
      }

      const legacyRecord: LegacyProgressRecord = {
        id: source.id,
        userId: source.userId,
        targetId: source.targetId,
        targetType: source.targetType,
        status: source.status,
        scorePercent: source.scorePercent,
        attempts: source.attempts,
        ...(source.courseCode !== undefined ? { courseCode: source.courseCode } : {}),
        ...(source.updatedIso !== undefined ? { updatedIso: source.updatedIso } : {})
      };

      let verification;
      try {
        verification = createLegacyVerificationDoc(
          legacyRecord,
          caller.uid,
          new Date().toISOString(),
          reason
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        if (code === 'EXAM_LEGACY_SOURCE_NOT_VERIFIABLE') {
          res.status(409).json({ error: 'Nur historische, bereits bestandene Prüfungen können verifiziert werden.' });
          return;
        }
        if (code === 'EXAM_LEGACY_COURSE_INVALID') {
          res.status(409).json({ error: 'Der historische Lehrgangscode ist ungültig. Der Nachweis kann nicht sicher zugeordnet werden.' });
          return;
        }
        if (code === 'EXAM_LEGACY_SCORE_INVALID') {
          res.status(409).json({ error: 'Das historische Prüfungsergebnis ist ungültig und kann nicht verifiziert werden.' });
          return;
        }
        if (code === 'EXAM_LEGACY_VERIFICATION_INVALID') {
          res.status(400).json({ error: 'Der historische Datensatz enthält keine gültigen Verifikationsdaten.' });
          return;
        }
        throw error;
      }

      const repository = getExamRepository();
      if (examMaintenanceActive || await repository.isMaintenanceMode()) {
        res.status(503).json({
          error: 'Prüfungsfunktionen sind wegen einer laufenden Datensicherung oder Wiederherstellung vorübergehend pausiert.'
        });
        return;
      }
      if (await repository.getLegacyVerification(legacyRecord.id)) {
        res.status(409).json({ error: 'Dieser historische Nachweis wurde bereits verifiziert.' });
        return;
      }

      try {
        await repository.createLegacyVerification(verification);
      } catch (error) {
        // The create-only repository operation also protects against concurrent duplicate requests.
        if (error instanceof Error && error.message === 'EXAM_DOCUMENT_ALREADY_EXISTS') {
          res.status(409).json({ error: 'Dieser historische Nachweis wurde bereits verifiziert.' });
          return;
        }
        throw error;
      }

      res.status(201).json({ ok: true, verification });
    } catch (error) {
      next(error);
    }
  });

  // ADMIN ONLY: Idempotently migrate legacy exams and progress into ExamRepository.
  app.post('/api/admin/exams/migrate-legacy', async (_req, res, next) => {
    const sessionUid = res.locals.sessionUid as string;
    const initialState = peekDatabase();
    const initialCaller = initialState.accounts.find(account => account.uid === sessionUid);
    if (!initialCaller || initialCaller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Nur der Administrator kann die historische Prüfungs-Migration starten.' });
      return;
    }
    if (examMaintenanceActive) {
      res.status(503).json({ error: 'Eine Datensicherung, Wiederherstellung oder Migration läuft bereits.' });
      return;
    }

    const repository = getExamRepository();
    let maintenanceStarted = false;
    try {
      examMaintenanceActive = true;
      examMaintenanceOperation = 'migration';
      await repository.setMaintenanceMode(true);
      maintenanceStarted = true;

      const dbState = loadDatabase();
      const caller = dbState.accounts.find(account => account.uid === sessionUid);
      if (!caller || caller.publicProfile.role !== 'admin') {
        throw new Error('EXAM_MIGRATION_ADMIN_SESSION_INVALID');
      }
      const summary = await migrateLegacyExamData(
        repository,
        dbState.exams as LegacyExamInput[],
        dbState.progress as LegacyProgressRecord[]
      );

      appendAuditLog(
        dbState,
        caller,
        'SYSTEM_BACKUP',
        'Legacy-Prüfungsdaten migriert',
        'ExamRepository',
        `Prüfungen: ${summary.exams.imported} neu, ${summary.exams.updated} aktualisiert, ${summary.exams.alreadyMigrated} bereits vorhanden, ${summary.exams.skipped} übersprungen. Fortschritt: ${summary.progress.imported} neu, ${summary.progress.updated} aktualisiert, ${summary.progress.alreadyMigrated} bereits vorhanden, ${summary.progress.skipped} übersprungen.`
      );
      await saveDatabaseAndWait(dbState);
      await repository.setMaintenanceMode(false);
      maintenanceStarted = false;
      examMaintenanceActive = false;
      examMaintenanceOperation = null;

      res.json({ ok: true, complete: summary.issues.length === 0, summary });
    } catch (error) {
      if (maintenanceStarted) {
        try {
          // Die Migration ist idempotent; ein Teilstand kann sicher erneut verarbeitet werden.
          await repository.setMaintenanceMode(false);
          examMaintenanceActive = false;
          examMaintenanceOperation = null;
        } catch (releaseError) {
          console.error('[Exam Migration] Wartungsmodus konnte nach Fehler nicht aufgehoben werden:', releaseError);
        }
      } else {
        // The persistent lock was not acquired by this process. Do not leave a stale local
        // maintenance flag behind; the middleware checks the shared repository flag per request.
        examMaintenanceActive = false;
        examMaintenanceOperation = null;
      }
      next(error);
    }
  });

  // ADMIN ONLY: Complete portal + ExamRepository backup.
  app.get('/api/admin/backup', async (_req, res, next) => {
    const sessionUid = res.locals.sessionUid as string;
    const initialState = peekDatabase();
    const initialCaller = initialState.accounts.find(account => account.uid === sessionUid);
    if (!initialCaller || initialCaller.publicProfile.role !== 'admin') {
      res.status(403).json({
        error: 'Zugriff verweigert. Nur der Administrator kann Datenbank-Backups exportieren.'
      });
      return;
    }

    if (examMaintenanceActive) {
      res.status(503).json({
        error: 'Eine Datensicherung oder Wiederherstellung läuft bereits. Bitte warte, bis sie abgeschlossen ist.'
      });
      return;
    }

    const repository = getExamRepository();
    const academy = getAcademyRepository();
    let maintenanceStarted = false;
    try {
      // Das persistente Flag pausiert Prüfungs- und Academy-Schreibwege während des gemeinsamen Snapshots.
      examMaintenanceActive = true;
      examMaintenanceOperation = 'backup';
      await repository.setMaintenanceMode(true);
      maintenanceStarted = true;
      await academy.setMaintenanceMode(true);

      const dbState = loadDatabase();
      const caller = dbState.accounts.find(account => account.uid === sessionUid);
      if (!caller || caller.publicProfile.role !== 'admin') {
        throw new Error('BACKUP_ADMIN_SESSION_INVALID');
      }

      const examSnapshot = await repository.exportSnapshot();
      const academySnapshot = await academy.exportSnapshot();
      validateLegacyVerificationSources(examSnapshot, dbState.exams, dbState.progress);
      const academyRepositoryCounts = Object.fromEntries(
        Object.entries(academySnapshot.collections).map(([collection, documents]) => [collection, documents.length])
      ) as PortalBackupSnapshot['summary']['academyRepositoryCounts'];
      const examSummary = {
        exam_masters: examSnapshot.collections.exam_masters.length,
        exam_versions: examSnapshot.collections.exam_versions.length,
        exam_attempts: examSnapshot.collections.exam_attempts.length,
        exam_progress: examSnapshot.collections.exam_progress.length,
        exam_legacy_verifications: examSnapshot.collections.exam_legacy_verifications.length,
        exam_comments: examSnapshot.collections.exam_comments.length,
        exam_publication_requests: examSnapshot.collections.exam_publication_requests.length
      };

      const nowIso = new Date().toISOString();
      const cfg = ensureDeploymentConfig(dbState);
      cfg.lastBackupExportIso = nowIso;
      cfg.updatedIso = nowIso;
      appendAuditLog(
        dbState,
        caller,
        'SYSTEM_BACKUP',
        'Portal-, Academy- und Prüfungsdatenexport (ohne private Notizen)',
        'CA_POST_PORTAL_BACKUP_V5',
        `${dbState.accounts.length} Konten, ${Object.values(academyRepositoryCounts).reduce((sum, count) => sum + count, 0)} gemeinsame Academy-Datensätze und ${Object.values(examSummary).reduce((sum, count) => sum + count, 0)} neue Prüfungsdatensätze gesichert.`
      );
      await saveDatabaseAndWait(dbState);

      // A full admin backup intentionally includes legacy PDFs, but loads them one at a time
      // rather than keeping every PDF resident in the normal server state.
      const backupModules: TrainingModuleDoc[] = [];
      for (const module of dbState.modules) {
        const internal = module as ModuleWithLazyBlobs;
        const { __lazyBlobChunks, ...plainModule } = internal;
        let pdfDataUrl = module.pdfDataUrl || '';
        const lazyChunkCount = __lazyBlobChunks?.pdfDataUrl;
        if (!pdfDataUrl && lazyChunkCount) {
          if (!store) throw new Error('BACKUP_PDF_BLOB_STORE_UNAVAILABLE');
          pdfDataUrl = await store.loadBlobChunks('modules', module.id, 'pdfDataUrl', lazyChunkCount);
        }
        backupModules.push({ ...plainModule, pdfDataUrl });
      }

      const snapshot: PortalBackupSnapshot = {
        snapshotFormat: 'CA_POST_PORTAL_BACKUP_V5',
        exportedAtIso: nowIso,
        exportedByUsername: caller.username,
        summary: {
          accountsCount: dbState.accounts.length,
          modulesCount: dbState.modules.length,
          examsCount: dbState.exams.length,
          applicationsCount: dbState.applications.length,
          progressCount: dbState.progress.length,
          academyCoursesCount: (dbState.academy_courses || []).length,
          academyCourseVersionsCount: (dbState.academy_course_versions || []).length,
          academyProgramsCount: (dbState.academy_programs || []).length,
          academyProgramVersionsCount: (dbState.academy_program_versions || []).length,
          academyCourseParticipationsCount: (dbState.academy_course_participations || []).length,
          academyProgramParticipationsCount: (dbState.academy_program_participations || []).length,
          academyProgressEvidenceCount: (dbState.academy_progress_evidence || []).length,
          academyCompletionCorrectionsCount: (dbState.academy_completion_corrections || []).length,
          academyRepositoryCounts,
          announcementsCount: (dbState.announcements || []).length,
          messagesCount: (dbState.messages || []).length,
          requestsCount: (dbState.requests || []).length,
          eventsCount: (dbState.events || []).length,
          auditLogsCount: (dbState.auditLogs || []).length,
          examMastersCount: examSummary.exam_masters,
          examVersionsCount: examSummary.exam_versions,
          examAttemptsCount: examSummary.exam_attempts,
          examProgressCount: examSummary.exam_progress,
          examLegacyVerificationsCount: examSummary.exam_legacy_verifications,
          examCommentsCount: examSummary.exam_comments,
          examPublicationRequestsCount: examSummary.exam_publication_requests
        },
        examRepository: {
          ...examSnapshot,
          summary: examSummary
        },
        academyRepository: academySnapshot,
        database: {
          version: dbState.version || 3,
          accounts: dbState.accounts,
          applications: dbState.applications,
          modules: backupModules,
          exams: dbState.exams,
          progress: dbState.progress,
          academy_courses: dbState.academy_courses || [],
          academy_course_versions: dbState.academy_course_versions || [],
          academy_programs: dbState.academy_programs || [],
          academy_program_versions: dbState.academy_program_versions || [],
          academy_course_participations: dbState.academy_course_participations || [],
          academy_program_participations: dbState.academy_program_participations || [],
          academy_progress_evidence: dbState.academy_progress_evidence || [],
          academy_completion_corrections: dbState.academy_completion_corrections || [],
          announcements: dbState.announcements || [],
          messages: dbState.messages || [],
          requests: dbState.requests || [],
          events: dbState.events || [],
          auditLogs: dbState.auditLogs || [],
          notifications: dbState.notifications || [],
          deploymentConfig: cfg
        }
      };

      // Release the Academy adapter lock as well as the shared Exam lock.
      // Keep the global maintenance flag active until both stores are writable again.
      await academy.setMaintenanceMode(false);
      await repository.setMaintenanceMode(false);
      maintenanceStarted = false;
      examMaintenanceActive = false;
      examMaintenanceOperation = null;
      res.json(snapshot);
    } catch (error) {
      if (maintenanceStarted) {
        try {
          await academy.setMaintenanceMode(false);
          await repository.setMaintenanceMode(false);
          examMaintenanceActive = false;
          examMaintenanceOperation = null;
        } catch (releaseError) {
          console.error('[Backup] Wartungsmodus konnte nach fehlgeschlagenem Export nicht aufgehoben werden:', releaseError);
        }
      } else {
        try {
          examMaintenanceActive = await repository.isMaintenanceMode();
          examMaintenanceOperation = examMaintenanceActive ? 'restore' : null;
        } catch {
          examMaintenanceActive = true;
        }
      }
      next(error);
    }
  });

  // ADMIN ONLY: Restore a complete V4 snapshot across portal state and ExamRepository.
  app.post('/api/admin/restore', async (req, res, next) => {
    const sessionUid = res.locals.sessionUid as string;
    const currentState = loadDatabase();
    const caller = currentState.accounts.find(account => account.uid === sessionUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({
        error: 'Zugriff verweigert. Nur der Administrator kann ein Datenbank-Backup einspielen.'
      });
      return;
    }

    const snapshot = req.body?.snapshot as (Omit<Partial<PortalBackupSnapshot>, 'snapshotFormat'> & { snapshotFormat?: string }) | undefined;
    if (
      !snapshot ||
      typeof snapshot !== 'object' ||
      (snapshot.snapshotFormat !== 'CA_POST_PORTAL_BACKUP_V4' && snapshot.snapshotFormat !== 'CA_POST_PORTAL_BACKUP_V5') ||
      typeof snapshot.exportedAtIso !== 'string' ||
      Number.isNaN(Date.parse(snapshot.exportedAtIso)) ||
      typeof snapshot.exportedByUsername !== 'string' ||
      !snapshot.database ||
      typeof snapshot.database !== 'object' ||
      !snapshot.examRepository ||
      typeof snapshot.examRepository !== 'object'
    ) {
      res.status(400).json({
        error: 'Ungültiges oder unvollständiges Backup. Unterstützt werden vollständige V4- und V5-Backups.'
      });
      return;
    }

    const rawDb = snapshot.database as Partial<PortalDatabaseState>;
    const requiredArrays = [
      'accounts', 'applications', 'modules', 'exams', 'progress',
      'announcements', 'messages', 'requests', 'events', 'auditLogs', 'notifications'
    ] as const;
    if (
      !requiredArrays.every(key => Array.isArray(rawDb[key])) ||
      !Number.isSafeInteger(rawDb.version) ||
      !rawDb.deploymentConfig ||
      typeof rawDb.deploymentConfig !== 'object' ||
      Array.isArray(rawDb.deploymentConfig) ||
      !rawDb.accounts?.length ||
      !rawDb.accounts.every(account =>
        account && typeof account.uid === 'string' && account.uid.trim().length > 0 &&
        account.publicProfile && typeof account.publicProfile === 'object'
      ) ||
      new Set(rawDb.accounts.map(account => account.uid)).size !== rawDb.accounts.length
    ) {
      res.status(400).json({
        error: 'Das Backup enthält nicht alle erforderlichen Portal-Daten oder keine gültigen Benutzerkonten.'
      });
      return;
    }

    let examSnapshot;
    let academySnapshot: ReturnType<typeof validateAcademyRepositoryBackupSnapshot> | null = null;
    try {
      examSnapshot = validateExamRepositorySnapshot(snapshot.examRepository);
      validateLegacyVerificationSources(examSnapshot, rawDb.exams, rawDb.progress);
      if (snapshot.snapshotFormat === 'CA_POST_PORTAL_BACKUP_V5') {
        academySnapshot = validateAcademyRepositoryBackupSnapshot(snapshot.academyRepository);
        const expectedAcademyCounts = Object.fromEntries(
          Object.entries(academySnapshot.collections).map(([collection, documents]) => [collection, documents.length])
        );
        const actualAcademyCounts = snapshot.summary?.academyRepositoryCounts;
        if (
          !actualAcademyCounts ||
          Object.entries(expectedAcademyCounts).some(([collection, count]) =>
            actualAcademyCounts[collection as keyof typeof actualAcademyCounts] !== count
          )
        ) {
          throw new Error('ACADEMY_BACKUP_SUMMARY_MISMATCH');
        }
      }

      const examCounts = snapshot.examRepository.summary;
      const expectedExamCounts = {
        exam_masters: examSnapshot.collections.exam_masters.length,
        exam_versions: examSnapshot.collections.exam_versions.length,
        exam_attempts: examSnapshot.collections.exam_attempts.length,
        exam_progress: examSnapshot.collections.exam_progress.length,
        exam_legacy_verifications: examSnapshot.collections.exam_legacy_verifications.length,
        exam_comments: examSnapshot.collections.exam_comments.length,
        exam_publication_requests: examSnapshot.collections.exam_publication_requests.length
      };
      if (
        !examCounts ||
        Object.entries(expectedExamCounts).some(([key, count]) => {
          const actual = examCounts[key as keyof typeof expectedExamCounts];
          return actual !== undefined ? actual !== count : count !== 0;
        })
      ) {
        throw new Error('EXAM_BACKUP_SUMMARY_MISMATCH');
      }

      const summary = snapshot.summary;
      const expectedTopExamCounts = {
        examMastersCount: expectedExamCounts.exam_masters,
        examVersionsCount: expectedExamCounts.exam_versions,
        examAttemptsCount: expectedExamCounts.exam_attempts,
        examProgressCount: expectedExamCounts.exam_progress,
        examLegacyVerificationsCount: expectedExamCounts.exam_legacy_verifications,
        examCommentsCount: expectedExamCounts.exam_comments,
        examPublicationRequestsCount: expectedExamCounts.exam_publication_requests
      };
      if (
        !summary ||
        Object.entries(expectedTopExamCounts).some(([key, count]) =>
          summary[key as keyof typeof expectedTopExamCounts] !== undefined
            ? summary[key as keyof typeof expectedTopExamCounts] !== count
            : count !== 0
        )
      ) {
        throw new Error('PORTAL_BACKUP_EXAM_SUMMARY_MISMATCH');
      }
      const expectedPortalCounts = {
        accountsCount: rawDb.accounts.length,
        applicationsCount: rawDb.applications!.length,
        modulesCount: rawDb.modules!.length,
        examsCount: rawDb.exams!.length,
        progressCount: rawDb.progress!.length,
        announcementsCount: rawDb.announcements!.length,
        messagesCount: rawDb.messages!.length,
        requestsCount: rawDb.requests!.length,
        eventsCount: rawDb.events!.length,
        auditLogsCount: rawDb.auditLogs!.length
      };
      if (
        !summary ||
        Object.entries(expectedPortalCounts).some(([key, count]) =>
          summary[key as keyof typeof expectedPortalCounts] !== count
        )
      ) {
        throw new Error('PORTAL_BACKUP_SUMMARY_MISMATCH');
      }
    } catch (error) {
      console.warn('[Backup Restore] Backup-Prüfung fehlgeschlagen:', error);
      res.status(400).json({
        error: 'Das Backup ist unvollständig oder enthält ungültige Prüfungsdaten beziehungsweise beschädigte Referenzen. Es wurden keine Daten verändert.'
      });
      return;
    }

    const repository = getExamRepository();
    const academy = getAcademyRepository();
    if (examRestoreInProgress || (examMaintenanceActive && examMaintenanceOperation !== 'restore')) {
      res.status(503).json({
        error: 'Eine Datensicherung oder Wiederherstellung läuft bereits. Bitte warte, bis sie abgeschlossen ist.'
      });
      return;
    }
    examRestoreInProgress = true;
    try {
      // Auch ein zuvor fehlgeschlagener Restore darf nur über einen erneuten vollständigen Restore fortgesetzt werden.
      examMaintenanceActive = true;
      examMaintenanceOperation = 'restore';
      await repository.setMaintenanceMode(true, true);
      await academy.setMaintenanceMode(true);

      const nowIso = new Date().toISOString();
      const restoredAccounts: StoredAccountRecord[] = rawDb.accounts!.map(acc => ({
        ...acc,
        sessionVersion: Math.max(
          acc.sessionVersion ?? 0,
          currentState.accounts.find(current => current.uid === acc.uid)?.sessionVersion ?? 0
        ),
        isOnline: acc.uid === caller.uid ? true : Boolean(acc.isOnline),
        lastSeenIso: acc.uid === caller.uid ? nowIso : acc.lastSeenIso || nowIso,
        publicProfile: {
          ...acc.publicProfile,
          granularPermissions:
            acc.publicProfile?.granularPermissions ||
            getDefaultGranularPermissions(acc.publicProfile?.role || 'trainee'),
          isOnline: acc.uid === caller.uid ? true : Boolean(acc.publicProfile?.isOnline),
          lastSeenIso: acc.uid === caller.uid ? nowIso : acc.publicProfile?.lastSeenIso || nowIso
        }
      }));

      if (!restoredAccounts.some(account => account.uid === caller.uid)) {
        restoredAccounts.unshift({
          ...caller,
          isOnline: true,
          lastSeenIso: nowIso
        });
      }

      const currentCfg = ensureDeploymentConfig(currentState);
      const incomingCfg = rawDb.deploymentConfig || currentCfg;
      const nextState: PortalDatabaseState = {
        version: 3,
        accounts: restoredAccounts,
        applications: rawDb.applications!,
        modules: rawDb.modules!,
        exams: rawDb.exams!,
        progress: rawDb.progress!,
        announcements: rawDb.announcements!,
        messages: rawDb.messages!,
        requests: rawDb.requests!,
        events: rawDb.events!,
        auditLogs: rawDb.auditLogs!,
        notifications: rawDb.notifications!,
        // Backups predating Academy domain collections remain restorable without erasing
        // Academy data that was created after that backup was taken.
        academy_courses: rawDb.academy_courses || currentState.academy_courses || [],
        academy_course_versions: rawDb.academy_course_versions || currentState.academy_course_versions || [],
        academy_programs: rawDb.academy_programs || currentState.academy_programs || [],
        academy_program_versions: rawDb.academy_program_versions || currentState.academy_program_versions || [],
        academy_course_participations: rawDb.academy_course_participations || currentState.academy_course_participations || [],
        academy_program_participations: rawDb.academy_program_participations || currentState.academy_program_participations || [],
        academy_progress_evidence: rawDb.academy_progress_evidence || currentState.academy_progress_evidence || [],
        academy_completion_corrections: rawDb.academy_completion_corrections || currentState.academy_completion_corrections || [],
        // Private notes are intentionally excluded from administrator-readable exports.
        // A restore must never import or overwrite them; keep the live owner-private collection intact.
        academy_private_notes: currentState.academy_private_notes || [],
        deploymentConfig: {
          ...currentCfg,
          ...incomingCfg,
          lastBackupRestoreIso: nowIso,
          updatedIso: nowIso
        }
      };

      migrateLegacyPasswords(nextState);
      appendAuditLog(
        nextState,
        caller,
        'SYSTEM_BACKUP',
        'Portal- und Prüfungsdaten wiederhergestellt (private Notizen unverändert)',
        snapshot.snapshotFormat,
        `${nextState.accounts.length} Konten, ${academySnapshot ? Object.values(academySnapshot.collections).reduce((sum, documents) => sum + documents.length, 0) : 0} gemeinsame Academy-Datensätze und ${Object.values(snapshot.examRepository.summary).reduce((sum, count) => sum + count, 0)} neue Prüfungsdatensätze wiederhergestellt.`
      );

      // Alle drei Speichergrenzen bleiben gesperrt, bis sämtliche Wiederherstellungen bestätigt wurden.
      await saveDatabaseAndWait(nextState);
      await repository.restoreSnapshot(examSnapshot);
      if (academySnapshot) await academy.restoreSnapshot(academySnapshot);
      await academy.setMaintenanceMode(false);
      await repository.setMaintenanceMode(false);
      examMaintenanceActive = false;
      examMaintenanceOperation = null;

      res.json({
        ok: true,
        restoredAtIso: nowIso,
        summary: {
          accountsCount: nextState.accounts.length,
          modulesCount: nextState.modules.length,
          examsCount: nextState.exams.length,
          progressCount: nextState.progress.length,
          examMastersCount: examSnapshot.collections.exam_masters.length,
          examVersionsCount: examSnapshot.collections.exam_versions.length,
          examAttemptsCount: examSnapshot.collections.exam_attempts.length,
          examProgressCount: examSnapshot.collections.exam_progress.length,
          examLegacyVerificationsCount: examSnapshot.collections.exam_legacy_verifications.length,
          examCommentsCount: examSnapshot.collections.exam_comments.length,
          examPublicationRequestsCount: examSnapshot.collections.exam_publication_requests.length,
          academyRepositoryCounts: academySnapshot
            ? Object.fromEntries(Object.entries(academySnapshot.collections).map(([collection, documents]) => [collection, documents.length]))
            : null
        }
      });
    } catch (error) {
      console.error('[Backup Restore] Wiederherstellung fehlgeschlagen; Wartungsmodus bleibt aktiv:', error);
      res.status(503).json({
        error: 'Die Wiederherstellung ist fehlgeschlagen. Das Prüfungssystem bleibt aus Sicherheitsgründen im Wartungsmodus. Bitte starte die vollständige Wiederherstellung erneut oder lasse den Datenbestand administrativ prüfen.'
      });
    } finally {
      examRestoreInProgress = false;
    }
  });

  // ADMIN ONLY: Optional Render Deploy Hook Trigger
  app.post('/api/admin/trigger-deploy', async (req, res) => {
    const { adminUid, deployHookUrl } = req.body as {
      adminUid?: string;
      deployHookUrl?: string;
    };
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === adminUid);
    if (!caller || caller.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Nur der Administrator kann einen Render-Deploy auslösen.' });
      return;
    }

    const cfg = ensureDeploymentConfig(dbState);
    const targetHook = (deployHookUrl || cfg.renderDeployHookUrl || '').trim();
    if (!targetHook || !targetHook.startsWith('https://api.render.com/deploy/')) {
      res.status(400).json({
        error:
          'Bitte eine gültige Render Deploy Hook URL (beginnend mit https://api.render.com/deploy/...) hinterlegen.'
      });
      return;
    }

    try {
      const response = await fetch(targetHook, { method: 'POST' });
      if (!response.ok) {
        res.status(502).json({
          error: `Render hat den Deploy-Hook mit Status ${response.status} abgelehnt.`
        });
        return;
      }
      res.json({
        ok: true,
        triggeredAtIso: new Date().toISOString(),
        message: 'Render Deployment erfolgreich angestoßen.'
      });
    } catch {
      res.status(500).json({
        error: 'Verbindung zur Render Deploy Hook URL fehlgeschlagen.'
      });
    }
  });

  // ==========================================================================
  // MODULE 1: ANNOUNCEMENTS & FEED (/api/announcements)
  // ==========================================================================
  app.post('/api/announcements', (req, res) => {
    const { actorUid, title, category, priority, content, pinned } = req.body;
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    const callerPerms =
      caller?.publicProfile.granularPermissions ||
      (caller ? getDefaultGranularPermissions(caller.publicProfile.role) : undefined);

    if (
      !caller ||
      (caller.publicProfile.role !== 'admin' &&
        caller.publicProfile.role !== 'colonel' &&
        !callerPerms?.canPublishAnnouncements)
    ) {
      res.status(403).json({
        error:
          'Nur Administratoren, Colonels oder freigeschaltete Multiplikatoren können offizielle Bekanntmachungen veröffentlichen.'
      });
      return;
    }

    if (!title || !content) {
      res.status(400).json({ error: 'Bitte Titel und Inhalt der Bekanntmachung ausfüllen.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newAnnouncement: AnnouncementDoc = {
      id: newId('ann'),
      title: String(title).trim().slice(0, 160),
      category: (category as AnnouncementCategory) || 'Allgemeine Bekanntmachung',
      priority: (priority as AnnouncementPriority) || 'normal',
      content: String(content).trim().slice(0, 8000),
      authorUid: caller.uid,
      authorName: caller.publicProfile.displayName,
      authorRank: caller.publicProfile.rank,
      pinned: Boolean(pinned),
      acknowledgedByUids: [caller.uid],
      createdIso: nowIso
    };

    if (!Array.isArray(dbState.announcements)) {
      dbState.announcements = [];
    }
    dbState.announcements.unshift(newAnnouncement);

    appendAuditLog(
      dbState,
      caller,
      'ANNOUNCEMENT',
      `Offizielle Bekanntmachung veröffentlicht (${newAnnouncement.priority.toUpperCase()})`,
      newAnnouncement.title,
      `Kategorie: ${newAnnouncement.category}`
    );

    pushNotification(
      dbState,
      'ALL',
      'announcement_published',
      `Neue Bekanntmachung: ${newAnnouncement.title}`,
      `${caller.publicProfile.displayName} (${caller.publicProfile.rank}) hat eine ${newAnnouncement.category} veröffentlicht.`,
      'announcements'
    );

    saveDatabase(dbState);
    res.json({ ok: true, announcement: newAnnouncement });
  });

  app.post('/api/announcements/:id/ack', (req, res) => {
    const { id } = req.params;
    const { userUid } = req.body as { userUid?: string };
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === userUid);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const ann = (dbState.announcements || []).find(a => a.id === id);
    if (!ann) {
      res.status(404).json({ error: 'Bekanntmachung nicht gefunden.' });
      return;
    }

    if (!ann.acknowledgedByUids.includes(caller.uid)) {
      ann.acknowledgedByUids.push(caller.uid);
      saveDatabase(dbState);
    }

    res.json({ ok: true, announcement: ann });
  });

  app.delete('/api/announcements/:id', (req, res) => {
    const { id } = req.params;
    const actorUid = String(req.query.actorUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    const callerPerms =
      caller?.publicProfile.granularPermissions ||
      (caller ? getDefaultGranularPermissions(caller.publicProfile.role) : undefined);

    if (
      !caller ||
      (caller.publicProfile.role !== 'admin' &&
        caller.publicProfile.role !== 'colonel' &&
        !callerPerms?.canPublishAnnouncements)
    ) {
      res.status(403).json({ error: 'Keine Berechtigung zum Löschen von Bekanntmachungen.' });
      return;
    }

    const target = (dbState.announcements || []).find(a => a.id === id);
    dbState.announcements = (dbState.announcements || []).filter(a => a.id !== id);
    if (target) {
      appendAuditLog(
        dbState,
        caller,
        'ANNOUNCEMENT',
        'Bekanntmachung gelöscht',
        target.title,
        `Kategorie: ${target.category}`
      );
    }
    saveDatabase(dbState);
    res.json({ ok: true });
  });

  // ==========================================================================
  // MODULE 2: DIRECT MESSAGING & COMMUNICATION (/api/messages)
  // ==========================================================================
  app.post('/api/messages', (req, res) => {
    const { senderUid, recipientUid, subject, body, priority } = req.body;
    const dbState = loadDatabase();
    const sender = dbState.accounts.find(a => a.uid === senderUid);

    if (!sender) {
      res.status(401).json({ error: 'Absender-Konto nicht gefunden.' });
      return;
    }

    if (!subject || !body || !recipientUid) {
      res.status(400).json({ error: 'Bitte Empfänger, Betreff und Nachrichtentext angeben.' });
      return;
    }

    let recipientName = 'Alle Beamten (Rundschreiben)';
    let recipientBadge = 'ALL-UNITS';

    if (recipientUid !== 'ALL') {
      const targetAcc = dbState.accounts.find(a => a.uid === recipientUid);
      if (!targetAcc) {
        res.status(404).json({ error: 'Empfänger-Konto existiert nicht.' });
        return;
      }
      recipientName = targetAcc.publicProfile.displayName;
      recipientBadge = targetAcc.publicProfile.badgeNumber;
    } else if (
      sender.publicProfile.role !== 'admin' &&
      sender.publicProfile.role !== 'colonel'
    ) {
      res.status(403).json({
        error: 'Rundschreiben an alle Einheiten können nur von Admin oder Colonel gesendet werden.'
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const newMsg: DirectMessageDoc = {
      id: newId('msg'),
      senderUid: sender.uid,
      senderName: sender.publicProfile.displayName,
      senderBadge: sender.publicProfile.badgeNumber,
      senderRole: sender.publicProfile.role,
      recipientUid: String(recipientUid),
      recipientName,
      recipientBadge,
      subject: String(subject).trim().slice(0, 140),
      body: String(body).trim().slice(0, 5000),
      priority: (priority as MessagePriority) || 'routine',
      readByUids: [sender.uid],
      createdIso: nowIso
    };

    if (!Array.isArray(dbState.messages)) {
      dbState.messages = [];
    }
    dbState.messages.unshift(newMsg);

    pushNotification(
      dbState,
      String(recipientUid),
      'direct_message',
      `Neue Dienstnachricht: ${newMsg.subject}`,
      `Von ${sender.publicProfile.displayName} (${sender.publicProfile.badgeNumber})`,
      'messages'
    );

    saveDatabase(dbState);
    res.json({ ok: true, message: newMsg });
  });

  app.put('/api/messages/:id/read', (req, res) => {
    const { id } = req.params;
    const callerUid = res.locals.sessionUid as string;
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === callerUid);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const msg = (dbState.messages || []).find(m => m.id === id);
    if (!msg) {
      res.status(404).json({ error: 'Nachricht nicht gefunden.' });
      return;
    }
    if (!canAccessDirectMessage(msg, caller.uid)) {
      res.status(403).json({ error: 'Du bist nicht an dieser Nachricht beteiligt.' });
      return;
    }

    if (!msg.readByUids.includes(caller.uid)) {
      msg.readByUids.push(caller.uid);
      saveDatabase(dbState);
    }

    res.json({ ok: true, message: msg });
  });

  app.delete('/api/messages/:id', (req, res) => {
    const { id } = req.params;
    const actorUid = String(req.query.actorUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const msg = (dbState.messages || []).find(m => m.id === id);
    if (!msg) {
      res.status(404).json({ error: 'Nachricht nicht gefunden.' });
      return;
    }

    if (
      caller.publicProfile.role !== 'admin' &&
      msg.senderUid !== caller.uid &&
      msg.recipientUid !== caller.uid
    ) {
      res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieser Nachricht.' });
      return;
    }

    dbState.messages = (dbState.messages || []).filter(m => m.id !== id);
    saveDatabase(dbState);
    res.json({ ok: true });
  });

  // ==========================================================================
  // MODULE 3: OFFICIAL REQUESTS & REQUISITIONS (/api/requests)
  // ==========================================================================
  app.post('/api/requests', (req, res) => {
    const {
      category,
      title,
      requestedRole,
      targetDetail,
      justification,
      priority
    } = req.body;

    const dbState = loadDatabase();
    const sessionUid = res.locals.sessionUid as string | undefined;
    const caller = sessionUid ? dbState.accounts.find(a => a.uid === sessionUid) : undefined;
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const allowedCategories: RequestCategory[] = ['rank_change', 'clearance', 'award', 'transfer', 'loa', 'exam_workshop_access'];
    if (!allowedCategories.includes(category as RequestCategory)) {
      res.status(400).json({ error: 'Die Antragskategorie ist ungültig.' });
      return;
    }
    if (category === 'rank_change' && !isRankChangeRequestRole(requestedRole)) {
      res.status(400).json({ error: 'Der beantragte Zielrang ist ungültig.' });
      return;
    }
    if (category === 'exam_workshop_access') {
      const actor = resolveExamWorkshopActor(caller);
      if (!canRequestExamWorkshopAccess(actor)) {
        res.status(403).json({ error: 'Du darfst derzeit keinen Zugang zur Prüfungswerkstatt beantragen.' });
        return;
      }
      if (hasExamWorkshopAccess(actor)) {
        res.status(409).json({ error: 'Du besitzt bereits Zugang zur Prüfungswerkstatt.' });
        return;
      }
      const areas = req.body?.examWorkshopAreas;
      if (!Array.isArray(areas) || areas.length < 1 || areas.length > 2 ||
          areas.some((area: unknown) => area !== 'tests' && area !== 'final_exams') || new Set(areas).size !== areas.length) {
        res.status(400).json({ error: 'Bitte wähle mindestens einen gültigen Prüfungsbereich aus.' });
        return;
      }
      if ((dbState.requests || []).some(item =>
        item.requesterUid === caller.uid && item.category === 'exam_workshop_access' && item.status === 'pending'
      )) {
        res.status(409).json({ error: 'Für dein Konto liegt bereits ein offener Zugangsantrag vor.' });
        return;
      }
    }

    if (!title || !justification) {
      res.status(400).json({ error: 'Bitte Betreff und ausführliche Begründung angeben.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newReq: PortalRequestDoc = {
      id: newId('req'),
      requesterUid: caller.uid,
      requesterName: caller.publicProfile.displayName,
      requesterBadge: caller.publicProfile.badgeNumber,
      requesterCurrentRole: caller.publicProfile.role,
      category: (category as RequestCategory) || 'rank_change',
      title: String(title).trim().slice(0, 150),
      requestedRole: category === 'rank_change' ? requestedRole : undefined,
      ...(category === 'exam_workshop_access' ? { examWorkshopAreas: [...req.body.examWorkshopAreas] } : {}),
      targetDetail: String(targetDetail || '').trim().slice(0, 200),
      justification: String(justification).trim().slice(0, 4000),
      priority: priority === 'high' ? 'high' : 'normal',
      status: 'pending',
      createdIso: nowIso,
      updatedIso: nowIso
    };

    if (!Array.isArray(dbState.requests)) {
      dbState.requests = [];
    }
    dbState.requests.unshift(newReq);

    appendAuditLog(
      dbState,
      caller,
      'REQUEST_REVIEW',
      `Neuer Antrag eingereicht (${newReq.category})`,
      newReq.title,
      `Antragsteller: ${caller.publicProfile.displayName} (${caller.publicProfile.badgeNumber})`
    );
    if (newReq.category === 'exam_workshop_access') {
      appendAuditLog(dbState, caller, 'EXAM_WORKSHOP', 'Zugriff auf Prüfungswerkstatt beantragt', newReq.title,
        `Beantragte Bereiche: ${(newReq.examWorkshopAreas || []).join(', ')}.`);
    }

    // Notify Admin immediately in real-time when a new request is submitted
    const adminAcc = dbState.accounts.find(a => a.publicProfile.role === 'admin');
    if (adminAcc && adminAcc.uid !== caller.uid) {
      pushNotification(
        dbState,
        adminAcc.uid,
        'request_reviewed',
        `Neuer Antrag: ${newReq.title}`,
        `${caller.publicProfile.displayName} (${caller.publicProfile.badgeNumber}) hat einen neuen Antrag zur Admin-Prüfung eingereicht.`,
        'requests'
      );
    }

    saveDatabase(dbState);
    res.json({ ok: true, request: newReq });
  });

  app.put('/api/requests/:id/review', (req, res) => {
    const { id } = req.params;
    const { status, reviewerComment, applyRankChange } = req.body as {
      status?: RequestStatus;
      reviewerComment?: string;
      applyRankChange?: boolean;
    };

    const dbState = loadDatabase();
    const sessionUid = res.locals.sessionUid as string | undefined;
    const reviewer = sessionUid ? dbState.accounts.find(a => a.uid === sessionUid) : undefined;
    const reviewerPerms =
      reviewer?.publicProfile.granularPermissions ||
      (reviewer ? getDefaultGranularPermissions(reviewer.publicProfile.role) : undefined);

    if (
      !reviewer ||
      (reviewer.publicProfile.role !== 'admin' &&
        reviewer.publicProfile.role !== 'colonel' &&
        !reviewerPerms?.canReviewStandardRequests)
    ) {
      res.status(403).json({
        error:
          'Nur der Administrator (bzw. Colonel / freigeschaltete Prüfer für Fachanträge) kann Anträge bearbeiten.'
      });
      return;
    }

    const targetReq = (dbState.requests || []).find(r => r.id === id);
    if (!targetReq) {
      res.status(404).json({ error: 'Antrag nicht gefunden.' });
      return;
    }
    if (!isPendingPortalRequest(targetReq.status)) {
      res.status(409).json({ error: 'Dieser Antrag wurde bereits entschieden.' });
      return;
    }

    if (targetReq.category === 'exam_workshop_access' && reviewer.publicProfile.role !== 'admin') {
      res.status(403).json({ error: 'Zugangsanträge für die Prüfungswerkstatt dürfen ausschließlich vom Admin entschieden werden.' });
      return;
    }
    if (
      targetReq.category === 'rank_change' && targetReq.requestedRole !== undefined &&
      !isRankChangeRequestRole(targetReq.requestedRole)
    ) {
      res.status(409).json({ error: 'Der gespeicherte Zielrang des Antrags ist ungültig. Die Entscheidung wurde nicht gespeichert.' });
      return;
    }
    if (status !== 'approved' && status !== 'rejected') {
      res.status(400).json({ error: 'Der Antragsstatus ist ungültig.' });
      return;
    }

    // Strict Enforcement: Rank changes can ONLY be approved/applied by Admin!
    if (targetReq.category === 'rank_change' && reviewer.publicProfile.role !== 'admin') {
      res.status(403).json({
        error:
          'Rangänderungen und Beförderungen dürfen ausschließlich vom Administrator (Admin) genehmigt werden.'
      });
      return;
    }

    let workshopGrantAreas: Array<'tests' | 'final_exams'> | null = null;
    if (targetReq.category === 'exam_workshop_access' && status === 'approved') {
      const requestedAreas = Array.isArray(targetReq.examWorkshopAreas) ? targetReq.examWorkshopAreas : [];
      const rawGrantAreas = (req.body as { examWorkshopAreas?: unknown }).examWorkshopAreas;
      if (!Array.isArray(rawGrantAreas) || rawGrantAreas.length < 1 || rawGrantAreas.some((area: unknown) =>
        (area !== 'tests' && area !== 'final_exams') || !requestedAreas.includes(area as 'tests' | 'final_exams')
      ) || new Set(rawGrantAreas).size !== rawGrantAreas.length) {
        res.status(400).json({ error: 'Die Freigabe muss auf gültige, beantragte Prüfungsbereiche begrenzt sein.' });
        return;
      }
      if (!dbState.accounts.some(account => account.uid === targetReq.requesterUid)) {
        res.status(409).json({ error: 'Das antragstellende Konto existiert nicht mehr.' });
        return;
      }
      workshopGrantAreas = rawGrantAreas as Array<'tests' | 'final_exams'>;
    }

    const nowIso = new Date().toISOString();
    targetReq.status = status || 'approved';
    targetReq.reviewerUid = reviewer.uid;
    targetReq.reviewerName = reviewer.publicProfile.displayName;
    targetReq.reviewerComment = String(reviewerComment || '').trim().slice(0, 1500);
    targetReq.updatedIso = nowIso;

    let accessGrantedNote = '';
    if (targetReq.category === 'exam_workshop_access' && targetReq.status === 'approved') {
      const applicant = dbState.accounts.find(account => account.uid === targetReq.requesterUid);
      if (!applicant) {
        res.status(409).json({ error: 'Das antragstellende Konto existiert nicht mehr.' });
        return;
      }
      const currentPermissions = normalizeGranularPermissions(
        applicant.publicProfile.role,
        applicant.publicProfile.granularPermissions
      );
      const grantAreas = workshopGrantAreas || [];
      const previousWorkshop = currentPermissions.examWorkshop;
      const grantedCategory = { canView: true, canCreate: true, canEdit: true, canUpdateExisting: true };
      applicant.publicProfile.granularPermissions = {
        ...currentPermissions,
        examWorkshop: normalizeExamWorkshopPermissions(applicant.publicProfile.role, {
          ...previousWorkshop,
          hasAccess: true,
          ...(grantAreas.includes('tests') ? { tests: grantedCategory } : {}),
          ...(grantAreas.includes('final_exams') ? { finalExams: grantedCategory } : {})
        })
      };
      applicant.publicProfile.updatedIso = nowIso;
      accessGrantedNote = ' · Zugang zur Prüfungswerkstatt wurde erteilt';
      appendAuditLog(dbState, reviewer, 'EXAM_WORKSHOP', 'Zugriff auf Prüfungswerkstatt genehmigt', applicant.publicProfile.displayName,
        `Freigegebene Bereiche: ${grantAreas.join(', ')}. canGradeAssignedCourses blieb unverändert.`);
    }

    let rankPromotedNote = '';
    // If Admin approves a rank_change request and applyRankChange is true, automatically promote the account!
    if (
      reviewer.publicProfile.role === 'admin' &&
      targetReq.status === 'approved' &&
      targetReq.category === 'rank_change' &&
      targetReq.requestedRole &&
      applyRankChange !== false
    ) {
      const applicantAcc = dbState.accounts.find(a => a.uid === targetReq.requesterUid);
      if (applicantAcc && isRankChangeRequestRole(targetReq.requestedRole)) {
        const nextMeta = ROLE_HIERARCHY[targetReq.requestedRole];
        applicantAcc.publicProfile.role = targetReq.requestedRole;
        applicantAcc.publicProfile.rank = nextMeta.defaultRank;
        applicantAcc.publicProfile.clearanceLevel = nextMeta.defaultClearance;
        applicantAcc.publicProfile.granularPermissions = getDefaultGranularPermissions(
          targetReq.requestedRole
        );
        applicantAcc.publicProfile.updatedIso = nowIso;
        targetReq.requesterCurrentRole = targetReq.requestedRole;
        rankPromotedNote = ` · Automatisch auf ${targetReq.requestedRole.toUpperCase()} befördert`;
      }
    }

    appendAuditLog(
      dbState,
      reviewer,
      'REQUEST_REVIEW',
      `Antrag ${targetReq.status === 'approved' ? 'GENEHMIGT' : 'ABGELEHNT'} (${targetReq.category})`,
      `${targetReq.title} — ${targetReq.requesterName}`,
      `Entscheidung durch ${reviewer.publicProfile.displayName}: ${
        targetReq.reviewerComment || 'Keine Anmerkung'
      }${rankPromotedNote}${accessGrantedNote}`
    );
    if (targetReq.category === 'exam_workshop_access' && targetReq.status === 'rejected') {
      appendAuditLog(dbState, reviewer, 'EXAM_WORKSHOP', 'Zugangsantrag abgelehnt', `${targetReq.title} — ${targetReq.requesterName}`,
        targetReq.reviewerComment || 'Keine Begründung angegeben.');
    }

    pushNotification(
      dbState,
      targetReq.requesterUid,
      'request_reviewed',
      `Dein Antrag wurde ${targetReq.status === 'approved' ? 'GENEHMIGT' : 'ABGELEHNT'}`,
      `Antrag "${targetReq.title}" wurde von ${reviewer.publicProfile.displayName} bearbeitet.${
        targetReq.reviewerComment ? ` Vermerk: "${targetReq.reviewerComment}"` : ''
      }${rankPromotedNote}${accessGrantedNote}`,
      'requests'
    );

    saveDatabase(dbState);
    res.json({ ok: true, request: targetReq });
  });

  app.delete('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const actorUid = String(req.query.actorUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const targetReq = (dbState.requests || []).find(r => r.id === id);
    if (!targetReq) {
      res.status(404).json({ error: 'Antrag nicht gefunden.' });
      return;
    }

    if (caller.publicProfile.role !== 'admin' && targetReq.requesterUid !== caller.uid) {
      res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Antrags.' });
      return;
    }

    dbState.requests = (dbState.requests || []).filter(r => r.id !== id);
    saveDatabase(dbState);
    res.json({ ok: true });
  });

  // ==========================================================================
  // MODULE 4: INTERACTIVE CALENDAR & EVENTS (/api/events)
  // ==========================================================================
  app.post('/api/events', (req, res) => {
    const {
      actorUid,
      title,
      category,
      courseCode,
      location,
      startIso,
      durationMinutes,
      maxParticipants,
      description,
      mandatoryForRoles
    } = req.body;

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    const callerPerms =
      caller?.publicProfile.granularPermissions ||
      (caller ? getDefaultGranularPermissions(caller.publicProfile.role) : undefined);

    if (
      !caller ||
      (caller.publicProfile.role !== 'admin' &&
        caller.publicProfile.role !== 'colonel' &&
        !callerPerms?.canManageEvents)
    ) {
      res.status(403).json({
        error:
          'Zugriff verweigert. Nur Admin, Colonel oder mit Event-Berechtigung ausgestattete Ausbilder können Termine anlegen.'
      });
      return;
    }

    if (!title || !startIso) {
      res.status(400).json({ error: 'Bitte Titel und Startzeitpunkt des Termins angeben.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newEvent: CalendarEventDoc = {
      id: newId('evt'),
      title: String(title).trim().slice(0, 150),
      category: (category as CalendarEventCategory) || 'Training & Lehrgang',
      courseCode: courseCode ? String(courseCode).trim().toUpperCase() : undefined,
      location: String(location || 'Hauptquartier / Trainingszentrum').trim().slice(0, 140),
      startIso: String(startIso),
      durationMinutes: Number(durationMinutes) || 60,
      maxParticipants: Number(maxParticipants) || 20,
      instructorName: caller.publicProfile.displayName,
      instructorUid: caller.uid,
      description: String(description || '').trim().slice(0, 3000),
      mandatoryForRoles: Array.isArray(mandatoryForRoles) ? mandatoryForRoles : ['trainee', 'rookie'],
      attendees: [
        {
          uid: caller.uid,
          displayName: caller.publicProfile.displayName,
          badgeNumber: caller.publicProfile.badgeNumber,
          role: caller.publicProfile.role,
          status: 'attending',
          updatedIso: nowIso
        }
      ],
      createdIso: nowIso
    };

    if (!Array.isArray(dbState.events)) {
      dbState.events = [];
    }
    dbState.events.push(newEvent);
    dbState.events.sort(
      (a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime()
    );

    appendAuditLog(
      dbState,
      caller,
      'CALENDAR_EVENT',
      `Kalender-Termin angelegt (${newEvent.category})`,
      newEvent.title,
      `Ort: ${newEvent.location} · Start: ${new Date(newEvent.startIso).toLocaleString('de-DE')}`
    );

    pushNotification(
      dbState,
      'ALL',
      'event_created',
      `Neuer Termin: ${newEvent.title}`,
      `${newEvent.category} am ${new Date(newEvent.startIso).toLocaleDateString('de-DE')} (${newEvent.location}). Jetzt im Kalender an-/abmelden.`,
      'calendar'
    );

    saveDatabase(dbState);
    res.json({ ok: true, event: newEvent });
  });

  app.post('/api/events/:id/rsvp', (req, res) => {
    const { id } = req.params;
    const { userUid, status } = req.body as {
      userUid?: string;
      status?: 'attending' | 'declined' | 'remove';
    };

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === userUid);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const evt = (dbState.events || []).find(e => e.id === id);
    if (!evt) {
      res.status(404).json({ error: 'Termin nicht gefunden.' });
      return;
    }

    const attendingCount = evt.attendees.filter(
      a => a.status === 'attending' && a.uid !== caller.uid
    ).length;

    if (status === 'attending' && attendingCount >= evt.maxParticipants) {
      res.status(400).json({
        error: `Maximale Teilnehmerzahl (${evt.maxParticipants}) für diesen Termin ist bereits erreicht.`
      });
      return;
    }

    const nowIso = new Date().toISOString();
    evt.attendees = evt.attendees.filter(a => a.uid !== caller.uid);
    if (status === 'attending' || status === 'declined') {
      evt.attendees.push({
        uid: caller.uid,
        displayName: caller.publicProfile.displayName,
        badgeNumber: caller.publicProfile.badgeNumber,
        role: caller.publicProfile.role,
        status,
        updatedIso: nowIso
      });
    }

    saveDatabase(dbState);
    res.json({ ok: true, event: evt });
  });

  app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const actorUid = String(req.query.actorUid || '');
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === actorUid);
    const callerPerms =
      caller?.publicProfile.granularPermissions ||
      (caller ? getDefaultGranularPermissions(caller.publicProfile.role) : undefined);

    if (
      !caller ||
      (caller.publicProfile.role !== 'admin' &&
        caller.publicProfile.role !== 'colonel' &&
        !callerPerms?.canManageEvents)
    ) {
      res.status(403).json({ error: 'Keine Berechtigung zum Löschen von Terminen.' });
      return;
    }

    const target = (dbState.events || []).find(e => e.id === id);
    dbState.events = (dbState.events || []).filter(e => e.id !== id);
    if (target) {
      appendAuditLog(
        dbState,
        caller,
        'CALENDAR_EVENT',
        'Kalender-Termin gelöscht',
        target.title,
        `Kategorie: ${target.category}`
      );
    }
    saveDatabase(dbState);
    res.json({ ok: true });
  });

  // ==========================================================================
  // MODULE 5: LIVE NOTIFICATIONS (/api/notifications)
  // ==========================================================================
  app.put('/api/notifications/read-all', (req, res) => {
    const { userUid } = req.body as { userUid?: string };
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === userUid);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    for (const n of dbState.notifications || []) {
      if (
        (n.recipientUid === caller.uid || n.recipientUid === 'ALL') &&
        !n.readByUids.includes(caller.uid)
      ) {
        n.readByUids.push(caller.uid);
      }
    }
    saveDatabase(dbState);
    res.json({ ok: true });
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const { userUid } = req.body as { userUid?: string };
    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === userUid);
    if (!caller) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const notif = (dbState.notifications || []).find(n => n.id === id);
    if (notif && !notif.readByUids.includes(caller.uid)) {
      notif.readByUids.push(caller.uid);
      saveDatabase(dbState);
    }
    res.json({ ok: true });
  });

  // ==========================================================================
  // MODULE 6: SELF PROFILE SETTINGS (/api/profile/self)
  // ==========================================================================
  app.put('/api/profile/self', (req, res) => {
    const { uid, callsign, division, bio } = req.body as {
      uid?: string;
      callsign?: string;
      division?: string;
      bio?: string;
    };

    const dbState = loadDatabase();
    const caller = dbState.accounts.find(a => a.uid === uid);
    if (!caller) {
      res.status(401).json({ error: 'Sitzung ungültig.' });
      return;
    }

    const nowIso = new Date().toISOString();
    if (typeof callsign === 'string' && callsign.trim()) {
      caller.publicProfile.callsign = callsign.trim().slice(0, 20);
    }
    if (typeof division === 'string' && division.trim()) {
      caller.publicProfile.division = division.trim().slice(0, 60);
    }
    if (typeof bio === 'string') {
      caller.publicProfile.bio = bio.trim().slice(0, 500);
    }
    caller.publicProfile.updatedIso = nowIso;
    saveDatabase(dbState);

    res.json({ ok: true, user: caller.publicProfile });
  });

  // Ensure unknown /api/* requests always return JSON 404 instead of SPA index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `API-Endpunkt nicht gefunden: ${req.method} ${req.originalUrl}`
    });
  });

  const distPath = path.join(__dirname, 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

  if (isProd && !fs.existsSync(indexHtmlPath)) {
    throw new Error(
      `[Startup] Production build is missing: ${indexHtmlPath}. Run the frontend build before starting the server.`
    );
  }

  if (!isProd) {
    // Keep Vite and its development tooling out of the production process.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(indexHtmlPath);
    });
  }

  // Einheitliche Fehlerantwort: JSON statt HTML-Fehlerseite, keine internen Details nach außen.
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const { status, message } = describeError(err);
    if (status >= 500) console.error(`[Fehler] ${req.method} ${req.path}:`, err);
    res.status(status).json({ error: message });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CA-POST Officer Portal] Server listening on http://0.0.0.0:${PORT}`);
  });
}

process.on('unhandledRejection', reason => {
  console.error('[Fehler] Unbehandelte Promise-Ablehnung:', reason);
});

startServer().catch(err => {
  console.error('[Fehler] Server konnte nicht starten:', err);
  process.exit(1);
});
