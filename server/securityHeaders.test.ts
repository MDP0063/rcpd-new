import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PORTAL_SECURITY_HEADERS } from './securityHeaders.ts';

test('portal responses prevent MIME sniffing, referrer leakage, and framing', () => {
  assert.equal(PORTAL_SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.equal(PORTAL_SECURITY_HEADERS['Referrer-Policy'], 'same-origin');
  assert.equal(PORTAL_SECURITY_HEADERS['X-Frame-Options'], 'DENY');
  assert.equal(PORTAL_SECURITY_HEADERS['Content-Security-Policy'], "frame-ancestors 'none'");
});
