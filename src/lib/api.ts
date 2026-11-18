/**
 * Standardized Base URL & Backend Fetch Configuration
 * Ensures all frontend components communicate reliably with the Express backend
 * both in local development, preview containers, and Render.com production deployments.
 */

export function normalizeBaseUrl(rawBase?: string): string {
  if (!rawBase) return '';
  let trimmed = rawBase.trim();
  if (!trimmed) return '';

  // Remove trailing slashes
  trimmed = trimmed.replace(/\/+$/, '');

  // If someone configured VITE_API_BASE_URL="https://example.onrender.com/api",
  // strip the trailing "/api" so "/api/..." paths do not become "/api/api/..."
  if (trimmed.endsWith('/api')) {
    trimmed = trimmed.slice(0, -4);
  }

  return trimmed;
}

export const API_BASE_URL: string = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || ''
);

/**
 * Safely constructs a complete backend endpoint URL from a standardized path (e.g. '/api/health').
 */
export function resolveApiUrl(endpointPath: string, customBaseOverride?: string): string {
  const trimmedPath = endpointPath.trim();
  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalizedPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  const base =
    customBaseOverride !== undefined
      ? normalizeBaseUrl(customBaseOverride)
      : API_BASE_URL;

  if (!base) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
}

const AUTH_TOKEN_KEY = 'ca_post_officer_session_token_v1';

/** Sitzungs-Token, das der Server beim Login ausstellt. */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus): Anmeldung gilt dann nur bis zum Neuladen.
  }
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Standardized fetch helper that prevents HTML/JSON parsing crashes during Render cold-starts
 * and guarantees consistent headers and base URL resolution.
 */
export async function apiFetch<T = any>(
  endpointPath: string,
  options: RequestInit = {},
  customBaseOverride?: string
): Promise<ApiResponse<T>> {
  const url = resolveApiUrl(endpointPath, customBaseOverride);
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    let parsedData: any = null;

    if (contentType.includes('application/json')) {
      parsedData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      try {
        parsedData = text ? JSON.parse(text) : null;
      } catch {
        parsedData = null;
      }
    }

    if (!response.ok) {
      const errorMsg =
        (parsedData && typeof parsedData === 'object' && parsedData.error) ||
        `Server-Antwort (${response.status}): Anfrage an ${normalizedEndpointLabel(endpointPath)} fehlgeschlagen.`;
      return {
        ok: false,
        status: response.status,
        data: parsedData,
        error: errorMsg
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsedData as T
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        err instanceof Error
          ? `Netzwerkfehler (${err.message})`
          : 'Verbindung zum Backend-Server fehlgeschlagen.'
    };
  }
}

function normalizedEndpointLabel(endpointPath: string): string {
  return endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
}

