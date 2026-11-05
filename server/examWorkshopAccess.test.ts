import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessExamWorkshopExam,
  canRequestExamWorkshopAccess,
  examWorkshopPublicationRequiresApproval,
  hasExamWorkshopAccess,
  resolveExamWorkshopActor
} from './examWorkshopAccess.ts';

function account(role: 'admin' | 'colonel' | 'officer', examWorkshop?: any) {
  return { uid: 'user_1', publicProfile: { role, granularPermissions: { examWorkshop } } };
}

test('admin always has full workshop access independent of configured flags', () => {
  const actor = resolveExamWorkshopActor(account('admin', { hasAccess: false }));
  assert.equal(hasExamWorkshopAccess(actor), true);
  assert.equal(canAccessExamWorkshopExam(actor, 'final_exam', 'update_existing', 'exam_1'), true);
  assert.equal(examWorkshopPublicationRequiresApproval(actor, 'test', false), false);
});

test('workshop access is a separate gate from category permissions', () => {
  const actor = resolveExamWorkshopActor(account('colonel', {
    hasAccess: false,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: true }
  }));
  assert.equal(hasExamWorkshopAccess(actor), false);
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'view'), false);
});

test('test and final-exam rights are evaluated independently', () => {
  const actor = resolveExamWorkshopActor(account('colonel', {
    hasAccess: true,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: false },
    finalExams: { canView: true, canCreate: false, canEdit: false, canUpdateExisting: false }
  }));
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'create'), true);
  assert.equal(canAccessExamWorkshopExam(actor, 'final_exam', 'create'), false);
  assert.equal(canAccessExamWorkshopExam(actor, 'final_exam', 'view'), true);
});

test('existing exam update lock overrides general update rights', () => {
  const actor = resolveExamWorkshopActor(account('colonel', {
    hasAccess: true,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: true },
    lockedUpdateExamIds: ['exam_locked']
  }));
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'update_existing', 'exam_locked'), false);
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'update_existing', 'exam_open'), true);
});

test('access request eligibility is independently configurable', () => {
  assert.equal(canRequestExamWorkshopAccess(resolveExamWorkshopActor(account('colonel'))), true);
  assert.equal(canRequestExamWorkshopAccess(resolveExamWorkshopActor(account('officer'))), false);
  assert.equal(canRequestExamWorkshopAccess(resolveExamWorkshopActor(account('officer', { canRequestAccess: true }))), true);
});

test('publication policies distinguish new exams and updates by category', () => {
  const actor = resolveExamWorkshopActor(account('colonel', {
    hasAccess: true,
    publication: {
      newTestsRequireApproval: false,
      newFinalExamsRequireApproval: true,
      testUpdatesRequireApproval: true,
      finalExamUpdatesRequireApproval: false
    }
  }));
  assert.equal(examWorkshopPublicationRequiresApproval(actor, 'test', false), false);
  assert.equal(examWorkshopPublicationRequiresApproval(actor, 'final_exam', false), true);
  assert.equal(examWorkshopPublicationRequiresApproval(actor, 'test', true), true);
  assert.equal(examWorkshopPublicationRequiresApproval(actor, 'final_exam', true), false);
});
