/** Kleinere rankOrder = höherer Rang. Ein Handbuch ist lesbar, wenn der Rang mindestens dem geforderten entspricht. */
export function canReadModule(callerRankOrder: number | undefined, requiredRankOrder: number | undefined): boolean {
  if (callerRankOrder === undefined || requiredRankOrder === undefined) return false;
  return callerRankOrder <= requiredRankOrder;
}

/** Soll der Heartbeat gespeichert werden? Nur wenn der letzte Eintrag älter als maxAgeMs ist oder die Person als offline galt. */
export function shouldRefreshPresence(
  isOnline: boolean | undefined,
  lastSeenIso: string | undefined,
  now: number,
  maxAgeMs = 15_000
): boolean {
  if (!isOnline || !lastSeenIso) return true;
  const last = new Date(lastSeenIso).getTime();
  return Number.isNaN(last) || now - last > maxAgeMs;
}


export interface PresenceAccount {
  isOnline?: boolean;
  lastSeenIso?: string;
  publicProfile: {
    isOnline?: boolean;
    lastSeenIso?: string;
  };
}

/** Aktualisiert beide Presence-Felder eines Kontos nur dann, wenn der Heartbeat fällig ist. */
export function refreshAccountPresence(account: PresenceAccount, now: number): boolean {
  const presenceFieldsDiffer =
    account.publicProfile.isOnline !== account.isOnline ||
    account.publicProfile.lastSeenIso !== account.lastSeenIso;
  if (!presenceFieldsDiffer && !shouldRefreshPresence(account.isOnline, account.lastSeenIso, now)) return false;
  const nowIso = new Date(now).toISOString();
  account.isOnline = true;
  account.lastSeenIso = nowIso;
  account.publicProfile.isOnline = true;
  account.publicProfile.lastSeenIso = nowIso;
  return true;
}
