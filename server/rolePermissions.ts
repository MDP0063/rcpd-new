import type { GranularPermissions, OfficerRole } from '../src/types/portal.ts';

export function getDefaultGranularPermissions(role: OfficerRole): GranularPermissions {
  if (role === 'admin') {
    return {
      assignedCourseCodes: ['*'],
      canGradeAssignedCourses: true,
      canManageEvents: true,
      canPublishAnnouncements: true,
      canReviewStandardRequests: true,
      canExportReports: true
    };
  }

  if (role === 'colonel') {
    return {
      assignedCourseCodes: ['*'],
      canGradeAssignedCourses: true,
      canManageEvents: true,
      canPublishAnnouncements: true,
      canReviewStandardRequests: true,
      canExportReports: false
    };
  }

  return {
    assignedCourseCodes: [],
    canGradeAssignedCourses: false,
    canManageEvents: false,
    canPublishAnnouncements: false,
    canReviewStandardRequests: false,
    canExportReports: false
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
    canExportReports: false
  };
}
