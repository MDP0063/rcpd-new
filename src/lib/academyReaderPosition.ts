export type AcademyReaderPositionKind = 'markdown' | 'code';

export interface AcademyReaderPosition {
  kind: AcademyReaderPositionKind;
  offset: number;
}

const MAX_READER_OFFSET = 10_000_000;

export function createAcademyReaderPositionKey(
  participationId: string,
  materialId: string,
  materialVersionId: string
): string {
  return [
    'academy-reader-position-v1',
    encodeURIComponent(participationId),
    encodeURIComponent(materialId),
    encodeURIComponent(materialVersionId)
  ].join(':');
}

export function serializeAcademyReaderPosition(position: AcademyReaderPosition): string {
  return JSON.stringify({ version: 1, kind: position.kind, offset: position.offset });
}

export function parseAcademyReaderPosition(value: string | null): AcademyReaderPosition | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as { version?: unknown; kind?: unknown; offset?: unknown };
    if (candidate.version !== 1) return null;
    if (candidate.kind !== 'markdown' && candidate.kind !== 'code') return null;
    if (typeof candidate.offset !== 'number' || !Number.isFinite(candidate.offset)) return null;
    if (candidate.offset < 0 || candidate.offset > MAX_READER_OFFSET) return null;
    return { kind: candidate.kind, offset: candidate.offset };
  } catch {
    return null;
  }
}
