function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Parse an existing JSON database without silently replacing corrupt or empty data. */
export function parsePortalDatabaseText(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('PORTAL_DATABASE_JSON_INVALID');
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.accounts) || parsed.accounts.length === 0) {
    throw new Error('PORTAL_DATABASE_STATE_INVALID');
  }
  return parsed;
}

/**
 * Reads an optional legacy JSON database during Firestore bootstrap.
 * Only a genuinely absent file means "no migration source"; existing invalid data must fail closed.
 */
export function parseOptionalPortalDatabaseText(raw: string | null): Record<string, unknown> | null {
  return raw === null ? null : parsePortalDatabaseText(raw);
}

export interface DirectMessageAccessRecord {
  senderUid: string;
  recipientUid: string;
}

/** A direct message is readable only by its sender, recipient, or an authenticated user for an ALL broadcast. */
export function canAccessDirectMessage(message: DirectMessageAccessRecord, uid: string): boolean {
  return message.senderUid === uid || message.recipientUid === uid || message.recipientUid === 'ALL';
}

/** Only an open request may receive a decision. */
export function isPendingPortalRequest(status: unknown): boolean {
  return status === 'pending';
}

/** Final application decisions cannot be reopened or overwritten through the review endpoint. */
export function isReviewableApplicationStatus(status: unknown): boolean {
  return status !== 'accepted' && status !== 'rejected';
}

/** Validate the existing whitelist form's required fields and keep persisted text within bounded sizes. */
export function validateApplicationSubmission(input: unknown): string | null {
  if (!isRecord(input)) return 'Der Personalbogen ist ungültig.';

  const fields: Array<{ key: string; label: string; min: number; max: number }> = [
    { key: 'characterName', label: 'Der Charaktername', min: 2, max: 80 },
    { key: 'dateOfBirth', label: 'Das Geburtsdatum', min: 1, max: 10 },
    { key: 'discordTag', label: 'Die Discord-Kennung', min: 1, max: 64 },
    { key: 'priorExperience', label: 'Die Diensterfahrung', min: 5, max: 8000 },
    { key: 'scenarioResponse', label: 'Die Stellungnahme', min: 5, max: 12000 }
  ];

  for (const field of fields) {
    const value = input[field.key];
    if (typeof value !== 'string') return field.label + ' fehlt oder ist ungültig.';
    const length = value.trim().length;
    if (length < field.min) return field.label + ' ist zu kurz.';
    if (value.length > field.max) return field.label + ' ist zu lang (maximal ' + field.max + ' Zeichen).';
  }

  const dateOfBirth = input.dateOfBirth as string;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return 'Das Geburtsdatum muss ein gültiges Datum sein.';
  }
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return 'Das Geburtsdatum muss ein gültiges Datum sein.';
  }
  if (typeof input.penalCodeAck !== 'boolean') {
    return 'Die Bestätigung der Angaben ist ungültig.';
  }
  return null;
}
