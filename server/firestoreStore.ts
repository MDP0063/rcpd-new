/**
 * Firestore als Speicher für den Portal-Zustand.
 *
 * Der Server hält den Zustand im Speicher und schreibt Änderungen gebündelt nach Firestore
 * (nur geänderte Dokumente, siehe stateDiff.ts). Nach jeder echten Änderung wird das Dokument
 * sync/state aktualisiert; Browser lauschen darauf und laden ihre Daten dann neu.
 * firebase-admin wird erst beim Öffnen geladen, damit der JSON-Modus ohne das Paket läuft.
 */
import type { Firestore } from 'firebase-admin/firestore';
import {
  assembleState,
  BLOB_FIELDS,
  COLLECTIONS,
  safeId,
  type Doc,
  type PersistIndex,
  planWrites,
  type RawStore,
  type StateLike
} from './stateDiff.ts';

export interface FirestoreStore {
  /** Dieselbe konfigurierte Datenbank für gezielte ExamRepository-Operationen. */
  getDatabase(): Firestore;
  /** Liest alle normalen Dokumente, aber keine großen PDF-Blob-Inhalte. */
  loadAll(): Promise<StateLike | null>;
  /** Liest die Teilstücke eines einzelnen PDFs erst beim tatsächlichen Abruf. */
  loadBlobChunks(collection: string, id: string, field: string, count: number): Promise<string>;
  /** Merkt den Zustand zum Speichern vor. Aufeinanderfolgende Aufrufe werden gebündelt. */
  scheduleSave(state: StateLike): void;
  /** Wartet, bis alles geschrieben ist (z. B. vor dem Beenden). */
  flush(): Promise<void>;
  /** Persistiert ausstehende Änderungen und wirft bei einem Schreibfehler statt ihn zu verschlucken. */
  flushStrict(): Promise<void>;
  /** Token, mit dem sich der Browser bei Firebase anmeldet. */
  createCustomToken(uid: string): Promise<string>;
}

export interface FirestoreStoreOptions {
  /** Dienstkonto als JSON-Text oder als Base64 davon. */
  serviceAccount: string;
  /** Name der Datenbank, leer für "(default)". */
  databaseId?: string;
}

const SAVE_DELAY_MS = 300;
const RETRY_DELAY_MS = 5000;
// The documented 15 MB raw PDF limit needs about 30 chunks at the current 700 kB chunk size.
const MAX_PDF_BLOB_CHUNKS = 64;

export function parseServiceAccount(raw: string): Record<string, unknown> {
  const text = raw.trim();
  const json = text.startsWith('{') ? text : Buffer.from(text, 'base64').toString('utf8');
  const parsed = JSON.parse(json) as Record<string, unknown>;
  if (typeof parsed.project_id !== 'string' || typeof parsed.private_key !== 'string') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT ist kein gültiger Dienstkonto-Schlüssel.');
  }
  return parsed;
}

export async function openFirestoreStore(options: FirestoreStoreOptions): Promise<FirestoreStore> {
  const appModule = await import('firebase-admin/app');
  const firestoreModule = await import('firebase-admin/firestore');
  const authModule = await import('firebase-admin/auth');

  const credentials = parseServiceAccount(options.serviceAccount);
  const app =
    appModule.getApps()[0] ||
    appModule.initializeApp({ credential: appModule.cert(credentials as never) });
  const db = options.databaseId
    ? firestoreModule.getFirestore(app, options.databaseId)
    : firestoreModule.getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Einstellungen wurden schon gesetzt.
  }

  let index: PersistIndex = new Map();
  let pending: StateLike | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;
  let strictFlushing = false;

  async function writeOnce(): Promise<void> {
    const state = pending;
    pending = null;
    if (!state) return;

    const plan = planWrites(index, state, Date.now());
    if (plan.ops.length === 0) return;

    const writer = db.bulkWriter();
    const results: Array<Promise<unknown>> = [];
    for (const op of plan.ops) {
      const ref = db.doc(op.path);
      results.push(op.kind === 'set' ? writer.set(ref, op.data) : writer.delete(ref));
    }
    await writer.close();
    const settled = await Promise.allSettled(results);
    const failure = settled.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failure) {
      // Nichts als gespeichert vermerken: der nächste Versuch schreibt alles Offene erneut.
      pending = pending ?? state;
      throw failure.reason;
    }

    plan.commit();
    if (plan.significant) {
      await db.doc('sync/state').set({ v: Date.now() });
    }
  }

  function run(): Promise<void> {
    if (running) return running;
    running = (async () => {
      try {
        while (pending) {
          try {
            await writeOnce();
          } catch (err) {
            console.error('[Firestore] Speichern fehlgeschlagen, neuer Versuch in 5 s:', err);
            schedule(RETRY_DELAY_MS);
            return;
          }
        }
      } finally {
        running = null;
      }
    })();
    return running;
  }

  function schedule(delayMs: number): void {
    if (strictFlushing || timer) return;
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, delayMs);
  }

  async function flushPendingStrict(): Promise<void> {
    strictFlushing = true;
    let failed = false;
    try {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (running) await running;
      while (pending) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        await writeOnce();
      }
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      strictFlushing = false;
      if (pending) schedule(failed ? RETRY_DELAY_MS : SAVE_DELAY_MS);
    }
  }

  return {
    getDatabase() {
      return db;
    },

    async loadAll() {
      const metaSnap = await db.doc('meta/state').get();
      if (!metaSnap.exists) return null;
      const orderSnap = await db.doc('meta/order').get();

      const raw: RawStore = {
        collections: {},
        blobs: new Map(),
        order: orderSnap.exists ? (orderSnap.data() as Record<string, string[]>) : null,
        meta: metaSnap.data() as Doc
      };
      await Promise.all(
        COLLECTIONS.map(async spec => {
          const snap = await db.collection(spec.name).get();
          raw.collections[spec.name] = snap.docs.map(d => d.data() as Doc);
        })
      );

      // Large PDF chunks are deliberately not loaded into server memory during startup.
      const assembled = assembleState(raw, Date.now(), { lazyBlobs: true });
      if (!assembled) return null;
      index = assembled.index;
      return assembled.state;
    },
    async loadBlobChunks(collection, id, field, count) {
      if (!BLOB_FIELDS[collection]?.includes(field)) {
        throw new Error('FIRESTORE_BLOB_FIELD_INVALID');
      }
      if (!Number.isSafeInteger(count) || count < 1 || count > MAX_PDF_BLOB_CHUNKS) {
        throw new Error('FIRESTORE_BLOB_CHUNK_COUNT_INVALID');
      }
      const refs = Array.from({ length: count }, (_, part) =>
        db.doc(`blobs/${collection}__${safeId(id)}__${field}__${part}`)
      );
      const snapshots = await db.getAll(...refs);
      const parts = snapshots.map((snapshot, part) => {
        if (!snapshot.exists || typeof snapshot.get('data') !== 'string') {
          throw new Error(`FIRESTORE_BLOB_CHUNK_MISSING:${part}`);
        }
        return snapshot.get('data') as string;
      });
      return parts.join('');
    },

    scheduleSave(state) {
      pending = state;
      schedule(SAVE_DELAY_MS);
    },

    async flush() {
      // A flush is a durability boundary: callers must never mistake a failed write for success.
      await flushPendingStrict();
    },

    async flushStrict() {
      await flushPendingStrict();
    },

    createCustomToken(uid) {
      return authModule.getAuth(app).createCustomToken(uid, { portal: true });
    }
  };
}
