import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessExamWorkshopExam,
  canRequestExamWorkshopAccess,
  examWorkshopPublicationRequiresApproval,
  hasExamWorkshopAccess,
  resolveExamWorkshopActor
} from './examWorkshopAccess.ts';
import { normalizeExamWorkshopPermissions } from './rolePermissions.ts';

function account(role: 'admin' | 'colonel' | 'officer', examWorkshop?: any) {
  return { uid: 'user_1', publicProfile: { role, granularPermissions: { examWorkshop } } };
}

test('admin always has full workshop access and all category actions', () => {
  const actor = resolveExamWorkshopActor(account('admin', { hasAccess: false }));
  assert.equal(hasExamWorkshopAccess(actor), true);
  assert.equal(canAccessExamWorkshopExam(actor, 'final_exam', 'update_existing', 'locked'), true);
  assert.equal(examWorkshopPublicationRequiresApproval(actor, 'test', false), false);
});

test('workshop access is a separate gate from category rights', () => {
  const actor = resolveExamWorkshopActor(account('colonel', {
    hasAccess: false,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: true }
  }));
  assert.equal(hasExamWorkshopAccess(actor), false);
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'view'), false);
});

test('test and final exam visibility and creation are independent', () => {
  const actor = resolveExamWorkshopActor(account('colonel', {
    hasAccess: true,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: true },
    finalExams: { canView: false, canCreate: false, canEdit: false, canUpdateExisting: false }
  }));
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'create'), true);
  assert.equal(canAccessExamWorkshopExam(actor, 'final_exam', 'view'), false);
  assert.equal(canAccessExamWorkshopExam(actor, 'final_exam', 'create'), false);
});

test('own draft editing and existing exam updates are separate permissions', () => {
  const actor = resolveExamWorkshopActor(account('colonel', {
    hasAccess: true,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: false }
  }));
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'edit', 'own_draft'), true);
  const lockedOwnDraft = resolveExamWorkshopActor(account('colonel', {
    hasAccess: true,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: true },
    lockedUpdateExamIds: ['own_draft']
  }));
  assert.equal(canAccessExamWorkshopExam(lockedOwnDraft, 'test', 'edit', 'own_draft'), false);
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'update_existing', 'other_draft'), false);
});

test('per-exam update locks override general update permissions but not admin', () => {
  const actor = resolveExamWorkshopActor(account('colonel', {
    hasAccess: true,
    tests: { canView: true, canCreate: true, canEdit: true, canUpdateExisting: true },
    lockedUpdateExamIds: ['exam_locked']
  }));
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'update_existing', 'exam_locked'), false);
  assert.equal(canAccessExamWorkshopExam(actor, 'test', 'update_existing', 'exam_open'), true);
  const admin = resolveExamWorkshopActor(account('admin', { lockedUpdateExamIds: ['exam_locked'] }));
  assert.equal(canAccessExamWorkshopExam(admin, 'test', 'update_existing', 'exam_locked'), true);
});

test('access request eligibility is independently configurable', () => {
  assert.equal(canRequestExamWorkshopAccess(resolveExamWorkshopActor(account('colonel'))), true);
  assert.equal(canRequestExamWorkshopAccess(resolveExamWorkshopActor(account('officer'))), false);
  assert.equal(canRequestExamWorkshopAccess(resolveExamWorkshopActor(account('officer', { canRequestAccess: true }))), true);
});

test('publication rules distinguish new exams and existing updates by category', () => {
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

test('normalization rejects malformed locks, bounds their count, and keeps admin invariant', () => {
  const normalized = normalizeExamWorkshopPermissions('officer', {
    hasAccess: true,
    lockedUpdateExamIds: ['valid_id', '../bad', 'valid_id', 3 as any]
  });
  assert.deepEqual(normalized.lockedUpdateExamIds, ['valid_id']);
  assert.equal(normalizeExamWorkshopPermissions('admin', { hasAccess: false }).hasAccess, true);
});
