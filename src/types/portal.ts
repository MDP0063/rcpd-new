import type { AcademyRepositoryBackupSnapshot } from './academy.ts';


export type OfficerRole = 'admin' | 'colonel' | 'officer' | 'rookie' | 'trainee';
export type WhitelistStatus = 'whitelisted' | 'probation' | 'pending' | 'suspended' | 'revoked';
export type ApplicationStatus = 'pending' | 'under_review' | 'interview_scheduled' | 'accepted' | 'rejected';
export type ModuleCategory =
  | 'SOP & Policy'
  | 'California Penal Code'
  | 'Tactical Operations'
  | 'Radio & Dispatch'
  | 'Field Training (FTO)'
  | 'Supervisor Directive';
export type ModuleEmbedType = 'pdf_upload' | 'document' | 'external_url' | 'interactive_code';
export type AssessmentStage = 'test' | 'final_exam';

export interface UserPublicProfile {
  uid: string;
  username?: string;
  displayName: string;
  badgeNumber: string;
  callsign: string;
  rank: string;
  role: OfficerRole;
  clearanceLevel: number;
  division: string;
  bio?: string;
  whitelistStatus: WhitelistStatus;
  granularPermissions?: GranularPermissions;
  isOnline?: boolean;
  lastSeenIso?: string;
  updatedIso?: string;
}

export interface UserPrivateProfile {
  uid: string;
  email: string;
  discordTag: string;
  steamHex: string;
  supervisorNotes: string;
  updatedIso?: string;
}

export interface AdminAccountView {
  uid: string;
  username: string;
  isOnline: boolean;
  lastSeenIso: string;
  publicProfile: UserPublicProfile;
  privateProfile: UserPrivateProfile;
}

export interface WhitelistApplicationDoc {
  id: string;
  applicantUid: string;
  applicantName: string;
  characterName: string;
  dateOfBirth: string;
  discordTag: string;
  priorExperience: string;
  scenarioResponse: string;
  penalCodeAck: boolean;
  status: ApplicationStatus;
  reviewerUid: string;
  reviewerFeedback: string;
  updatedIso?: string;
}

export interface TrainingModuleDoc {
  id: string;
  title: string;
  code: string;
  category: ModuleCategory;
  minClearance: number;
  requiredRole: OfficerRole;
  embedType: ModuleEmbedType;
  contentMarkdown: string;
  externalUrl: string;
  pdfDataUrl?: string;
  /** Vom Server gesetzt: es gibt ein PDF, das separat geladen wird. */
  hasPdf?: boolean;
  pdfFileName?: string;
  interactiveCode: string;
  estimatedMinutes: number;
  authorUid: string;
  updatedIso?: string;
}

/** Vollständige serverseitige Frage inklusive Lösungsschlüssel. */
export interface ExamQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** Öffentliche Frage, die an den Browser ausgeliefert werden darf. */
export interface ExamQuestionPublicItem {
  id: string;
  question: string;
  options: string[];
}

export interface AcademyExamDoc {
  id: string;
  title: string;
  moduleCode: string;
  assessmentStage: AssessmentStage; // 'test' (Übungstest: Trainee+) vs 'final_exam' (Abschlussprüfung: Rookie+)
  minClearance: number;
  passingScore: number;
  timeLimitMinutes: number;
  examFormat: 'interactive_code' | 'structured_quiz';
  questionsPayload: string;
  interactiveWidgetCode: string;
  authorUid: string;
  status?: 'draft' | 'published' | 'archived';
  archivedAtIso?: string;
  archivedByUid?: string;
  archivedReason?: string;
  updatedIso?: string;
}

export interface UserProgressDoc {
  id: string;
  userId: string;
  userName: string;
  targetId: string;
  targetType: 'module' | 'test' | 'final_exam';
  targetTitle: string;
  courseCode?: string;
  status: 'in_progress' | 'completed' | 'passed' | 'failed';
  scorePercent: number;
  attempts: number;
  evaluatedByName?: string;
  instructorFeedback?: string;
  updatedIso?: string;
}

export const ROLE_HIERARCHY: Record<
  OfficerRole,
  {
    label: string;
    rankOrder: number;
    defaultClearance: number;
    defaultRank: string;
    permissionsSummary: string;
    canEditAcademy: boolean;
    canAccessFinalExams: boolean;
    canManageUsers: boolean;
    canViewTechPipeline: boolean;
  }
