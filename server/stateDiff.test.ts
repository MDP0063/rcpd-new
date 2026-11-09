import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assembleState,
  CHUNK_SIZE,
  type Doc,
  type PersistIndex,
  planWrites,
  stableDigest,
  type RawStore,
  type StateLike
} from './stateDiff.ts';

function account(uid: string, extra: Doc = {}): Doc {
  return {
    uid,
    username: uid,
    isOnline: false,
    lastSeenIso: 't0',
    publicProfile: { uid, displayName: uid, isOnline: false, lastSeenIso: 't0' },
    privateProfile: { uid },
    ...extra
  };
}

function baseState(): StateLike {
  return {
    version: 3,
    accounts: [account('a1')],
    applications: [],
    modules: [],
    exams: [],
    progress: [],
    messages: [],
    deploymentConfig: { branchName: 'main' }
  };
}

/** Simuliert Firestore: führt die Schreibvorgänge aus und liefert den gespeicherten Stand als RawStore. */
function applyToFake(
  ops: ReturnType<typeof planWrites>['ops'],
  store: Map<string, Doc>
): RawStore {
  for (const op of ops) {
    if (op.kind === 'set') store.set(op.path, JSON.parse(JSON.stringify(op.data)));
    else store.delete(op.path);
  }
  const raw: RawStore = { collections: {}, blobs: new Map(), order: null, meta: null };
  for (const [path, data] of store) {
    const [col, ...rest] = path.split('/');
    if (col === 'blobs') raw.blobs.set(path, String(data.data));
    else if (path === 'meta/order') raw.order = data as Record<string, string[]>;
    else if (path === 'meta/state') raw.meta = data;
    else (raw.collections[col] ||= []).push({ ...data });
    void rest;
  }
  return raw;
}

test('erstes Speichern schreibt alles, zweites ohne Änderung nichts', () => {
  const index: PersistIndex = new Map();
  const state = baseState();
  const first = planWrites(index, state, 1000);
  assert.ok(first.significant);
  assert.ok(first.ops.some(o => o.kind === 'set' && o.path === 'accounts/a1'));
  assert.ok(first.ops.some(o => o.kind === 'set' && o.path === 'meta/order'));
  first.commit();
  const second = planWrites(index, state, 2000);
  assert.equal(second.ops.length, 0);
  assert.equal(second.significant, false);
});

test('Heartbeat: Anwesenheit allein ist keine Änderung und wird gedrosselt geschrieben', () => {
  const index: PersistIndex = new Map();
  const state = baseState();
  planWrites(index, state, 0).commit();

  const acc = (state.accounts as Doc[])[0];
  acc.isOnline = true;
  acc.lastSeenIso = 't1';
  (acc.publicProfile as Doc).isOnline = true;

  const early = planWrites(index, state, 10_000);
  assert.equal(early.ops.length, 0);
  assert.equal(early.significant, false);

  const late = planWrites(index, state, 6 * 60_000);
  assert.equal(late.ops.length, 1);
  assert.equal(late.significant, false);
  late.commit();
  assert.equal(planWrites(index, state, 6 * 60_000 + 1000).ops.length, 0);
});

test('echte Änderung wird erkannt, Löschen entfernt das Dokument', () => {
  const index: PersistIndex = new Map();
  const state = baseState();
  planWrites(index, state, 0).commit();

  (state.accounts as Doc[])[0].username = 'neu';
  const changed = planWrites(index, state, 1);
  assert.ok(changed.significant);
  assert.deepEqual(
    changed.ops.map(o => o.path),
    ['accounts/a1']
  );
  changed.commit();

  state.accounts = [];
  const removed = planWrites(index, state, 2);
  assert.ok(removed.significant);
  assert.ok(removed.ops.some(o => o.kind === 'delete' && o.path === 'accounts/a1'));
});

