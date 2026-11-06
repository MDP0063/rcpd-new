import { ACADEMY_COLLECTIONS, type AcademyCollection, type AcademyDocument, type AcademyQuery } from './academyRepositoryTypes.ts';

export function assertAcademyCollection(value: string): asserts value is AcademyCollection {
  if (!(ACADEMY_COLLECTIONS as readonly string[]).includes(value)) throw new Error('ACADEMY_COLLECTION_INVALID');
}
export function assertAcademyDocumentId(id: string): void {
  if (typeof id !== 'string' || !id.trim() || Buffer.byteLength(encodeURIComponent(id), 'utf8') > 1500) throw new Error('ACADEMY_DOCUMENT_ID_INVALID');
}
export function assertAcademyDocument(collection: AcademyCollection, id: string, document: AcademyDocument): void {
  assertAcademyCollection(collection); assertAcademyDocumentId(id);
  if (!document || typeof document !== 'object' || Array.isArray(document) || document.id !== id) throw new Error('ACADEMY_DOCUMENT_INVALID');
}
export function assertAcademyQuery(collection: AcademyCollection, query: AcademyQuery = {}): void {
  assertAcademyCollection(collection);
  if (!query || typeof query !== 'object' || Array.isArray(query) || (query.where !== undefined && !Array.isArray(query.where))) throw new Error('ACADEMY_QUERY_INVALID');
  if (collection !== 'academy_courses' && collection !== 'academy_programs' && collection !== 'academy_material_categories' && collection !== 'academy_material_document_types' && (!query.where || query.where.length === 0)) throw new Error('ACADEMY_QUERY_FILTER_REQUIRED');
  if (query.limit !== undefined && (!Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 1000)) throw new Error('ACADEMY_QUERY_LIMIT_INVALID');
  for (const filter of query.where ?? []) {
    if (!filter || typeof filter.field !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(filter.field)) throw new Error('ACADEMY_QUERY_FIELD_INVALID');
    const type = typeof filter.value;
    if (filter.value !== null && type !== 'string' && type !== 'number' && type !== 'boolean') throw new Error('ACADEMY_QUERY_VALUE_INVALID');
    if (typeof filter.value === 'number' && !Number.isFinite(filter.value)) throw new Error('ACADEMY_QUERY_VALUE_INVALID');
  }
}

export function assertAcademyCanUpdate(collection: AcademyCollection): void {
  if (collection.endsWith('_versions') || collection === 'academy_progress_evidence' || collection === 'academy_completion_corrections') {
    throw new Error('ACADEMY_DOCUMENT_APPEND_ONLY');
  }
}
export function assertAcademyCanDelete(collection: AcademyCollection): void {
  if (collection.endsWith('_versions') || collection === 'academy_progress_evidence' || collection === 'academy_completion_corrections') {
    throw new Error('ACADEMY_DOCUMENT_DELETE_FORBIDDEN');
  }
}
