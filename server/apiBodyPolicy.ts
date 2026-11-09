export type AuthenticatedApiBodyPolicy = 'standard' | 'large' | 'exam-autosave' | 'exam-submit';

/**
 * Assign request-body limits by endpoint instead of allowing every authenticated API
 * request to allocate a 25 MB JSON body buffer.
 */
export function getAuthenticatedApiBodyPolicy(method: string, path: string): AuthenticatedApiBodyPolicy {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = (path.length > 1 ? path.replace(/\\/+$/, '') : path).toLowerCase();

  if (normalizedMethod === 'PUT' && /^\\/academy\\/exams\\/[^/]+\\/attempts\\/[^/]+\\/autosave$/.test(normalizedPath)) {
    return 'exam-autosave';
  }
  if (normalizedMethod === 'POST' && /^\\/academy\\/exams\\/[^/]+\\/attempts\\/[^/]+\\/submit$/.test(normalizedPath)) {
    return 'exam-submit';
  }
  if (
    (normalizedMethod === 'POST' && normalizedPath === '/academy/modules') ||
    (normalizedMethod === 'PUT' && /^\\/academy\\/modules\\/[^/]+$/.test(normalizedPath)) ||
    (normalizedMethod === 'POST' && normalizedPath === '/admin/restore')
  ) {
    return 'large';
  }
  return 'standard';
}
