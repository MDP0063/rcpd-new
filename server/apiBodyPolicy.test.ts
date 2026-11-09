import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAuthenticatedApiBodyPolicy } from './apiBodyPolicy.ts';

test('large JSON bodies are limited to legacy PDF module writes and full backup restore', () => {
  assert.equal(getAuthenticatedApiBodyPolicy('POST', '/academy/modules'), 'large');
  assert.equal(getAuthenticatedApiBodyPolicy('PUT', '/academy/modules/mod_123'), 'large');
  assert.equal(getAuthenticatedApiBodyPolicy('POST', '/admin/restore'), 'large');
  // Express accepts route paths case-insensitively and with an optional trailing slash.
  assert.equal(getAuthenticatedApiBodyPolicy('POST', '/ACADEMY/MODULES/'), 'large');
  assert.equal(getAuthenticatedApiBodyPolicy('PUT', '/ACADEMY/MODULES/MOD_123/'), 'large');
  assert.equal(getAuthenticatedApiBodyPolicy('POST', '/ADMIN/RESTORE/'), 'large');
});

test('exam autosave and submission keep their dedicated small body limits', () => {
  assert.equal(
    getAuthenticatedApiBodyPolicy('PUT', '/academy/exams/exam_1/attempts/attempt_1/autosave'),
    'exam-autosave'
  );
  assert.equal(
    getAuthenticatedApiBodyPolicy('POST', '/academy/exams/exam_1/attempts/attempt_1/submit'),
    'exam-submit'
  );
});

test('all other authenticated API routes use the standard body limit', () => {
  assert.equal(getAuthenticatedApiBodyPolicy('POST', '/academy/courses'), 'standard');
  assert.equal(getAuthenticatedApiBodyPolicy('PUT', '/profile/self'), 'standard');
  assert.equal(getAuthenticatedApiBodyPolicy('POST', '/announcements'), 'standard');
  assert.equal(getAuthenticatedApiBodyPolicy('GET', '/portal/state'), 'standard');
});
