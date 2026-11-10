export interface AcademyLibrarySearchEntry {
  title: string;
  code: string;
  category: string;
  documentTypeName: string;
  description: string;
  updatedIso: string;
  searchTerms?: string;
}

function normalizeSearchValue(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('de-DE').trim();
}

/**
 * Searches only metadata already present in the participant-safe catalog.
 * Material bodies are deliberately not fetched or indexed by this helper.
 */
export function getLibrarySearchScore(entry: AcademyLibrarySearchEntry, query: string): number {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return 0;

  const fields = [
    { value: normalizeSearchValue(entry.title), weight: 500 },
    { value: normalizeSearchValue(entry.code), weight: 450 },
    { value: normalizeSearchValue(entry.category), weight: 300 },
    { value: normalizeSearchValue(entry.documentTypeName), weight: 250 },
    { value: normalizeSearchValue(entry.description), weight: 150 },
    { value: normalizeSearchValue(entry.searchTerms || ''), weight: 125 }
  ];
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  let score = 0;

  for (const token of tokens) {
    let bestMatch = 0;
    for (const field of fields) {
      if (!field.value.includes(token)) continue;
      const position = field.value.indexOf(token);
      const matchScore = field.weight + (position === 0 ? 80 : 0) +
        (field.value === token ? 120 : 0);
      bestMatch = Math.max(bestMatch, matchScore);
    }
    if (bestMatch === 0) return 0;
    score += bestMatch;
  }

  if (fields.some(field => field.value === normalizedQuery)) score += 300;
  return score;
}

export function matchesLibrarySearch(entry: AcademyLibrarySearchEntry, query: string): boolean {
  return !query.trim() || getLibrarySearchScore(entry, query) > 0;
}

function compareUpdatedDescending(a: AcademyLibrarySearchEntry, b: AcademyLibrarySearchEntry): number {
  const dateA = a.updatedIso ? Date.parse(a.updatedIso) : Number.NaN;
  const dateB = b.updatedIso ? Date.parse(b.updatedIso) : Number.NaN;
  if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) return dateB - dateA;
  if (Number.isFinite(dateA) !== Number.isFinite(dateB)) return Number.isFinite(dateA) ? -1 : 1;
  return a.title.localeCompare(b.title, 'de-DE');
}

export function sortLibraryEntries<T extends AcademyLibrarySearchEntry>(
  entries: readonly T[],
  query: string,
  sortOrder: 'relevance' | 'alphabetical' | 'updated'
): T[] {
  const sorted = [...entries];
  if (sortOrder === 'updated') return sorted.sort(compareUpdatedDescending);
  if (sortOrder === 'relevance' && query.trim()) {
    return sorted.sort((a, b) =>
      getLibrarySearchScore(b, query) - getLibrarySearchScore(a, query) ||
      a.title.localeCompare(b.title, 'de-DE')
    );
  }
  return sorted.sort((a, b) => a.title.localeCompare(b.title, 'de-DE'));
}
