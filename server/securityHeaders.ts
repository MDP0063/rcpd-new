/** Conservative response headers for the standalone portal; no resource CSP is imposed. */
export const PORTAL_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'"
} as const;
