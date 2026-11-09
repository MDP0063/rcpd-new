import assert from 'node:assert/strict';
import test from 'node:test';
import { mapWithConcurrency } from '../src/lib/async.ts';

test('mapWithConcurrency preserves input order and respects the in-flight limit', async () => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7];
  let active = 0;
  let peakActive = 0;

  const result = await mapWithConcurrency(items, 3, async (item, index) => {
    active += 1;
    peakActive = Math.max(peakActive, active);
    await new Promise(resolve => setTimeout(resolve, (items.length - index) % 4));
    active -= 1;
    return item * 10;
  });

  assert.deepEqual(result, [0, 10, 20, 30, 40, 50, 60, 70]);
  assert.equal(peakActive, 3);
  assert.equal(active, 0);
});

test('mapWithConcurrency handles empty input without starting workers', async () => {
  let called = false;
  const result = await mapWithConcurrency([], 4, async () => {
    called = true;
    return 1;
  });
  assert.deepEqual(result, []);
  assert.equal(called, false);
});

test('mapWithConcurrency rejects invalid concurrency values', async () => {
  await assert.rejects(mapWithConcurrency([1], 0, async value => value), /positive safe integer/);
  await assert.rejects(mapWithConcurrency([1], 1.5, async value => value), /positive safe integer/);
});
