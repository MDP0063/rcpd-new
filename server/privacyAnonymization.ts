/**
 * Narrow privacy transformation used only by the explicit account-deletion workflow.
 * Exact UID references are replaced recursively; display-name fields are anonymized
 * without rewriting course content, answers, comments, or other free text.
 */
export function anonymizeIdentityReferences<T>(
  value: T,
  deletedUid: string,
  anonymizedUid: string,
  identityNames: readonly string[] = []
): T {
  const names = new Set(identityNames.filter(name => typeof name === 'string' && name.trim()));
  const visit = (input: unknown, key = ''): unknown => {
    if (typeof input === 'string') {
      if (input === deletedUid) return anonymizedUid;
      if (/(?:^|_)(?:name|displayname|username|badge|label)$/i.test(key) ||
          /(?:Name|DisplayName|Username|Badge)$/.test(key)) {
        if (names.has(input)) return 'Gelöschtes Konto';
      }
      return input;
    }
    if (Array.isArray(input)) return input.map(item => visit(item));
    if (input && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input as Record<string, unknown>)
        .map(([childKey, child]) => [childKey, visit(child, childKey)]));
    }
    return input;
  };
  return visit(value) as T;
}
