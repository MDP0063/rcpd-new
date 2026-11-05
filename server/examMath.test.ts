import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPercent, meetsPassingScore, mulDivHalfUpClamped, roundDivHalfUp, scoreBasisPoints } from './examMath.ts';

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

const BIG = 9_007_199_254_740_991; // Number.MAX_SAFE_INTEGER

test('Produkt wird nie als Number gebildet: große gültige Werte bleiben exakt', () => {
  // earned * 10000 liegt weit über 2^53; exakt: BIG von BIG = 10000
  assert.equal(scoreBasisPoints(BIG, BIG), 10000);
  // (BIG - 1) / BIG * 10000 = 9999,99999... -> 10000 (aufgerundet); BIG/2 -> 5000
  assert.equal(scoreBasisPoints(BIG - 1, BIG), 10000);
  assert.equal(scoreBasisPoints(1, BIG), 0);
  assert.equal(scoreBasisPoints(4_503_599_627_370_496, BIG), 5000);
  // Referenz per BigInt
  const e = 7_000_000_000_000_001, t = 9_000_000_000_000_000;
  const ref = Number((2n * BigInt(e) * 10000n + BigInt(t)) / (2n * BigInt(t)));
  assert.equal(scoreBasisPoints(e, t), ref);
});

test('mulDivHalfUpClamped: exakte Rundung bei großen Faktoren und Begrenzung', () => {
  assert.equal(mulDivHalfUpClamped(BIG, BIG, BIG, BIG), BIG);
  assert.equal(mulDivHalfUpClamped(1, BIG, 2, BIG), 4_503_599_627_370_496); // halbe Einheit aufwärts
  assert.equal(mulDivHalfUpClamped(3, BIG, 2, 1000), 1000); // Begrenzung
  assert.equal(mulDivHalfUpClamped(0, BIG, 5, 10), 0);
  assert.throws(() => mulDivHalfUpClamped(1, 1, 0, 1), RangeError);
  assert.throws(() => mulDivHalfUpClamped(-1, 1, 1, 1), RangeError);
  assert.throws(() => mulDivHalfUpClamped(1.5, 1, 1, 1), RangeError);
});

test('Bestehensvergleich bei maximalen Werten: Grenze exakt', () => {
  assert.ok(meetsPassingScore(BIG, BIG, 10000));
  assert.ok(!meetsPassingScore(BIG - 1, BIG, 10000));
  // 75 % von 8 Billiarden (durch 4 teilbar) exakt auf der Grenze
  const total = 8_000_000_000_000_000;
  assert.ok(meetsPassingScore(6_000_000_000_000_000, total, 7500));
  assert.ok(!meetsPassingScore(5_999_999_999_999_999, total, 7500));
});
