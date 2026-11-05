import type { ExamWorkshopCategoryPermissions, ExamWorkshopPermissions, GranularPermissions, OfficerRole } from '../src/types/portal.ts';

export function getDefaultExamWorkshopPermissions(role: OfficerRole): ExamWorkshopPermissions {
  const admin = role === 'admin';
  const category = (): ExamWorkshopCategoryPermissions => ({
    canView: admin, canCreate: admin, canEdit: admin, canUpdateExisting: admin
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

function normalizeExamWorkshopCategory(value: unknown, defaults: ExamWorkshopCategoryPermissions): ExamWorkshopCategoryPermissions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const item = value as Record<string, unknown>;
  return {
    canView: typeof item.canView === 'boolean' ? item.canView : defaults.canView,
    canCreate: typeof item.canCreate === 'boolean' ? item.canCreate : defaults.canCreate,
    canEdit: typeof item.canEdit === 'boolean' ? item.canEdit : defaults.canEdit,
    canUpdateExisting: typeof item.canUpdateExisting === 'boolean' ? item.canUpdateExisting : defaults.canUpdateExisting
  };
}

export function normalizeExamWorkshopPermissions(role: OfficerRole, incoming?: Partial<ExamWorkshopPermissions>): ExamWorkshopPermissions {
  const defaults = getDefaultExamWorkshopPermissions(role);
  // Admin authority is invariant and cannot be removed through stored profile data.
  if (role === 'admin') return defaults;
  if (!incoming || typeof incoming !== 'object') return defaults;
  const publication = incoming.publication && typeof incoming.publication === 'object'
    ? incoming.publication : defaults.publication;
  const rawIds = Array.isArray(incoming.lockedUpdateExamIds) ? incoming.lockedUpdateExamIds : [];
  const lockedUpdateExamIds = [...new Set(rawIds.filter(
    (id): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(id)
  ))].slice(0, 500);
  return {
    hasAccess: typeof incoming.hasAccess === 'boolean' ? incoming.hasAccess : defaults.hasAccess,
    canRequestAccess: typeof incoming.canRequestAccess === 'boolean' ? incoming.canRequestAccess : defaults.canRequestAccess,
    tests: normalizeExamWorkshopCategory(incoming.tests, defaults.tests),
    finalExams: normalizeExamWorkshopCategory(incoming.finalExams, defaults.finalExams),
    publication: {
      newTestsRequireApproval: typeof publication.newTestsRequireApproval === 'boolean' ? publication.newTestsRequireApproval : defaults.publication.newTestsRequireApproval,
      newFinalExamsRequireApproval: typeof publication.newFinalExamsRequireApproval === 'boolean' ? publication.newFinalExamsRequireApproval : defaults.publication.newFinalExamsRequireApproval,
      testUpdatesRequireApproval: typeof publication.testUpdatesRequireApproval === 'boolean' ? publication.testUpdatesRequireApproval : defaults.publication.testUpdatesRequireApproval,
      finalExamUpdatesRequireApproval: typeof publication.finalExamUpdatesRequireApproval === 'boolean' ? publication.finalExamUpdatesRequireApproval : defaults.publication.finalExamUpdatesRequireApproval
    },
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
