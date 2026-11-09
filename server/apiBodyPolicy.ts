export type AuthenticatedApiBodyPolicy = 'standard' | 'large' | 'exam-autosave' | 'exam-submit';

/**
 * Assign request-body limits by endpoint instead of allowing every authenticated API
 * request to allocate a 25 MB JSON body buffer.
 */
export function getAuthenticatedApiBodyPolicy(method: string, path: string): AuthenticatedApiBodyPolicy {
  if (method === 'PUT' && /^\/academy\/exams\/[^/]+\/attempts\/[^/]+\/autosave$/.test(path)) {
    return 'exam-autosave';
  }
  if (method === 'POST' && /^\/academy\/exams\/[^/]+\/attempts\/[^/]+\/submit$/.test(path)) {
    return 'exam-submit';
  }
  if (
    (method === 'POST' && path === '/academy/modules') ||
    (method === 'PUT' && /^\/academy\/modules\/[^/]+$/.test(path)) ||
    (method === 'POST' && path === '/admin/restore')
  ) {
    return 'large';
  }
  return 'standard';
}
