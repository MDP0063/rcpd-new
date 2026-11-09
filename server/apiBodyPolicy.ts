export type AuthenticatedApiBodyPolicy = 'standard' | 'large' | 'exam-autosave' | 'exam-submit';

/**
 * Assign request-body limits by endpoint instead of allowing every authenticated API
 * request to allocate a 25 MB JSON body buffer.
 */
export function getAuthenticatedApiBodyPolicy(method: string, path: string): AuthenticatedApiBodyPolicy {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = (path.length > 1 ? path.replace(/\/+$/, '') : path).toLowerCase();
  const segments = normalizedPath.split('/').filter(Boolean);
  const isExamAttemptRoute =
    segments.length === 6 &&
    segments[0] === 'academy' &&
    segments[1] === 'exams' &&
    Boolean(segments[2]) &&
    segments[3] === 'attempts' &&
    Boolean(segments[4]);

  if (normalizedMethod === 'PUT' && isExamAttemptRoute && segments[5] === 'autosave') {
    return 'exam-autosave';
  }
  if (normalizedMethod === 'POST' && isExamAttemptRoute && segments[5] === 'submit') {
    return 'exam-submit';
  }
  if (
    (normalizedMethod === 'POST' && normalizedPath === '/academy/modules') ||
    (normalizedMethod === 'PUT' &&
      segments.length === 3 &&
      segments[0] === 'academy' &&
      segments[1] === 'modules' &&
      Boolean(segments[2])) ||
    (normalizedMethod === 'POST' && normalizedPath === '/admin/restore')
  ) {
    return 'large';
  }
  return 'standard';
}
