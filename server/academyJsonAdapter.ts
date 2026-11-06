import { mkdir, readFile, rename, unlink, open } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ACADEMY_COLLECTIONS, type AcademyCollection, type AcademyDocument, type AcademyQuery, type AcademyStorageAdapter, type AcademyTransaction } from './academyRepositoryTypes.ts';
import { assertAcademyCanDelete, assertAcademyCanUpdate, assertAcademyDocument, assertAcademyDocumentId, assertAcademyQuery } from './academyRepositoryRules.ts';

type State = { version: 4; collections: Record<AcademyCollection, Record<string, AcademyDocument>> };
type ParsedState = { version: 1 | 2 | 3 | 4; collections: Partial<Record<AcademyCollection, Record<string, AcademyDocument>>> };
const queues = new Map<string, Promise<void>>();
const keyOf = (id: string) => `doc:${encodeURIComponent(id)}`;
const clone = <T,>(value: T): T => structuredClone(value);
const empty = (): State => ({ version: 4, collections: Object.fromEntries(ACADEMY_COLLECTIONS.map(name => [name, {}])) as State['collections'] });
const matches = (doc: AcademyDocument, query: AcademyQuery) => (query.where ?? []).every(filter => Object.is((doc as unknown as Record<string, unknown>)[filter.field], filter.value));

class JsonTransaction implements AcademyTransaction {
  hasWrites = false;
  private readonly state: State;
  constructor(state: State) { this.state = state; }
  private canRead() { if (this.hasWrites) throw new Error('ACADEMY_TRANSACTION_READ_AFTER_WRITE'); }
  async get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null> {
    this.canRead(); assertAcademyDocumentId(id); const doc = this.state.collections[collection][keyOf(id)]; return doc ? clone(doc) as T : null;
  }
  async list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query: AcademyQuery = {}): Promise<T[]> {
    this.canRead(); assertAcademyQuery(collection, query);
    return clone(Object.values(this.state.collections[collection]).filter(doc => matches(doc, query)).slice(0, query.limit ?? 1000)) as T[];
  }
  async create<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    assertAcademyDocument(collection, id, document); const key = keyOf(id);
    if (this.state.collections[collection][key]) throw new Error('ACADEMY_DOCUMENT_ALREADY_EXISTS');
    this.state.collections[collection][key] = clone(document); this.hasWrites = true;
  }
  async update<T extends AcademyDocument>(collection: AcademyCollection, id: string, document: T): Promise<void> {
    assertAcademyCanUpdate(collection); assertAcademyDocument(collection, id, document); const key = keyOf(id);
    if (!this.state.collections[collection][key]) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
    this.state.collections[collection][key] = clone(document); this.hasWrites = true;
  }
  async delete(collection: AcademyCollection, id: string): Promise<void> {
    assertAcademyCanDelete(collection); assertAcademyDocumentId(id);
    const key = keyOf(id);
    if (!this.state.collections[collection][key]) throw new Error('ACADEMY_DOCUMENT_NOT_FOUND');
    delete this.state.collections[collection][key]; this.hasWrites = true;
  }
}

export class JsonAcademyStorageAdapter implements AcademyStorageAdapter {
  constructor(filePath: string) { this.filePath = path.resolve(filePath); }
  private readonly filePath: string;
  private async read(): Promise<State> {
    let raw: string;
    try { raw = await readFile(this.filePath, 'utf8'); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return empty(); throw error;
    }
    let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new Error('ACADEMY_JSON_STORE_INVALID'); }
    if (!parsed || typeof parsed !== 'object' || ![1, 2, 3, 4].includes((parsed as ParsedState).version) || !(parsed as ParsedState).collections) throw new Error('ACADEMY_JSON_STORE_INVALID');
    const state = empty();
    for (const collection of ACADEMY_COLLECTIONS) {
      const docs = (parsed as ParsedState).collections[collection];
      if (docs === undefined && (
        ((parsed as ParsedState).version === 1 && (collection === 'academy_course_drafts' || collection === 'academy_program_drafts')) ||
        ((parsed as ParsedState).version <= 2 && collection === 'academy_material_categories') ||
        ((parsed as ParsedState).version <= 3 && collection === 'academy_material_category_assignments')
      )) continue;
      if (!docs || typeof docs !== 'object' || Array.isArray(docs)) throw new Error('ACADEMY_JSON_STORE_INVALID');
      for (const [key, doc] of Object.entries(docs)) {
        if (!doc || typeof doc.id !== 'string' || keyOf(doc.id) !== key) throw new Error('ACADEMY_JSON_STORE_INVALID');
        assertAcademyDocument(collection, doc.id, doc); state.collections[collection][key] = doc;
      }
    }
    return state;
  }
  private async write(state: State): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.${randomUUID()}.tmp`;
    let handle: Awaited<ReturnType<typeof open>> | null = null;
    try {
      handle = await open(temp, 'wx', 0o600); await handle.writeFile(JSON.stringify(state), 'utf8'); await handle.sync(); await handle.close(); handle = null; await rename(temp, this.filePath);
    } catch (error) { if (handle) await handle.close().catch(() => undefined); await unlink(temp).catch(() => undefined); throw error; }
  }
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = queues.get(this.filePath) ?? Promise.resolve();
    const task = previous.then(operation);
    queues.set(this.filePath, task.then(() => undefined, () => undefined));
    return task;
  }
  async get<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, id: string): Promise<T | null> {
    assertAcademyDocumentId(id); return this.exclusive(async () => { const state = await this.read(); const doc = state.collections[collection][keyOf(id)]; return doc ? clone(doc) as T : null; });
  }
  async list<T extends AcademyDocument = AcademyDocument>(collection: AcademyCollection, query: AcademyQuery = {}): Promise<T[]> {
    assertAcademyQuery(collection, query); return this.exclusive(async () => clone(Object.values((await this.read()).collections[collection]).filter(doc => matches(doc, query)).slice(0, query.limit ?? 1000)) as T[]);
  }
  async runTransaction<T>(operation: (transaction: AcademyTransaction) => Promise<T>): Promise<T> {
    return this.exclusive(async () => {
      const state = await this.read(); const working = clone(state); const transaction = new JsonTransaction(working);
      const result = await operation(transaction);
      if (transaction.hasWrites) await this.write(working);
      return result;
    });
  }
}
