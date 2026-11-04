/** Übersetzt einen Fehler aus Express (Body-Parser u. a.) in Status und deutsche Meldung für den Client. */
export function describeError(err: unknown): { status: number; message: string } {
  const e = (err && typeof err === 'object' ? err : {}) as { status?: unknown; type?: unknown };
  const status = typeof e.status === 'number' ? e.status : 500;
  if (e.type === 'entity.too.large' || status === 413) {
    return { status: 413, message: 'Die Anfrage ist zu groß.' };
  }
  if (e.type === 'entity.parse.failed' || status === 400) {
    return { status: 400, message: 'Ungültige Anfrage (kein gültiges JSON).' };
  }
  if (status >= 400 && status < 500) {
    return { status, message: 'Die Anfrage konnte nicht verarbeitet werden.' };
  }
  return { status: 500, message: 'Interner Serverfehler.' };
}
