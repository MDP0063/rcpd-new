import type {
  ExamWorkshopCategoryPermissions,
  ExamWorkshopPermissions,
  GranularPermissions,
  OfficerRole
} from '../src/types/portal.ts';

function defaultCategoryPermissions(): ExamWorkshopCategoryPermissions {
  return { canView: false, canCreate: false, canEdit: false, canUpdateExisting: false };
}

export function getDefaultExamWorkshopPermissions(role: OfficerRole): ExamWorkshopPermissions {
  const admin = role === 'admin';
  const category = (): ExamWorkshopCategoryPermissions => ({
    canView: admin,
    canCreate: admin,
    canEdit: admin,
    canUpdateExisting: admin
  });
  return {
    hasAccess: admin,
    canRequestAccess: role === 'colonel',
    tests: category(),
    finalExams: category(),
    publication: {
      newTestsRequireApproval: false,
      newFinalExamsRequireApproval: false,
      testUpdatesRequireApproval: false,
      finalExamUpdatesRequireApproval: false
    },
    lockedUpdateExamIds: []
  };
}

function normalizeCategory(
  incoming: unknown,
  defaults: ExamWorkshopCategoryPermissions
): ExamWorkshopCategoryPermissions {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return defaults;
  const value = incoming as Record<string, unknown>;
  return {
    canView: typeof value.canView === 'boolean' ? value.canView : defaults.canView,
    canCreate: typeof value.canCreate === 'boolean' ? value.canCreate : defaults.canCreate,
    canEdit: typeof value.canEdit === 'boolean' ? value.canEdit : defaults.canEdit,
    canUpdateExisting: typeof value.canUpdateExisting === 'boolean'
      ? value.canUpdateExisting
      : defaults.canUpdateExisting
  };
}

function normalizePublication(
  incoming: unknown,
  defaults: ExamWorkshopPermissions['publication']
): ExamWorkshopPermissions['publication'] {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return defaults;
  const value = incoming as Record<string, unknown>;
  return {
    newTestsRequireApproval: typeof value.newTestsRequireApproval === 'boolean'
      ? value.newTestsRequireApproval : defaults.newTestsRequireApproval,
    newFinalExamsRequireApproval: typeof value.newFinalExamsRequireApproval === 'boolean'
      ? value.newFinalExamsRequireApproval : defaults.newFinalExamsRequireApproval,
    testUpdatesRequireApproval: typeof value.testUpdatesRequireApproval === 'boolean'
      ? value.testUpdatesRequireApproval : defaults.testUpdatesRequireApproval,
    finalExamUpdatesRequireApproval: typeof value.finalExamUpdatesRequireApproval === 'boolean'
      ? value.finalExamUpdatesRequireApproval : defaults.finalExamUpdatesRequireApproval
  };
}

export function normalizeExamWorkshopPermissions(
  role: OfficerRole,
  incoming?: Partial<ExamWorkshopPermissions>
): ExamWorkshopPermissions {
  const defaults = getDefaultExamWorkshopPermissions(role);
  // Administrator access is an invariant, not a user-configurable permission.
  if (role === 'admin') return defaults;
  if (!incoming || typeof incoming !== 'object') return defaults;

  const lockedUpdateExamIds = Array.isArray(incoming.lockedUpdateExamIds)
    ? [...new Set(incoming.lockedUpdateExamIds.filter(
        (id): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(id)
      ))].slice(0, 500)
    : defaults.lockedUpdateExamIds;

  return {
    hasAccess: typeof incoming.hasAccess === 'boolean' ? incoming.hasAccess : defaults.hasAccess,
    canRequestAccess: typeof incoming.canRequestAccess === 'boolean'
      ? incoming.canRequestAccess : defaults.canRequestAccess,
    tests: normalizeCategory(incoming.tests, defaults.tests),
    finalExams: normalizeCategory(incoming.finalExams, defaults.finalExams),
    publication: normalizePublication(incoming.publication, defaults.publication),
    lockedUpdateExamIds
  };
}

export function getDefaultGranularPermissions(role: OfficerRole): GranularPermissions {
  if (role === 'admin') {
    return {
      assignedCourseCodes: ['*'],
      canGradeAssignedCourses: true,
      canManageEvents: true,
      canPublishAnnouncements: true,
      canReviewStandardRequests: true,
      canExportReports: true,
      examWorkshop: getDefaultExamWorkshopPermissions(role)
    };
  }

  if (role === 'colonel') {
    return {
      assignedCourseCodes: ['*'],
      canGradeAssignedCourses: true,
      canManageEvents: true,
      canPublishAnnouncements: true,
      canReviewStandardRequests: true,
      canExportReports: false,
      examWorkshop: getDefaultExamWorkshopPermissions(role)
    };
  }

  return {
    assignedCourseCodes: [],
    canGradeAssignedCourses: false,
    canManageEvents: false,
    canPublishAnnouncements: false,
    canReviewStandardRequests: false,
    canExportReports: false,
    examWorkshop: getDefaultExamWorkshopPermissions(role)
  };
}

export function normalizeGranularPermissions(
  role: OfficerRole,
  incoming?: Partial<GranularPermissions>
): GranularPermissions {
  const defaults = getDefaultGranularPermissions(role);
  if (role === 'admin') return defaults;
  if (!incoming) return defaults;

  return {
    assignedCourseCodes: Array.isArray(incoming.assignedCourseCodes)
      ? incoming.assignedCourseCodes.map(code => String(code).trim().toUpperCase()).filter(Boolean)
      : defaults.assignedCourseCodes,
    canGradeAssignedCourses:
      typeof incoming.canGradeAssignedCourses === 'boolean'
        ? incoming.canGradeAssignedCourses
        : defaults.canGradeAssignedCourses,
    canManageEvents:
      typeof incoming.canManageEvents === 'boolean'
        ? incoming.canManageEvents
        : defaults.canManageEvents,
    canPublishAnnouncements:
      typeof incoming.canPublishAnnouncements === 'boolean'
        ? incoming.canPublishAnnouncements
        : defaults.canPublishAnnouncements,
    canReviewStandardRequests:
      typeof incoming.canReviewStandardRequests === 'boolean'
        ? incoming.canReviewStandardRequests
        : defaults.canReviewStandardRequests,
    // Reports and exports are an admin-only capability, never a granular delegation.
    canExportReports: false,
    examWorkshop: normalizeExamWorkshopPermissions(role, incoming.examWorkshop)
  };
}
