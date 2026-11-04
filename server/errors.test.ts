import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeError } from './errors.ts';

test('Fehler: ungültiges JSON, zu große Anfrage und unbekannte Fehler', () => {
  assert.deepEqual(describeError({ type: 'entity.parse.failed', status: 400 }).status, 400);
  assert.equal(describeError({ type: 'entity.too.large', status: 413 }).status, 413);
  const unknown = describeError(new Error('geheimes Detail'));
  assert.equal(unknown.status, 500);
  assert.ok(!unknown.message.includes('geheimes'));
  assert.equal(describeError(undefined).status, 500);
  assert.equal(describeError({ status: 404 }).status, 404);
});
