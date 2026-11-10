import { randomBytes } from 'node:crypto';

/**
 * Eindeutige ID, z. B. "msg_1730000000000_9f3a1c2e7b4d1a6c".
 * Der Zufallsanteil verhindert, dass zwei Einträge in derselben Millisekunde dieselbe ID bekommen.
 * Das ist wichtig, weil jede ID bei Firestore ein Dokumentname ist und ein gleicher Name überschreibt.
 */
export function newId(prefix: string, now: number = Date.now()): string {
  return `${prefix}_${now}_${randomBytes(8).toString('hex')}`;
}
