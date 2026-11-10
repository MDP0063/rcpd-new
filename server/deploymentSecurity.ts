import type { OfficerRole, PortalDeploymentConfig } from '../src/types/portal.ts';

/** Deployment manifests contain operational details and are restricted to the administrator. */
export function canAccessDeploymentManifest(role: OfficerRole | string | undefined): boolean {
  return role === 'admin';
}

/** Deploy hooks are bearer secrets and must never be copied into portable backup files. */
export function toBackupDeploymentConfig(config: PortalDeploymentConfig): PortalDeploymentConfig {
  return {
    ...config,
    renderDeployHookUrl: ''
  };
}

/**
 * Restore non-secret deployment settings from a backup, but keep the currently configured
 * deploy hook. A backup may be stored or shared outside the live server's trust boundary.
 */
export function mergeRestoredDeploymentConfig(
  current: PortalDeploymentConfig,
  incoming: Partial<PortalDeploymentConfig> | undefined,
  restoredAtIso: string
): PortalDeploymentConfig {
  return {
    ...current,
    ...(incoming ?? {}),
    renderDeployHookUrl: current.renderDeployHookUrl,
    lastBackupRestoreIso: restoredAtIso,
    updatedIso: restoredAtIso
  };
}
