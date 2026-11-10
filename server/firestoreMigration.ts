import { parsePortalDatabaseText } from './portalLegacyGuards.ts';

/**
 * Returns null only when no legacy file exists. Existing file contents must be valid;
 * malformed or empty database data must stop migration rather than initialize a blank store.
 */
export function parseFirestoreMigrationSource(raw: string | null): Record<string, unknown> | null {
  if (raw === null) return null;
  return parsePortalDatabaseText(raw);
}