> = {
  admin: {
    label: 'Admin (1. Rang — Höchste Instanz)',
    rankOrder: 1,
    defaultClearance: 10,
    defaultRank: 'Chief of Police / System Admin',
    permissionsSummary: 'Vollzugriff: Kann alle Konten, Passwörter, Rollen, Lehrmaterialien, Tests & Abschlussprüfungen verwalten.',
    canEditAcademy: true,
    canAccessFinalExams: true,
    canManageUsers: true,
    canViewTechPipeline: true
  },
  colonel: {
    label: 'Colonel (2. Rang — Stellv. Leitung)',
    rankOrder: 2,
    defaultClearance: 8,
    defaultRank: 'Colonel / Deputy Chief',
    permissionsSummary: 'Kann alle öffentlichen Inhalte sehen sowie Lehrmaterialien, PDFs, Tests und Abschlussprüfungen erstellen & bearbeiten. Keine Benutzerverwaltung.',
    canEditAcademy: true,
    canAccessFinalExams: true,
    canManageUsers: false,
    canViewTechPipeline: false
  },
  officer: {
    label: 'Officer (3. Rang — Vollzugsdienst)',
    rankOrder: 3,
    defaultClearance: 5,
    defaultRank: 'Patrol Officer',
    permissionsSummary: 'Zugriff auf Dashboard, Lehrmaterialien, Übungstests und Abschlussprüfungen. Keine Bearbeitungsrechte, keine technischen Menüs.',
    canEditAcademy: false,
    canAccessFinalExams: true,
    canManageUsers: false,
    canViewTechPipeline: false
  },
  rookie: {
    label: 'Rookie (4. Rang — Anwärter)',
    rankOrder: 4,
    defaultClearance: 3,
    defaultRank: 'Probationary Rookie',
    permissionsSummary: 'Sieht alle öffentlichen Infos, Lehrmaterialien, Übungstests sowie die Abschlussarbeit / Abschlussprüfung. Keine Bearbeitung.',
    canEditAcademy: false,
    canAccessFinalExams: true,
    canManageUsers: false,
    canViewTechPipeline: false
  },
  trainee: {
    label: 'Trainee (5. Rang — Standard-Einstieg)',
    rankOrder: 5,
    defaultClearance: 1,
    defaultRank: 'Academy Trainee',
    permissionsSummary: 'Sieht öffentliche Infos, Lehrmaterialien und Übungstests. KEIN Zugriff auf Abschlussprüfungen/Abschlussarbeiten und Verwaltung.',
    canEditAcademy: false,
    canAccessFinalExams: false,
    canManageUsers: false,
    canViewTechPipeline: false
  }
};

export type AnnouncementCategory =
  | 'Dienstanweisung'
  | 'Ausbildung & Academy'
  | 'Personal & Beförderungen'
  | 'Allgemeine Bekanntmachung';

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface AnnouncementDoc {
  id: string;
  title: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  content: string;
  authorUid: string;
  authorName: string;
  authorRank: string;
  pinned: boolean;
  acknowledgedByUids: string[];
  createdIso: string;
}

export type MessagePriority = 'routine' | 'urgent' | 'confidential';

export interface DirectMessageDoc {
  id: string;
  senderUid: string;
  senderName: string;
  senderBadge: string;
  senderRole: OfficerRole;
  recipientUid: string; // specific uid or 'ALL' for broadcast
  recipientName: string;
  recipientBadge: string;
  subject: string;
  body: string;
  priority: MessagePriority;
  readByUids: string[];
  /** Users who have hidden this message from their own inbox. */
  deletedByUids?: string[];
  createdIso: string;
}

export type RequestCategory =
  | 'rank_change'
  | 'clearance'
  | 'award'
  | 'transfer'
  | 'loa'
  | 'exam_workshop_access';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface PortalRequestDoc {
  id: string;
  requesterUid: string;
  requesterName: string;
  requesterBadge: string;
  requesterCurrentRole: OfficerRole;
  category: RequestCategory;
  title: string;
  requestedRole?: OfficerRole;
  targetDetail: string;
  examWorkshopAreas?: Array<'tests' | 'final_exams'>;
  justification: string;
  priority: 'normal' | 'high';
  status: RequestStatus;
  reviewerUid?: string;
  reviewerName?: string;
  reviewerComment?: string;
  createdIso: string;
  updatedIso: string;
}

export interface ExamWorkshopCategoryPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canUpdateExisting: boolean;
}

export interface ExamWorkshopPublicationPermissions {
  newTestsRequireApproval: boolean;
  newFinalExamsRequireApproval: boolean;
  testUpdatesRequireApproval: boolean;
  finalExamUpdatesRequireApproval: boolean;
}

/** Separate from course grading and all other granular Academy permissions. */
export interface ExamWorkshopPermissions {
  hasAccess: boolean;
  canRequestAccess: boolean;
  tests: ExamWorkshopCategoryPermissions;
  finalExams: ExamWorkshopCategoryPermissions;
  publication: ExamWorkshopPublicationPermissions;
  lockedUpdateExamIds: string[];
}

export interface GranularPermissions {
  assignedCourseCodes: string[]; // e.g. ['SOP-01', 'PC-102'] — allows instructor grading/editing only for these course codes
  canGradeAssignedCourses: boolean;
  canManageEvents: boolean;
  canPublishAnnouncements: boolean;
  canReviewStandardRequests: boolean; // Non-rank requests (rank changes remain strictly Admin-only)
  canExportReports: boolean;
  examWorkshop?: ExamWorkshopPermissions;
}

export interface AuditLogDoc {
  id: string;
  actorUid: string;
  actorName: string;
  actorBadge: string;
  actorRole: OfficerRole;
  category:
    | 'ACCOUNT_ROLE'
    | 'REQUEST_REVIEW'
    | 'ACADEMY_DOC'
    | 'ACADEMY_PROGRESS'
    | 'COURSE_GRADE'
    | 'ANNOUNCEMENT'
    | 'CALENDAR_EVENT'
    | 'SYSTEM_BACKUP'
    | 'EXAM_WORKSHOP';
  actionTitle: string;
  targetLabel: string;
  details: string;
  createdIso: string;
}

export interface PublicActivityDoc {
  id: string;
  actionType:
    | 'New Announcement'
    | 'New Training Module Published'
    | 'New Exam Published'
    | 'New Calendar Event Scheduled'
    | 'Training Module Updated';
  actionLabelDe: string;
  title: string;
  actorName: string;
  targetSection:
    | 'announcements'
    | 'academy'
    | 'calendar';
  createdIso: string;
}

export type CalendarEventCategory =
  | 'Training & Lehrgang'
  | 'Prüfungstermin'
  | 'Dienstbesprechung'
  | 'Sondereinsatz';

export interface CalendarEventAttendee {
  uid: string;
  displayName: string;
  badgeNumber: string;
  role: OfficerRole;
  status: 'attending' | 'declined';
  updatedIso: string;
}

export interface CalendarEventDoc {
  id: string;
  title: string;
  category: CalendarEventCategory;
  courseCode?: string;
  location: string;
  startIso: string;
  durationMinutes: number;
  maxParticipants: number;
  instructorName: string;
  instructorUid: string;
  description: string;
  mandatoryForRoles: OfficerRole[];
  attendees: CalendarEventAttendee[];
  createdIso: string;
}

export interface PortalNotificationDoc {
  id: string;
  recipientUid: string; // specific uid or 'ALL'
  type: 'request_reviewed' | 'announcement_published' | 'role_updated' | 'course_graded' | 'event_created' | 'direct_message' | 'exam_workshop_review' | 'academy_material_review';
  title: string;
  message: string;
  linkSection:
    | 'dashboard'
    | 'announcements'
    | 'messages'
    | 'requests'
    | 'academy'
    | 'calendar'
    | 'reports'
    | 'audit'
    | 'whitelist'
    | 'settings'
    | 'personnel'
    | 'exam_workshop';
  readByUids: string[];
  createdIso: string;
}

export interface PortalDeploymentConfig {
  githubRepoUrl: string;
  renderServiceUrl: string;
  renderDeployHookUrl: string;
  branchName: string;
  autoDeployEnabled: boolean;
  completedSteps: string[];
  lastBackupExportIso?: string;
  lastBackupRestoreIso?: string;
  updatedIso: string;
}

