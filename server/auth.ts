/**
 * Anmeldung und Sitzungen für den Portal-Server.
 * Nur Node-Standardbibliotheken, damit sich das Modul ohne Zusatzpakete testen lässt.
 */
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Passwörter
// ---------------------------------------------------------------------------

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

/** Format: scrypt$N$r$p$saltBase64Url$hashBase64Url */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    hash.toString('base64url')
  ].join('$');
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  try {
    const expected = Buffer.from(hashB64, 'base64url');
    const actual = scryptSync(password, Buffer.from(saltB64, 'base64url'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p)
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Gibt einen Fehlertext zurück, wenn das Passwort nicht zulässig ist, sonst null. */
export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'Das Passwort muss ein Text sein.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Das Passwort darf höchstens ${MAX_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sitzungs-Token (HMAC-signiert, ohne Zusatzpaket)
// ---------------------------------------------------------------------------

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface SessionPayload {
  uid: string;
  exp: number;
  sessionVersion?: number;
}

/** Liefert nur eine unbestätigte UID zum Nachschlagen des Kontos; niemals als Authentifizierung verwenden. */
export function readSessionUid(token: string | undefined | null): string | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.slice(0, dot), 'base64url').toString('utf8')) as SessionPayload;
    return typeof payload.uid === 'string' ? payload.uid : null;
  } catch {
    return null;
  }
}

/** Einweg-Hash für Wiederherstellungstokens; der Klartext-Token wird nie gespeichert. */
export function hashRecoveryToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function createSessionToken(
  uid: string,
  secret: string,
  now: number = Date.now(),
  ttlMs: number = SESSION_TTL_MS,
  sessionVersion: number = 0
): string {
  const payload: SessionPayload = { uid, exp: now + ttlMs, sessionVersion };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Gibt die UID zurück, wenn das Token gültig und nicht abgelaufen ist. */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
  expectedSessionVersion?: number
): string | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp <= now) return null;
    if (expectedSessionVersion !== undefined && payload.sessionVersion !== expectedSessionVersion) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

/** Signaturteil des Tokens, dient als Schlüssel für gesperrte (abgemeldete) Tokens. */
export function tokenSignature(token: string): string {
  return token.slice(token.indexOf('.') + 1);
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Identitätsfelder im Request
// ---------------------------------------------------------------------------

/**
 * Felder, in denen der Client bisher "sich selbst" mitgeschickt hat.
 * Der Server vergleicht sie mit der UID aus dem Sitzungs-Token.
 */
export const IDENTITY_KEYS = [
  'uid',
  'adminUid',
  'actorUid',
  'userUid',
  'senderUid',
  'reviewerUid',
  'instructorUid',
  'userId',
  'applicantUid',
  'requesterUid'
] as const;

/** Gibt den Namen des ersten Feldes zurück, das nicht zur Sitzung passt, sonst null. */
export function findIdentityMismatch(
  sessionUid: string,
  ...sources: Array<Record<string, unknown> | undefined | null>
): string | null {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of IDENTITY_KEYS) {
      const value = (source as Record<string, unknown>)[key];
      if (value !== undefined && value !== sessionUid) return key;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Begrenzung von Anmeldeversuchen
// ---------------------------------------------------------------------------

export class AttemptLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number, windowMs: number) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /** Wie viele Millisekunden bis zum nächsten erlaubten Versuch, 0 wenn erlaubt. */
  retryAfterMs(key: string, now: number = Date.now()): number {
    const recent = this.prune(key, now);
    if (recent.length < this.maxAttempts) return 0;
    return Math.max(0, recent[0] + this.windowMs - now);
  }

  recordFailure(key: string, now: number = Date.now()): void {
    const recent = this.prune(key, now);
    recent.push(now);
    this.hits.set(key, recent);
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private prune(key: string, now: number): number[] {
    const recent = (this.hits.get(key) || []).filter(t => now - t < this.windowMs);
    if (recent.length === 0) this.hits.delete(key);
    else this.hits.set(key, recent);
    return recent;
  }
}

// ---------------------------------------------------------------------------
// Sonstiges
// ---------------------------------------------------------------------------

/** Vergleich ohne Zeitunterschiede, z. B. für API-Keys. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function generatePassword(): string {
  return randomBytes(12).toString('base64url');
}

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}
