import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CoalescedRequestRunner } from '../src/lib/coalescedRequest.ts';

test('coalesces concurrent refreshes into one trailing run without overlap', async () => {
  const runner = new CoalescedRequestRunner();
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
  const calls: string[] = [];
  let active = 0;
  let maxActive = 0;

  const first = runner.run(async () => {
    calls.push('first');
    active += 1;
    maxActive = Math.max(maxActive, active);
    await firstGate;
    active -= 1;
  });
  await Promise.resolve();

  const second = runner.run(async () => { calls.push('second'); });
  const third = runner.run(async () => { calls.push('third'); });
  releaseFirst();
  await Promise.all([first, second, third]);

  assert.deepEqual(calls, ['first', 'third']);
  assert.equal(maxActive, 1);
});

test('runs a queued refresh even if the preceding task rejects, then surfaces the error', async () => {
  const runner = new CoalescedRequestRunner();
  let queuedRan = false;
  const first = runner.run(async () => { throw new Error('first failed'); });
  const second = runner.run(async () => { queuedRan = true; });

  await assert.rejects(Promise.all([first, second]), /first failed/);
  assert.equal(queuedRan, true);
});
