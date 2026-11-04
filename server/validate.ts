/**
 * Prüfung von Eingaben, die später als Link oder Einbettung im Browser landen.
 * Nur Node-Standardbibliotheken, damit sich das Modul ohne Zusatzpakete testen lässt.
 */

const PDF_DATA_PREFIX = 'data:application/pdf;base64,';
const BASE64_BODY = /^[A-Za-z0-9+/]*={0,2}$/;

/** Leer oder ein base64-kodiertes PDF als data-URL. Alles andere (z. B. javascript:) wird abgelehnt. */
export function isSafePdfDataUrl(value: string): boolean {
  if (value === '') return true;
  if (!value.startsWith(PDF_DATA_PREFIX)) return false;
  return BASE64_BODY.test(value.slice(PDF_DATA_PREFIX.length));
}

/** Leer oder eine http(s)-Adresse in zulässiger Länge. */
export function isSafeHttpUrl(value: string, maxLength = 500): boolean {
  if (value === '') return true;
  if (value.length > maxLength) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Leer oder die Adresse eines Render-Deploy-Hooks. */
export function isRenderDeployHook(value: string): boolean {
  return value === '' || (isSafeHttpUrl(value, 300) && value.startsWith('https://api.render.com/deploy/'));
}

export function limitText(value: unknown, maxLength: number): string {
  return String(value ?? '').slice(0, maxLength);
}