export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_RECOVERY_REQUEST: '/api/auth/recovery/request',
  AUTH_RECOVERY_RESET: '/api/auth/recovery/reset',
  AUTH_LOGOUT: '/api/auth/logout',
  FIREBASE_TOKEN: '/api/auth/firebase-token',
  PORTAL_STATE: '/api/portal/state',
  PORTAL_HEARTBEAT: '/api/portal/heartbeat',
  ADMIN_ACCOUNTS: '/api/admin/accounts',
  APPLICATIONS: '/api/applications',
  ADMIN_APPLICATIONS: '/api/admin/applications',
  ACADEMY_MATERIAL_CATEGORIES: '/api/academy/materials/categories',
  ACADEMY_MATERIAL_CATEGORY: (id: string) => `/api/academy/materials/categories/${encodeURIComponent(id)}`,
  ACADEMY_MATERIAL_CATEGORY_STATE: (id: string, action: 'archive' | 'restore') => `/api/academy/materials/categories/${encodeURIComponent(id)}/${action}`,
  ACADEMY_MATERIAL_DOCUMENT_TYPES: '/api/academy/materials/document-types',
  ACADEMY_MATERIAL_DOCUMENT_TYPE: (id: string) => `/api/academy/materials/document-types/${encodeURIComponent(id)}`,
  ACADEMY_MATERIAL_DOCUMENT_TYPE_STATE: (id: string, action: 'archive' | 'restore') => `/api/academy/materials/document-types/${encodeURIComponent(id)}/${action}`,
  ACADEMY_MATERIALS: '/api/academy/materials',
  ACADEMY_MATERIAL_CATALOG: '/api/academy/materials/catalog',
  ACADEMY_MATERIAL_CATALOG_ITEM: (id: string) => `/api/academy/materials/catalog/${encodeURIComponent(id)}`,
  ACADEMY_MATERIAL: (id: string) => `/api/academy/materials/${encodeURIComponent(id)}`,
  ACADEMY_MATERIAL_DRAFT: (id: string) => `/api/academy/materials/${encodeURIComponent(id)}/draft`,
  ACADEMY_MATERIAL_PUBLISH: (id: string) => `/api/academy/materials/${encodeURIComponent(id)}/publish`,
  ACADEMY_MATERIAL_ARCHIVE: (id: string) => `/api/academy/materials/${encodeURIComponent(id)}/archive`,
  ACADEMY_COURSES: '/api/academy/courses',
  ACADEMY_COURSE: (id: string) => `/api/academy/courses/${encodeURIComponent(id)}`,
  ACADEMY_COURSE_PARTICIPATIONS: '/api/academy/participations',
  ACADEMY_COURSE_PARTICIPATION: (id: string) => `/api/academy/participations/${encodeURIComponent(id)}`,
  ACADEMY_COURSE_START: (id: string) => `/api/academy/courses/${encodeURIComponent(id)}/participations`,
  ACADEMY_COURSE_EVIDENCE: (id: string) => `/api/academy/participations/${encodeURIComponent(id)}/evidence`,
  ACADEMY_COURSE_MATERIAL_VERSION: (participationId: string, materialId: string, materialVersionId: string) => `/api/academy/participations/${encodeURIComponent(participationId)}/materials/${encodeURIComponent(materialId)}/versions/${encodeURIComponent(materialVersionId)}`,
  ACADEMY_PROGRAMS: '/api/academy/programs',
  ACADEMY_PROGRAM: (id: string) => `/api/academy/programs/${encodeURIComponent(id)}`,
  ACADEMY_PROGRAM_START: (id: string) => `/api/academy/programs/${encodeURIComponent(id)}/participations`,
  ACADEMY_PROGRAM_PARTICIPATIONS: '/api/academy/program-participations',
  ACADEMY_PROGRAM_PARTICIPATION: (id: string) => `/api/academy/program-participations/${encodeURIComponent(id)}`,
  ACADEMY_NOTES: '/api/academy/notes',
  ACADEMY_NOTE_SOURCE_STATUS: (id: string) => `/api/academy/notes/${encodeURIComponent(id)}/source-status`,
  ACADEMY_MODULES: '/api/academy/modules',
  ACADEMY_MODULE_PDF: (id: string) => `/api/academy/modules/${encodeURIComponent(id)}/pdf`,
  ACADEMY_EXAMS: '/api/academy/exams',
  ACADEMY_EXAM_REVIEWS: '/api/academy/exam-reviews',
  ACADEMY_EXAM_REVIEW_CORRECTIONS: '/api/academy/exam-review-corrections',
  ACADEMY_EXAM_REVIEW_HISTORY: '/api/academy/exam-review-history',
  ACADEMY_EXAM_REVIEW_REVISION_REQUESTS: '/api/academy/exam-review-revision-requests',
  ACADEMY_EXAM_REVIEW_REQUEST_REVISION: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/request-revision`,
  ACADEMY_EXAM_REVIEW_RESOLVE_REVISION: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/resolve-revision-request`,
  ACADEMY_EXAM_PARTICIPANT_HISTORY: (uid: string) => `/api/academy/participants/${encodeURIComponent(uid)}/exam-history`,
  ACADEMY_EXAM_REVIEW_CORRECT: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/correct-review`,
  ACADEMY_EXAM_RESULTS: '/api/academy/exam-results',
  ADMIN_EXAM_RESULT_RELEASES: '/api/admin/exam-result-releases',
  ADMIN_EXAM_RESULT_RELEASE: (id: string, attemptId: string) => `/api/admin/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/release-result`,
  ACADEMY_EXAM_CATALOG: '/api/academy/exams/catalog',
  ACADEMY_EXAM_START: (id: string) => `/api/academy/exams/${encodeURIComponent(id)}/start`,
  ACADEMY_EXAM_ATTEMPT: (id: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempt`,
  ACADEMY_EXAM_AUTOSAVE: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/autosave`,
  ACADEMY_EXAM_SUBMIT: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/submit`,
  ACADEMY_EXAM_REVIEW_CLAIM: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/review-claim`,
  ACADEMY_EXAM_REVIEW_TRANSFER: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/review-claim/transfer`,
  ACADEMY_EXAM_REVIEW_REASSIGN: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/review-claim/reassign`,
  ACADEMY_EXAM_REVIEW_ACTIVITY: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/review-claim/activity`,
  ACADEMY_EXAM_REVIEW_DRAFT: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/review-draft`,
  ACADEMY_EXAM_REVIEW_DISCONNECT: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/review-claim/disconnect`,
  ACADEMY_EXAM_GRADE: (id: string, attemptId: string) => `/api/academy/exams/${encodeURIComponent(id)}/attempts/${encodeURIComponent(attemptId)}/grade`,
  PROGRESS: '/api/progress',
  ANNOUNCEMENTS: '/api/announcements',
  MESSAGES: '/api/messages',
  REQUESTS: '/api/requests',
  EVENTS: '/api/events',
  NOTIFICATIONS: '/api/notifications',
  AUDIT_LOGS: '/api/admin/audit-logs',
  PROFILE_SELF: '/api/profile/self',
  WHITELIST_VERIFY: '/api/v1/whitelist/verify',
  DEPLOYMENT_MANIFESTS: '/api/v1/deployment/manifests',
  ADMIN_DEPLOYMENT_CONFIG: '/api/admin/deployment-config',
  ADMIN_BACKUP: '/api/admin/backup',
  ADMIN_RESTORE: '/api/admin/restore',
  ADMIN_TRIGGER_DEPLOY: '/api/admin/trigger-deploy'
} as const;