test('Reihenfolge der Liste bleibt über Speichern und Laden erhalten', () => {
  const index: PersistIndex = new Map();
  const state = baseState();
  state.messages = [{ id: 'm3' }, { id: 'm1' }, { id: 'm2' }];
  const store = new Map<string, Doc>();
  const plan = planWrites(index, state, 0);
  const raw = applyToFake(plan.ops, store);
  plan.commit();

  const loaded = assembleState(raw, 5)!;
  assert.ok(loaded);
  assert.deepEqual(
    (loaded.state.messages as Doc[]).map(m => m.id),
    ['m3', 'm1', 'm2']
  );
  // Nach dem Laden ist nichts mehr zu schreiben.
  assert.equal(planWrites(loaded.index, loaded.state, 10).ops.length, 0);
});

test('große PDF-Felder werden zerlegt, wieder zusammengesetzt und beim Löschen mit entfernt', () => {
  const index: PersistIndex = new Map();
  const state = baseState();
  const pdf = 'x'.repeat(CHUNK_SIZE * 2 + 5);
  state.modules = [{ id: 'mod1', title: 'Handbuch', pdfDataUrl: pdf }];
  const store = new Map<string, Doc>();
  const plan = planWrites(index, state, 0);
  const mainOp = plan.ops.find(o => o.kind === 'set' && o.path === 'modules/mod1') as
    | { kind: 'set'; path: string; data: Doc }
    | undefined;
  assert.equal(mainOp?.data.pdfDataUrl, null);
  assert.equal(plan.ops.filter(o => o.path.startsWith('blobs/')).length, 3);

  const raw = applyToFake(plan.ops, store);
  plan.commit();
  const blobCountBeforeLoad = raw.blobs.size;
  const loaded = assembleState(raw, 1)!;
  assert.ok(loaded);
  assert.equal((loaded.state.modules as Doc[])[0].pdfDataUrl, pdf);
  assert.equal(raw.blobs.size, blobCountBeforeLoad, 'default assembly must preserve the caller-owned blob map');
  assert.equal(planWrites(loaded.index, loaded.state, 2).ops.length, 0);

  // PDF verkleinern: überzählige Teilstücke werden gelöscht
  (state.modules as Doc[])[0].pdfDataUrl = 'y'.repeat(CHUNK_SIZE + 1);
  const shrink = planWrites(index, state, 3);
  assert.equal(shrink.ops.filter(o => o.kind === 'delete').length, 1);
  shrink.commit();

  state.modules = [];
  const gone = planWrites(index, state, 4);
  assert.equal(gone.ops.filter(o => o.kind === 'delete' && o.path.startsWith('blobs/')).length, 2);
});

test('Firestore-Startup kann PDF-Blob-Chunks während der Rekonstruktion freigeben', () => {
  const index: PersistIndex = new Map();
  const state = baseState();
  const pdf = 'x'.repeat(CHUNK_SIZE * 2 + 5);
  state.modules = [{ id: 'mod_lazy', title: 'Legacy-Handbuch', pdfDataUrl: pdf }];
  const store = new Map<string, Doc>();
  const plan = planWrites(index, state, 0);
  const raw = applyToFake(plan.ops, store);
  plan.commit();

  assert.ok(raw.blobs.size > 0);
  const loaded = assembleState(raw, 1, { consumeBlobs: true });
  assert.ok(loaded);
  assert.equal((loaded.state.modules as Doc[])[0].pdfDataUrl, pdf);
  assert.equal(raw.blobs.size, 0);
});

test('private Admin-Recovery-Metadaten bleiben im Firestore-Meta-Dokument erhalten', () => {
  const index: PersistIndex = new Map();
  const state = baseState();
  state.adminRecovery = {
    tokenHash: 'a'.repeat(64),
    expiresAt: '2030-01-01T00:15:00.000Z',
    requestedAt: '2030-01-01T00:00:00.000Z'
  };
  state.adminRecoveryRateLimit = {
    windowStartedAt: '2030-01-01T00:00:00.000Z',
    count: 2
  };
  const store = new Map<string, Doc>();
  const plan = planWrites(index, state, 0);
  const raw = applyToFake(plan.ops, store);
  plan.commit();
  const loaded = assembleState(raw, 1)!;
  assert.deepEqual(loaded.state.adminRecovery, state.adminRecovery);
  assert.deepEqual(loaded.state.adminRecoveryRateLimit, state.adminRecoveryRateLimit);
});

