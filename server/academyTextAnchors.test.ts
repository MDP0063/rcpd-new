import test from 'node:test';
import assert from 'node:assert/strict';
import { createTextAnchor, resolveTextAnchor } from '../src/lib/academyTextAnchors.ts';

test('creates a Markdown anchor with bounded context and heading path', () => {
  const source = '# Basics\nA stable selected passage appears here.';
  const selected = 'stable selected passage';
  const startOffset = source.indexOf(selected);
  const anchor = createTextAnchor({
    kind: 'markdown', text: selected, startOffset, endOffset: startOffset + selected.length,
    headingPath: ['Basics']
  }, source);
  assert.ok(anchor);
  assert.deepEqual(anchor.headingPath, ['Basics']);
  assert.equal(resolveTextAnchor(source, anchor!).status, 'resolved');
});

test('creates code anchors with original line range', () => {
  const source = 'const first = 1;\nconst target = 2;\nconst last = 3;';
  const selected = 'const target = 2;';
  const startOffset = source.indexOf(selected);
  const anchor = createTextAnchor({ kind: 'code', text: selected, startOffset, endOffset: startOffset + selected.length }, source);
  assert.equal(anchor?.startLine, 2);
  assert.equal(anchor?.endLine, 2);
});

test('does not resolve a quote when its surrounding context changed', () => {
  const anchor = { kind: 'markdown' as const, quote: 'target text', prefix: 'old ', suffix: ' end' };
  assert.deepEqual(resolveTextAnchor('new target text end', anchor), { status: 'missing' });
});

test('reports ambiguous matches instead of choosing one', () => {
  const anchor = { kind: 'markdown' as const, quote: 'same', prefix: '', suffix: '' };
  assert.deepEqual(resolveTextAnchor('same and same', anchor), { status: 'ambiguous', matches: 2 });
});

test('rejects empty, oversized, and mismatched selections', () => {
  assert.equal(createTextAnchor({ kind: 'code', text: '', startOffset: 0, endOffset: 0 }, ''), null);
  const source = 'short';
  assert.equal(createTextAnchor({ kind: 'code', text: 'wrong', startOffset: 0, endOffset: 5 }, source), null);
  const oversized = 'x'.repeat(1001);
  assert.equal(createTextAnchor({ kind: 'code', text: oversized, startOffset: 0, endOffset: 1001 }, oversized), null);
});
