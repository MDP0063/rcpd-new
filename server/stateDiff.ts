/**
 * Übersetzt den Portal-Zustand (Listen im Speicher) in einzelne Firestore-Dokumente und zurück.
 * Reine Funktionen ohne Firebase-Abhängigkeit, damit sie sich ohne Netzwerk testen lassen.
 *
 * Aufbau in Firestore:
 *   <sammlung>/<id>      ein Dokument pro Eintrag (accounts, modules, messages, ...)
 *   blobs/<...>          Teilstücke sehr großer Textfelder (PDF-Handbücher), da ein Dokument max. 1 MiB hat
 *   meta/state           version, deploymentConfig und private Admin-Recovery-Metadaten
 *   meta/order           Reihenfolge der Einträge je Sammlung (Firestore kennt keine Listenreihenfolge)
 */
import { createHash } from 'node:crypto';

export interface CollectionSpec {
  name: string;
  idField: string;
}

export const COLLECTIONS: readonly CollectionSpec[] = [
  { name: 'accounts', idField: 'uid' },
  { name: 'applications', idField: 'id' },
  { name: 'modules', idField: 'id' },
  { name: 'exams', idField: 'id' },
  { name: 'progress', idField: 'id' },
  { name: 'announcements', idField: 'id' },
  { name: 'messages', idField: 'id' },
  { name: 'requests', idField: 'id' },
  { name: 'events', idField: 'id' },
  { name: 'auditLogs', idField: 'id' },
  { name: 'notifications', idField: 'id' },
  { name: 'academy_courses', idField: 'id' },
  { name: 'academy_course_versions', idField: 'id' },
  { name: 'academy_programs', idField: 'id' },
  { name: 'academy_program_versions', idField: 'id' },
  { name: 'academy_course_participations', idField: 'id' },
  { name: 'academy_program_participations', idField: 'id' },
  { name: 'academy_progress_evidence', idField: 'id' },
  { name: 'academy_completion_corrections', idField: 'id' },
  { name: 'academy_private_notes', idField: 'id' }
];

/** Felder, die über 1 MiB groß werden können und deshalb in Teilstücke zerlegt werden. */
export const BLOB_FIELDS: Record<string, readonly string[]> = {
  modules: ['pdfDataUrl']
};

export const CHUNK_SIZE = 700_000;
export const PRESENCE_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export type Doc = Record<string, unknown>;
export type StateLike = Record<string, unknown>;

export interface IndexEntry {
  sig: string;
  chunks: Record<string, number>;
  persistedAt: number;
}
export type PersistIndex = Map<string, IndexEntry>;

export type WriteOp =
  | { kind: 'set'; path: string; data: Doc }
  | { kind: 'delete'; path: string };

export interface Plan {
  ops: WriteOp[];
  /** true, wenn sich etwas anderes als nur die Anwesenheit (online/zuletzt gesehen) geändert hat. */
  significant: boolean;
  /** Nach erfolgreichem Schreiben aufrufen, damit der Index den neuen Stand kennt. */
  commit(): void;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const entries = Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
        a < b ? -1 : a > b ? 1 : 0
      );
      return Object.fromEntries(entries);
    }
    return val;
  });
}

/**
 * Creates a deterministic digest without materializing a second, complete JSON string.
 * Large values (notably legacy PDF data URLs) are fed to the hash in bounded chunks.
 * Object keys are sorted and JSON's omission/null behavior is retained for unsupported values.
 */
export function stableDigest(value: unknown): string {
  const hash = createHash('sha1');
  const ancestors = new Set<object>();
  const CHUNK_CODE_UNITS = 16_384;

  const prepare = (input: unknown, key: string): unknown => {
    if (input !== null && (typeof input === 'object' || typeof input === 'bigint')) {
      const toJSON = (input as { toJSON?: (propertyKey: string) => unknown }).toJSON;
      if (typeof toJSON === 'function') return toJSON.call(input, key);
    }
    return input;
  };

  const writeString = (value: string): void => {
    hash.update(`S${value.length}:`);
    for (let offset = 0; offset < value.length;) {
      let end = Math.min(offset + CHUNK_CODE_UNITS, value.length);
      // Do not split a UTF-16 surrogate pair across UTF-8 encoding boundaries.
      const lastCodeUnit = value.charCodeAt(end - 1);
      if (
        end < value.length &&
        lastCodeUnit >= 0xd800 &&
        lastCodeUnit <= 0xdbff
      ) {
        end -= 1;
      }
      hash.update(value.slice(offset, end), 'utf8');
      offset = end;
    }
    hash.update(';');
  };

  const writePrepared = (value: unknown, key: string, arrayItem: boolean): boolean => {
    if (value === null) {
      hash.update('Z;');
      return true;
    }

    switch (typeof value) {
      case 'string':
        writeString(value);
        return true;
      case 'boolean':
        hash.update(value ? 'B1;' : 'B0;');
        return true;
      case 'number':
        hash.update(Number.isFinite(value)
          ? `N${Object.is(value, -0) ? '0' : String(value)};`
          : 'Z;');
        return true;
      case 'undefined':
      case 'function':
      case 'symbol':
        if (arrayItem) hash.update('Z;');
        return arrayItem;
      case 'bigint':
        throw new TypeError('Do not know how to serialize a BigInt');
      case 'object': {
        const objectValue = value as object;
        if (ancestors.has(objectValue)) throw new TypeError('Converting circular structure to JSON');
        ancestors.add(objectValue);
        try {
          if (Array.isArray(value)) {
            hash.update(`A${value.length}[`);
            for (let index = 0; index < value.length; index += 1) {
              const itemKey = String(index);
              const item = prepare(value[index], itemKey);
              writePrepared(item, itemKey, true);
            }
            hash.update(']');
            return true;
          }

          hash.update('O{');
          const record = value as Record<string, unknown>;
          const keys = Object.keys(record).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
          for (const propertyKey of keys) {
            const propertyValue = prepare(record[propertyKey], propertyKey);
            if (
              propertyValue === undefined ||
              typeof propertyValue === 'function' ||
              typeof propertyValue === 'symbol'
            ) continue;
            writeString(propertyKey);
            writePrepared(propertyValue, propertyKey, false);
          }
          hash.update('}');
          return true;
        } finally {
          ancestors.delete(objectValue);
        }
      }
      default:
        // The switch is exhaustive for JavaScript's primitive and object types.
        hash.update('Z;');
        return true;
    }
  };

  const prepared = prepare(value, '');
  writePrepared(prepared, '', false);
  return hash.digest('hex');
}

