import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPercent, meetsPassingScore, roundDivHalfUp, scoreBasisPoints } from './examMath.ts';

test('roundDivHalfUp rundet halbe Einheiten aufwärts und bleibt ganzzahlig', () => {
  assert.equal(roundDivHalfUp(1, 2), 1);
  assert.equal(roundDivHalfUp(1, 3), 0);
  assert.equal(roundDivHalfUp(2, 3), 1);
  assert.equal(roundDivHalfUp(1000, 3), 333);
  assert.equal(roundDivHalfUp(2000, 3), 667);
  assert.equal(roundDivHalfUp(0, 7), 0);
});

test('roundDivHalfUp lehnt ungültige Eingaben ab', () => {
  assert.throws(() => roundDivHalfUp(1, 0), RangeError);
  assert.throws(() => roundDivHalfUp(-1, 2), RangeError);
  assert.throws(() => roundDivHalfUp(1.5, 2), RangeError);
  assert.throws(() => roundDivHalfUp(Number.NaN, 2), RangeError);
});

test('Bestehensvergleich: genau auf der Grenze besteht, knapp darunter nicht', () => {
  // 3 von 4 Punkten = exakt 75 %
  assert.ok(meetsPassingScore(3000, 4000, 7500));
  // 74,95 % wird als 75 angezeigt, besteht aber nicht
  assert.ok(!meetsPassingScore(1499, 2000, 7500));
  assert.equal(formatPercent(scoreBasisPoints(1499, 2000)), 75);
  // 2 von 3 = 66,666...% liegt unter 66,67 % und über 66,66 %
  assert.ok(!meetsPassingScore(2000, 3000, 6667));
  assert.ok(meetsPassingScore(2000, 3000, 6666));
});

test('Bestehensvergleich: Grenzwerte 0 % und 100 %', () => {
  assert.ok(meetsPassingScore(0, 1000, 0));
  assert.ok(!meetsPassingScore(999, 1000, 10000));
  assert.ok(meetsPassingScore(1000, 1000, 10000));
});

test('Bestehensvergleich: ungültige Werte führen nie zum Bestehen', () => {
  assert.ok(!meetsPassingScore(1000, 0, 0));
  assert.ok(!meetsPassingScore(1000, 1000, 10001));
  assert.ok(!meetsPassingScore(1000, 1000, 75.5));
  assert.ok(!meetsPassingScore(-1, 1000, 0));
  assert.ok(!meetsPassingScore(Number.NaN, 1000, 0));
});

test('Bestehensvergleich ist bei großen Werten exakt (kein Überlauf)', () => {
  const total = 9_000_000_000_000; // nahe der sicheren Ganzzahlgrenze
  assert.ok(meetsPassingScore(total, total, 10000));
  assert.ok(!meetsPassingScore(total - 1, total, 10000));
});

test('Anzeige-Prozent wird kaufmännisch gerundet', () => {
  assert.equal(formatPercent(7449), 74);
  assert.equal(formatPercent(7450), 75);
  assert.equal(formatPercent(0), 0);
  assert.equal(formatPercent(10000), 100);
  assert.equal(scoreBasisPoints(0, 0), 0);
});
