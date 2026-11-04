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
