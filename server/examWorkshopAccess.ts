import type { OfficerRole, ExamWorkshopPermissions } from '../src/types/portal.ts';
import { normalizeExamWorkshopPermissions } from './rolePermissions.ts';

export interface ExamWorkshopActor {
  uid: string;
  role: OfficerRole;
  permissions: ExamWorkshopPermissions;
}

export type ExamWorkshopAction = 'view' | 'create' | 'edit' | 'update_existing';

export function resolveExamWorkshopActor(account: {
  uid: string;
  publicProfile: { role: OfficerRole; granularPermissions?: { examWorkshop?: ExamWorkshopPermissions } };
}): ExamWorkshopActor {
  return {
    uid: account.uid,
    role: account.publicProfile.role,
    permissions: normalizeExamWorkshopPermissions(
      account.publicProfile.role,
      account.publicProfile.granularPermissions?.examWorkshop
    )
  };
}

export function hasExamWorkshopAccess(actor: ExamWorkshopActor): boolean {
  return actor.role === 'admin' || actor.permissions.hasAccess;
}

export function canRequestExamWorkshopAccess(actor: ExamWorkshopActor): boolean {
  return actor.role !== 'admin' && actor.permissions.canRequestAccess;
}

export function canAccessExamWorkshopExam(
  actor: ExamWorkshopActor,
  assessmentStage: 'test' | 'final_exam',
  action: ExamWorkshopAction,
  examId?: string
): boolean {
  if (actor.role === 'admin') return true;
  if (!hasExamWorkshopAccess(actor)) return false;

  const category = assessmentStage === 'final_exam'
    ? actor.permissions.finalExams
    : actor.permissions.tests;
  if (action === 'view') return category.canView;
  if (action === 'create') return category.canCreate;
  if (action === 'edit') {
    // Editing a saved draft is an update to an existing exam and must obey both controls.
    if (examId && actor.permissions.lockedUpdateExamIds.includes(examId)) return false;
    return category.canEdit && category.canUpdateExisting;
  }
  if (action === 'update_existing') {
    if (!category.canUpdateExisting) return false;
    if (examId && actor.permissions.lockedUpdateExamIds.includes(examId)) return false;
    return true;
  }
  return false;
}

export function examWorkshopPublicationRequiresApproval(
  actor: ExamWorkshopActor,
  assessmentStage: 'test' | 'final_exam',
  isUpdate: boolean
): boolean {
  if (actor.role === 'admin') return false;
  const publication = actor.permissions.publication;
  if (isUpdate) {
    return assessmentStage === 'final_exam'
      ? publication.finalExamUpdatesRequireApproval
      : publication.testUpdatesRequireApproval;
  }
  return assessmentStage === 'final_exam'
    ? publication.newFinalExamsRequireApproval
    : publication.newTestsRequireApproval;
}
