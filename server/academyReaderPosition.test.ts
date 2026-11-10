import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAcademyReaderPositionKey,
  parseAcademyReaderPosition,
  serializeAcademyReaderPosition
} from '../src/lib/academyReaderPosition.ts';

test('reader position keys are scoped to participation and exact material version', () => {
  const first = createAcademyReaderPositionKey('participation-1', 'material-1', 'version-1');
  assert.equal(first, createAcademyReaderPositionKey('participation-1', 'material-1', 'version-1'));
  assert.notEqual(first, createAcademyReaderPositionKey('participation-2', 'material-1', 'version-1'));
  assert.notEqual(first, createAcademyReaderPositionKey('participation-1', 'material-2', 'version-1'));
  assert.notEqual(first, createAcademyReaderPositionKey('participation-1', 'material-1', 'version-2'));
});

test('reader positions round-trip for Markdown and code', () => {
  for (const kind of ['markdown', 'code'] as const) {
    const position = { kind, offset: 1234.5 };
    assert.deepEqual(parseAcademyReaderPosition(serializeAcademyReaderPosition(position)), position);
  }
});

test('reader position parser rejects malformed, unsupported and unsafe values', () => {
  assert.equal(parseAcademyReaderPosition(null), null);
  assert.equal(parseAcademyReaderPosition('{'), null);
  assert.equal(parseAcademyReaderPosition(JSON.stringify({ version: 2, kind: 'markdown', offset: 10 })), null);
  assert.equal(parseAcademyReaderPosition(JSON.stringify({ version: 1, kind: 'pdf', offset: 10 })), null);
  assert.equal(parseAcademyReaderPosition(JSON.stringify({ version: 1, kind: 'code', offset: -1 })), null);
  assert.equal(parseAcademyReaderPosition(JSON.stringify({ version: 1, kind: 'code', offset: Number.NaN })), null);
  assert.equal(parseAcademyReaderPosition(JSON.stringify({ version: 1, kind: 'code', offset: 10_000_001 })), null);
});
