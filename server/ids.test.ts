import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newId } from './ids.ts';

test('ID hat Präfix, Zeitstempel und Zufallsanteil', () => {
  assert.match(newId('msg', 1730000000000), /^msg_1730000000000_[0-9a-f]{16}$/);
});

test('gleiche Millisekunde ergibt trotzdem verschiedene IDs', () => {
  const ids = new Set(Array.from({ length: 5000 }, () => newId('req', 1)));
  assert.equal(ids.size, 5000);
});

test('ID enthält nur Zeichen, die als Firestore-Dokumentname erlaubt sind', () => {
  assert.match(newId('evt'), /^[a-z]+_\d+_[0-9a-f]+$/);
});
