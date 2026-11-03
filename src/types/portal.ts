import { Timestamp } from 'firebase/firestore';

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
  whitelistStatus: WhitelistStatus;
  isOnline?: boolean;
  lastSeenIso?: string;
  updatedIso?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserPrivateProfile {
  uid: string;
  email: string;
  discordTag: string;
  steamHex: string;
  supervisorNotes: string;
  updatedIso?: string;
  updatedAt?: Timestamp;
}

export interface AdminAccountView {
  uid: string;
  username: string;
  password: string;
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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
  pdfFileName?: string;
  interactiveCode: string;
  estimatedMinutes: number;
  authorUid: string;
  updatedIso?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ExamQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
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
  updatedIso?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProgressDoc {
  id: string;
  userId: string;
  userName: string;
  targetId: string;
  targetType: 'module' | 'test' | 'final_exam';
  targetTitle: string;
  status: 'in_progress' | 'completed' | 'passed' | 'failed';
  scorePercent: number;
  attempts: number;
  updatedIso?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
