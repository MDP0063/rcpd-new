import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { EXAM_COLLECTIONS } from './examRepositoryTypes.ts';
import type {
  AttemptInvalidationAudit,
  ExamCollection,
  ExamDocument,
  ExamQuery,
  ExamStorageAdapter,
  ExamTransaction
} from './examRepositoryTypes.ts';
import {
  assertAttemptInvalidationAudit,
  assertExamAttemptCreate,
  assertExamAttemptUpdate,
  assertExamCanDelete,
  assertExamCanUpdate,
  assertExamDocument,
  assertExamDocumentId,
  assertExamQuery
} from './examRepositoryRules.ts';
import { anonymizeIdentityReferences } from './privacyAnonymization.ts';

const operationQueues = new Map<string, Promise<void>>();

interface JsonExamState {
  version: 1;
  maintenanceMode?: boolean;
  collections: Record<ExamCollection, Record<string, ExamDocument>>;
}

function emptyState(): JsonExamState {
  return {
    version: 1,
    maintenanceMode: false,
    collections: Object.fromEntries(
      EXAM_COLLECTIONS.map(collection => [collection, {}])
    ) as Record<ExamCollection, Record<string, ExamDocument>>
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function storageId(id: string): string {
  // Präfix verhindert Sonder-Keys wie __proto__ in serialisierten Objekt-Maps.
  return `doc:${encodeURIComponent(id)}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function matches(document: ExamDocument, query: ExamQuery): boolean {
  return (query.where ?? []).every(filter => Object.is(document[filter.field], filter.value));
}

class JsonExamTransaction implements ExamTransaction {
  hasWrites = false;
  private readonly state: JsonExamState;

  constructor(state: JsonExamState) {
    this.state = state;
  }

  private assertCanRead(): void {
    if (this.hasWrites) throw new Error('EXAM_TRANSACTION_READ_AFTER_WRITE');
  }

  async get<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    id: string
  ): Promise<T | null> {
    this.assertCanRead();
    assertExamDocumentId(id);
    const document = this.state.collections[collection][storageId(id)];
    return document ? clone(document) as T : null;
  }

  async list<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    query: ExamQuery = {}
  ): Promise<T[]> {
    this.assertCanRead();
    assertExamQuery(collection, query);
    const documents = Object.values(this.state.collections[collection])
      .filter(document => matches(document, query));
    const limited = documents.slice(0, query.limit ?? 1000);
    return clone(limited) as T[];
  }

  async create<T extends ExamDocument>(
    collection: ExamCollection,
    id: string,
    document: T
  ): Promise<void> {
    assertExamDocument(collection, id, document);
    assertExamAttemptCreate(collection, document);
    const key = storageId(id);
    if (this.state.collections[collection][key]) {
      throw new Error('EXAM_DOCUMENT_ALREADY_EXISTS');
    }
    this.state.collections[collection][key] = clone(document);
    this.hasWrites = true;
  }

  async update<T extends ExamDocument>(
    collection: ExamCollection,
    id: string,
    document: T
  ): Promise<void> {
    // Reads are forbidden after the first write, but transactions may perform
    // multiple writes after completing all reads (as Firestore transactions do).
    assertExamCanUpdate(collection);
    assertExamDocument(collection, id, document);
    const key = storageId(id);
    const existing = this.state.collections[collection][key];
    if (!existing) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    if (collection === 'exam_attempts') assertExamAttemptUpdate(existing, document);
    this.state.collections[collection][key] = clone(document);
    this.hasWrites = true;
  }

  async invalidateAttempt(id: string, audit: AttemptInvalidationAudit): Promise<void> {
    this.assertCanRead();
    assertExamDocumentId(id);
    assertAttemptInvalidationAudit(audit);
    const key = storageId(id);
    const existing = this.state.collections.exam_attempts[key];
    if (!existing) throw new Error('EXAM_DOCUMENT_NOT_FOUND');
    if (existing.status === 'invalidated_by_admin') throw new Error('EXAM_ATTEMPT_ALREADY_INVALIDATED');
    if (!['in_progress', 'pending_review', 'passed', 'failed'].includes(String(existing.status))) {
      throw new Error('EXAM_ATTEMPT_STATUS_INVALID');
    }
    this.state.collections.exam_attempts[key] = {
      ...existing,
      status: 'invalidated_by_admin',
      invalidatedByUid: audit.adminUid,
      invalidatedAtIso: audit.atIso,
      invalidationReason: audit.reason
    };
    this.hasWrites = true;
  }

  async delete(collection: ExamCollection, id: string): Promise<void> {
    assertExamCanDelete(collection);
    assertExamDocumentId(id);
    if (delete this.state.collections[collection][storageId(id)]) this.hasWrites = true;
  }
}

/**
 * JSON-Backend für genau einen Node-Prozess.
 * Die Queue umfasst den vollständigen Read-Modify-Write-Vorgang.
 */
export class JsonExamStorageAdapter implements ExamStorageAdapter {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  private async readState(): Promise<JsonExamState> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyState();
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('EXAM_JSON_STORE_INVALID');
    }

    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.collections)) {
      throw new Error('EXAM_JSON_STORE_UNSUPPORTED');
    }
    const knownCollections = new Set<string>(EXAM_COLLECTIONS);
    if (Object.keys(parsed.collections).some(name => !knownCollections.has(name))) {
      throw new Error('EXAM_JSON_STORE_UNSUPPORTED');
    }

    const state = emptyState();
    for (const collection of EXAM_COLLECTIONS) {
      const documents = parsed.collections[collection];
      if (!isRecord(documents)) throw new Error('EXAM_JSON_STORE_INVALID');
      const normalized: Record<string, ExamDocument> = {};
      for (const [key, value] of Object.entries(documents)) {
        if (!isRecord(value) || typeof value.id !== 'string' || storageId(value.id) !== key) {
          throw new Error('EXAM_JSON_STORE_INVALID');
        }
        assertExamDocument(collection, value.id, value as ExamDocument);
        assertExamDocument(collection, value.id, value as ExamDocument);
        normalized[key] = value as ExamDocument;
      }
      state.collections[collection] = normalized;
    }
    state.maintenanceMode = parsed.maintenanceMode === true;
    return state;
  }

  private async writeState(state: JsonExamState): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${Date.now()}.${randomUUID()}.tmp`;
    let handle: Awaited<ReturnType<typeof open>> | null = null;
    try {
      handle = await open(temporaryPath, 'wx', 0o600);
      await handle.writeFile(JSON.stringify(state), 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      if (handle) await handle.close().catch(() => undefined);
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = operationQueues.get(this.filePath) ?? Promise.resolve();
    const task = previous.then(operation);
    operationQueues.set(this.filePath, task.then(
      () => undefined,
      () => undefined
    ));
    return task;
  }

  async get<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    id: string
  ): Promise<T | null> {
    assertExamDocumentId(id);
    return this.runExclusive(async () => {
      const state = await this.readState();
      const document = state.collections[collection][storageId(id)];
      return document ? clone(document) as T : null;
    });
  }

  async list<T extends ExamDocument = ExamDocument>(
    collection: ExamCollection,
    query: ExamQuery = {}
  ): Promise<T[]> {
    assertExamQuery(collection, query);
    return this.runExclusive(async () => {
      const state = await this.readState();
      const documents = Object.values(state.collections[collection])
        .filter(document => matches(document, query));
      const limited = documents.slice(0, query.limit ?? 1000);
      return clone(limited) as T[];
    });
  }

  async exportSnapshot(): Promise<import('./examRepositoryTypes.ts').ExamRepositorySnapshot> {
    return this.runExclusive(async () => {
      const state = await this.readState();
      if (!state.maintenanceMode) throw new Error('EXAM_MAINTENANCE_REQUIRED');
      const collections = Object.fromEntries(
        EXAM_COLLECTIONS.map(collection => [
          collection,
          Object.values(state.collections[collection]).map(document => clone(document))
        ])
      ) as import('./examRepositoryTypes.ts').ExamRepositorySnapshot['collections'];
      return { formatVersion: 1, collections };
    });
  }

  async replaceSnapshot(snapshot: import('./examRepositoryTypes.ts').ExamRepositorySnapshot): Promise<void> {
    return this.runExclusive(async () => {
      const current = await this.readState();
      if (!current.maintenanceMode) throw new Error('EXAM_MAINTENANCE_REQUIRED');
      const collections = Object.fromEntries(
        EXAM_COLLECTIONS.map(collection => [
          collection,
          Object.fromEntries(
            snapshot.collections[collection].map(document => [
              storageId(document.id),
              clone(document)
            ])
          )
        ])
      ) as JsonExamState['collections'];
      const next: JsonExamState = {
        version: 1,
        maintenanceMode: true,
        collections
      };
      await this.writeState(next);
    });
  }

  async isMaintenanceMode(): Promise<boolean> {
    return this.runExclusive(async () => (await this.readState()).maintenanceMode === true);
  }

  async setMaintenanceMode(enabled: boolean, allowExisting = false): Promise<void> {
    return this.runExclusive(async () => {
      const state = await this.readState();
      if (enabled && state.maintenanceMode && !allowExisting) {
        throw new Error('EXAM_MAINTENANCE_ALREADY_ACTIVE');
      }
      state.maintenanceMode = enabled;
      await this.writeState(state);
    });
  }

  async anonymizeUser(uid: string, anonymizedUid: string, identityNames: readonly string[] = []): Promise<void> {
    if (!uid.trim() || !anonymizedUid.trim() || uid === anonymizedUid) throw new Error('EXAM_ANONYMIZATION_INPUT_INVALID');
    return this.runExclusive(async () => {
      const state = await this.readState();
      const working = clone(state);
      for (const collection of EXAM_COLLECTIONS) {
        for (const [key, document] of Object.entries(working.collections[collection])) {
          const anonymized = anonymizeIdentityReferences(document, uid, anonymizedUid, identityNames);
          if (JSON.stringify(anonymized) !== JSON.stringify(document)) {
            // This dedicated privacy path changes identity references only. It deliberately
            // does not expose ordinary updates to append-only exam attempts.
            assertExamDocument(collection, document.id, anonymized);
            working.collections[collection][key] = anonymized;
          }
        }
      }
      await this.writeState(working);
    });
  }

  runTransaction<T>(operation: (transaction: ExamTransaction) => Promise<T>): Promise<T> {
    return this.runExclusive(async () => {
      const current = await this.readState();
      const working = clone(current);
      const transaction = new JsonExamTransaction(working);
      const result = await operation(transaction);
      if (transaction.hasWrites) await this.writeState(working);
      return result;
    });
  }
}