function digest(value: unknown): string {
  return stableDigest(value);
}

export function safeId(id: string): string {
  return id.replace(/\//g, '%2F');
}

/** Konto ohne Anwesenheitsfelder, damit der Heartbeat keine Änderung auslöst. */
function withoutPresence(account: Doc): Doc {
  const profile = (account.publicProfile || {}) as Doc;
  return {
    ...account,
    isOnline: undefined,
    lastSeenIso: undefined,
    publicProfile: { ...profile, isOnline: undefined, lastSeenIso: undefined }
  };
}

function blobPath(collection: string, id: string, field: string, index: number): string {
  return `blobs/${collection}__${safeId(id)}__${field}__${index}`;
}

function splitBlobs(
  collection: string,
  id: string,
  doc: Doc
): { main: Doc; blobs: Array<{ path: string; data: string }>; chunks: Record<string, number> } {
  const main: Doc = { ...doc };
  const blobs: Array<{ path: string; data: string }> = [];
  const chunks: Record<string, number> = {};
  for (const field of BLOB_FIELDS[collection] || []) {
    const value = doc[field];
    if (typeof value === 'string' && value.length > CHUNK_SIZE) {
      const count = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < count; i++) {
        blobs.push({
          path: blobPath(collection, id, field, i),
          data: value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        });
      }
      main[field] = null;
      chunks[field] = count;
    }
  }
  if (Object.keys(chunks).length > 0) main.__chunks = chunks;
  return { main, blobs, chunks };
}

function listOf(state: StateLike, name: string): Doc[] {
  const value = state[name];
  return Array.isArray(value) ? (value as Doc[]) : [];
}

function orderOf(state: StateLike): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  for (const spec of COLLECTIONS) {
    order[spec.name] = listOf(state, spec.name).map(d => String(d[spec.idField]));
  }
  return order;
}

function metaOf(state: StateLike): Doc {
  return {
    version: state.version ?? 3,
    deploymentConfig: state.deploymentConfig ?? null,
    adminRecovery: state.adminRecovery ?? null,
    adminRecoveryRateLimit: state.adminRecoveryRateLimit ?? null
  };
}

