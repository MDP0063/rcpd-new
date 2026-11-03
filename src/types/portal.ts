import { Timestamp } from 'firebase/firestore';

export type OfficerRole = 'applicant' | 'cadet' | 'officer' | 'fto' | 'supervisor' | 'admin';
export type WhitelistStatus = 'pending' | 'probation' | 'whitelisted' | 'suspended' | 'revoked';
export type ApplicationStatus = 'pending' | 'under_review' | 'interview_scheduled' | 'accepted' | 'rejected';
export type ModuleCategory =
  | 'SOP & Policy'
  | 'California Penal Code'
  | 'Tactical Operations'
  | 'Radio & Dispatch'
  | 'Field Training (FTO)'
  | 'Supervisor Directive';
export type ModuleEmbedType = 'document' | 'external_url' | 'interactive_code';
export type ExamFormatType = 'structured_quiz' | 'interactive_widget' | 'external_assessment';

export interface UserPublicProfile {
  uid: string;
  displayName: string;
  badgeNumber: string;
  callsign: string;
  rank: string;
  role: OfficerRole;
  clearanceLevel: number;
  division: string;
  whitelistStatus: WhitelistStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserPrivateProfile {
  uid: string;
  email: string;
  discordTag: string;
  steamHex: string;
  supervisorNotes: string;
  updatedAt?: Timestamp;
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
  interactiveCode: string;
  estimatedMinutes: number;
  authorUid: string;
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
  minClearance: number;
  passingScore: number;
  timeLimitMinutes: number;
  examFormat: ExamFormatType;
  questionsPayload: string;
  interactiveWidgetCode: string;
  authorUid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProgressDoc {
  id: string;
  userId: string;
  userName: string;
  targetId: string;
  targetType: 'module' | 'exam';
  targetTitle: string;
  status: 'in_progress' | 'completed' | 'passed' | 'failed';
  scorePercent: number;
  attempts: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const ROLE_HIERARCHY: Record<OfficerRole, { label: string; defaultClearance: number; defaultRank: string }> = {
  applicant: { label: 'Applicant (Bewerber)', defaultClearance: 1, defaultRank: 'Civilian Applicant' },
  cadet: { label: 'Academy Cadet', defaultClearance: 2, defaultRank: 'POST Cadet' },
  officer: { label: 'Patrol Officer', defaultClearance: 3, defaultRank: 'Officer II' },
  fto: { label: 'Field Training Officer (FTO)', defaultClearance: 4, defaultRank: 'Senior Lead Officer' },
  supervisor: { label: 'Watch Commander / Supervisor', defaultClearance: 5, defaultRank: 'Sergeant I' },
  admin: { label: 'Command Staff / Administrator', defaultClearance: 10, defaultRank: 'Chief of Police' },
};