export interface PortalDbStats {
  accountsCount: number;
  onlineCount: number;
  modulesCount: number;
  examsCount: number;
  applicationsCount: number;
  progressCount: number;
  announcementsCount?: number;
  messagesCount?: number;
  requestsCount?: number;
  eventsCount?: number;
  auditLogsCount?: number;
  sizeBytes: number;
}

export interface ExamRepositoryBackupSnapshot {
  formatVersion: 1;
  collections: {
    exam_masters: Array<Record<string, unknown> & { id: string }>;
    exam_versions: Array<Record<string, unknown> & { id: string }>;
    exam_attempts: Array<Record<string, unknown> & { id: string }>;
    exam_progress: Array<Record<string, unknown> & { id: string }>;
    exam_legacy_verifications: Array<Record<string, unknown> & { id: string }>;
    exam_comments: Array<Record<string, unknown> & { id: string }>;
    exam_publication_requests: Array<Record<string, unknown> & { id: string }>;
  };
  summary: {
    exam_masters: number;
    exam_versions: number;
    exam_attempts: number;
    exam_progress: number;
    exam_legacy_verifications: number;
    exam_comments: number;
    exam_publication_requests: number;
  };
}

export interface PortalBackupSnapshot {
  snapshotFormat: 'CA_POST_PORTAL_BACKUP_V5';
  exportedAtIso: string;
  exportedByUsername: string;
  summary: {
    accountsCount: number;
    modulesCount: number;
    examsCount: number;
    applicationsCount: number;
    progressCount: number;
    academyCoursesCount?: number;
    academyCourseVersionsCount?: number;
    academyProgramsCount?: number;
    academyProgramVersionsCount?: number;
    academyCourseParticipationsCount?: number;
    academyProgramParticipationsCount?: number;
    academyProgressEvidenceCount?: number;
    academyCompletionCorrectionsCount?: number;
    academyRepositoryCounts: Record<keyof AcademyRepositoryBackupSnapshot['collections'], number>;
    announcementsCount?: number;
    messagesCount?: number;
    requestsCount?: number;
    eventsCount?: number;
    auditLogsCount?: number;
    examMastersCount: number;
    examVersionsCount: number;
    examAttemptsCount: number;
    examProgressCount: number;
    examLegacyVerificationsCount: number;
    examCommentsCount?: number;
    examPublicationRequestsCount?: number;
  };
  examRepository: ExamRepositoryBackupSnapshot;
  academyRepository: AcademyRepositoryBackupSnapshot;
  database: {
    version: number;
    accounts: AdminAccountView[];
    applications: WhitelistApplicationDoc[];
    modules: TrainingModuleDoc[];
    exams: AcademyExamDoc[];
    progress: UserProgressDoc[];
    academy_courses?: import('./academy').AcademyCourseMasterDoc[];
    academy_course_versions?: import('./academy').AcademyCourseVersionDoc[];
    academy_programs?: import('./academy').AcademyProgramMasterDoc[];
    academy_program_versions?: import('./academy').AcademyProgramVersionDoc[];
    academy_course_participations?: import('./academy').AcademyCourseParticipationDoc[];
    academy_program_participations?: import('./academy').AcademyProgramParticipationDoc[];
    academy_progress_evidence?: import('./academy').AcademyProgressEvidenceDoc[];
    academy_completion_corrections?: import('./academy').AcademyCompletionCorrectionDoc[];
    announcements?: AnnouncementDoc[];
    messages?: DirectMessageDoc[];
    requests?: PortalRequestDoc[];
    events?: CalendarEventDoc[];
    auditLogs?: AuditLogDoc[];
    notifications?: PortalNotificationDoc[];
    deploymentConfig?: PortalDeploymentConfig;
  };
}

export function sortRequestsPendingFirst(requests: PortalRequestDoc[]): PortalRequestDoc[] {
  return [...requests].sort((a, b) => {
    const aPending = a.status === 'pending' ? 0 : 1;
    const bPending = b.status === 'pending' ? 0 : 1;
    if (aPending !== bPending) {
      return aPending - bPending;
    }
    return new Date(b.createdIso).getTime() - new Date(a.createdIso).getTime();
  });
}