/** Vergleicht den Zustand mit dem zuletzt gespeicherten Stand und liefert nur die nötigen Schreibvorgänge. */
export function planWrites(
  index: PersistIndex,
  state: StateLike,
  now: number,
  presenceIntervalMs: number = PRESENCE_WRITE_INTERVAL_MS
): Plan {
  const ops: WriteOp[] = [];
  const updates: Array<() => void> = [];
  let significant = false;
  const seen = new Set<string>();

  for (const spec of COLLECTIONS) {
    for (const doc of listOf(state, spec.name)) {
      const id = String(doc[spec.idField]);
      const key = `${spec.name}/${safeId(id)}`;
      seen.add(key);
      const sig = digest(spec.name === 'accounts' ? withoutPresence(doc) : doc);
      const prev = index.get(key);

      if (prev && prev.sig === sig) {
        // Nur die Anwesenheit hat sich geändert: höchstens alle paar Minuten schreiben.
        if (spec.name === 'accounts' && now - prev.persistedAt >= presenceIntervalMs) {
          ops.push({ kind: 'set', path: key, data: doc });
          updates.push(() => index.set(key, { ...prev, persistedAt: now }));
        }
        continue;
      }

      const { main, blobs, chunks } = splitBlobs(spec.name, id, doc);
      ops.push({ kind: 'set', path: key, data: main });
      for (const blob of blobs) ops.push({ kind: 'set', path: blob.path, data: { data: blob.data } });
      for (const [field, oldCount] of Object.entries(prev?.chunks || {})) {
        for (let i = chunks[field] ?? 0; i < oldCount; i++) {
          ops.push({ kind: 'delete', path: blobPath(spec.name, id, field, i) });
        }
      }
      significant = true;
      updates.push(() => index.set(key, { sig, chunks, persistedAt: now }));
    }
  }

  const removed: string[] = [];
  for (const [key, entry] of index) {
    if (key.startsWith('meta/') || seen.has(key)) continue;
    const [collection, ...rest] = key.split('/');
    const id = rest.join('/');
    ops.push({ kind: 'delete', path: key });
    for (const [field, count] of Object.entries(entry.chunks)) {
      for (let i = 0; i < count; i++) ops.push({ kind: 'delete', path: blobPath(collection, id, field, i) });
    }
    removed.push(key);
    significant = true;
  }

  const orderDoc = orderOf(state);
  const orderSig = digest(orderDoc);
  if (index.get('meta/order')?.sig !== orderSig) {
    ops.push({ kind: 'set', path: 'meta/order', data: orderDoc });
    updates.push(() => index.set('meta/order', { sig: orderSig, chunks: {}, persistedAt: now }));
    significant = true;
  }

  const metaDoc = metaOf(state);
  const metaSig = digest(metaDoc);
  if (index.get('meta/state')?.sig !== metaSig) {
    ops.push({ kind: 'set', path: 'meta/state', data: metaDoc });
    updates.push(() => index.set('meta/state', { sig: metaSig, chunks: {}, persistedAt: now }));
    significant = true;
  }

  return {
    ops,
    significant,
    commit() {
      for (const key of removed) index.delete(key);
      for (const update of updates) update();
    }
  };
}

export interface RawStore {
  collections: Record<string, Doc[]>;
  /** Teilstücke nach Pfad, z. B. "blobs/modules__abc__pdfDataUrl__0" */
  blobs: Map<string, string>;
  order: Record<string, string[]> | null;
  meta: Doc | null;
}

/** Baut aus den gelesenen Firestore-Dokumenten den Portal-Zustand und den passenden Index. */
/**
 * Reconstructs the portal state from stored documents. Set consumeBlobs when the caller
 * owns the temporary blob map and wants each chunk released as soon as it is assembled.
 */
export function assembleState(
  raw: RawStore,
  now: number,
  options: { consumeBlobs?: boolean } = {}
): { state: StateLike; index: PersistIndex } | null {
  if (!raw.meta) return null;
  const index: PersistIndex = new Map();
  const state: StateLike = { version: raw.meta.version ?? 3 };
  if (raw.meta.deploymentConfig) state.deploymentConfig = raw.meta.deploymentConfig;
  if (raw.meta.adminRecovery) state.adminRecovery = raw.meta.adminRecovery;
  if (raw.meta.adminRecoveryRateLimit) state.adminRecoveryRateLimit = raw.meta.adminRecoveryRateLimit;

  for (const spec of COLLECTIONS) {
    const entries: Array<{ doc: Doc; chunks: Record<string, number> }> = [];
    for (const stored of raw.collections[spec.name] || []) {
      const doc: Doc = { ...stored };
      const chunks = (doc.__chunks || {}) as Record<string, number>;
      delete doc.__chunks;
      for (const [field, count] of Object.entries(chunks)) {
        const id = String(doc[spec.idField]);
        const blobParts: string[] = [];
        for (let i = 0; i < count; i++) {
          const path = blobPath(spec.name, id, field, i);
          const chunk = raw.blobs.get(path);
          if (chunk !== undefined) blobParts.push(chunk);
          if (options.consumeBlobs) raw.blobs.delete(path);
        }
        doc[field] = blobParts.join('');
      }
      entries.push({ doc, chunks });
    }

    const positions = new Map<string, number>();
    (raw.order?.[spec.name] || []).forEach((id, i) => positions.set(id, i));
    entries.sort((a, b) => {
      const ia = String(a.doc[spec.idField]);
      const ib = String(b.doc[spec.idField]);
      const pa = positions.get(ia) ?? Number.MAX_SAFE_INTEGER;
      const pb = positions.get(ib) ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return ia < ib ? -1 : 1;
    });

    for (const { doc, chunks } of entries) {
      index.set(`${spec.name}/${safeId(String(doc[spec.idField]))}`, {
        sig: digest(spec.name === 'accounts' ? withoutPresence(doc) : doc),
        chunks,
        persistedAt: now
      });
    }
    state[spec.name] = entries.map(e => e.doc);
  }

  // loadAll() owns this temporary map; release any orphaned chunks once reconstruction is complete.
  if (options.consumeBlobs) raw.blobs.clear();

  // Signatur des tatsächlich gespeicherten Standes, damit abweichende Dokumente beim nächsten Speichern korrigiert werden.
  index.set('meta/order', { sig: digest(raw.order ?? {}), chunks: {}, persistedAt: now });
  index.set('meta/state', { sig: digest(raw.meta), chunks: {}, persistedAt: now });
  return { state, index };
}
