import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PortalDeploymentConfig } from '../src/types/portal.ts';
import {
  canAccessDeploymentManifest,
  mergeRestoredDeploymentConfig,
  toBackupDeploymentConfig
} from './deploymentSecurity.ts';

function config(overrides: Partial<PortalDeploymentConfig> = {}): PortalDeploymentConfig {
  return {
    githubRepoUrl: 'https://github.com/example/portal',
    renderServiceUrl: 'https://portal.onrender.com',
    renderDeployHookUrl: 'https://api.render.com/deploy/sensitive-hook-token',
    branchName: 'main',
    autoDeployEnabled: true,
    completedSteps: ['repository'],
    updatedIso: '2026-11-10T10:00:00.000Z',
    ...overrides
  };
}

test('deployment manifests are restricted to the administrator role', () => {
  assert.equal(canAccessDeploymentManifest('admin'), true);
  assert.equal(canAccessDeploymentManifest('colonel'), false);
  assert.equal(canAccessDeploymentManifest('officer'), false);
  assert.equal(canAccessDeploymentManifest(undefined), false);
});

test('portable backups never contain the Render deploy-hook secret', () => {
  const live = config();
  const backup = toBackupDeploymentConfig(live);

  assert.equal(backup.renderDeployHookUrl, '');
  assert.equal(backup.githubRepoUrl, live.githubRepoUrl);
  assert.equal(backup.branchName, live.branchName);
});

test('restoring a backup preserves the currently configured Render deploy hook', () => {
  const current = config({ renderDeployHookUrl: 'https://api.render.com/deploy/current-secret' });
  const incoming = config({
    renderDeployHookUrl: 'https://api.render.com/deploy/old-secret',
    branchName: 'release'
  });

  const restored = mergeRestoredDeploymentConfig(current, incoming, '2026-11-10T11:00:00.000Z');

  assert.equal(restored.renderDeployHookUrl, current.renderDeployHookUrl);
  assert.equal(restored.branchName, 'release');
  assert.equal(restored.lastBackupRestoreIso, '2026-11-10T11:00:00.000Z');
  assert.equal(restored.updatedIso, '2026-11-10T11:00:00.000Z');
});