test('leerer Speicher ergibt null', () => {
  assert.equal(
    assembleState({ collections: {}, blobs: new Map(), order: null, meta: null }, 0),
    null
  );
});


test('Academy collections, including private notes, round-trip through Firestore state storage', () => {
  const index: PersistIndex = new Map();
  const state = baseState();
  state.academy_courses = [{ id: 'course_1', code: 'SOP-01' }];
  state.academy_course_versions = [{ id: 'course_1__v1', courseId: 'course_1' }];
  state.academy_programs = [{ id: 'program_1', code: 'BASIC-01' }];
  state.academy_program_versions = [{ id: 'program_1__v1', programId: 'program_1' }];
  state.academy_course_participations = [{ id: 'participation_1', userUid: 'u1' }];
  state.academy_program_participations = [{ id: 'program_participation_1', userUid: 'u1' }];
  state.academy_progress_evidence = [{ id: 'evidence_1', participationId: 'participation_1' }];
  state.academy_completion_corrections = [{ id: 'correction_1', participationId: 'participation_1' }];
  state.academy_private_notes = [{
    id: 'note_1', ownerUid: 'u1', materialId: 'mat_1', materialVersionId: 'mat_1__v1',
    kind: 'note', content: 'private', tags: []
  }];

  const store = new Map<string, Doc>();
  const plan = planWrites(index, state, 0);
  const raw = applyToFake(plan.ops, store);
  plan.commit();
  const loaded = assembleState(raw, 1)!;
  assert.deepEqual(loaded.state.academy_courses, state.academy_courses);
  assert.deepEqual(loaded.state.academy_course_versions, state.academy_course_versions);
  assert.deepEqual(loaded.state.academy_programs, state.academy_programs);
  assert.deepEqual(loaded.state.academy_program_versions, state.academy_program_versions);
  assert.deepEqual(loaded.state.academy_course_participations, state.academy_course_participations);
  assert.deepEqual(loaded.state.academy_program_participations, state.academy_program_participations);
  assert.deepEqual(loaded.state.academy_progress_evidence, state.academy_progress_evidence);
  assert.deepEqual(loaded.state.academy_completion_corrections, state.academy_completion_corrections);
  assert.deepEqual(loaded.state.academy_private_notes, state.academy_private_notes);
});


test('streaming digest is stable across object key insertion order and JSON-compatible omissions', () => {
  const first = {
    z: 1,
    nested: { b: true, a: 'value' },
    omitted: undefined,
    values: [1, undefined, 'three']
  };
  const second = {
    values: [1, null, 'three'],
    nested: { a: 'value', b: true },
    z: 1
  };
  delete (second as { omitted?: undefined }).omitted;
  assert.equal(stableDigest(first), stableDigest(second));
  assert.equal(stableDigest(new Date('2026-01-02T03:04:05.000Z')), stableDigest('2026-01-02T03:04:05.000Z'));
});

test('streaming digest reads large strings deterministically without whole-value serialization', () => {
  const largeValue = 'pdf-data-'.repeat(400_000);
  const first = { modules: [{ id: 'legacy-pdf', pdfDataUrl: largeValue }] };
  const second = structuredClone(first);
  assert.equal(stableDigest(first), stableDigest(second));
  second.modules[0].pdfDataUrl = `${largeValue.slice(0, -1)}x`;
  assert.notEqual(stableDigest(first), stableDigest(second));
});

test('streaming digest rejects values JSON serialization cannot represent', () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.throws(() => stableDigest(circular), /circular/i);
  assert.throws(() => stableDigest({ value: 1n }), /BigInt/);
});

test('streaming digest keeps UTF-16 surrogate pairs intact at chunk boundaries', () => {
  const prefix = 'a'.repeat(16_383);
  assert.notEqual(stableDigest(`${prefix}😀`), stableDigest(`${prefix}\uFFFD\uFFFD`));
});

test('streaming digest distinguishes different lone UTF-16 surrogates', () => {
  assert.notEqual(stableDigest('\uD800'), stableDigest('\uDFFF'));
});
