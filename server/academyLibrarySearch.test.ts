import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLibrarySearchScore,
  matchesLibrarySearch,
  sortLibraryEntries
} from '../src/lib/academyLibrarySearch.ts';

const entries = [
  { title: 'Funkverfahren', code: 'MAT-001', category: 'Kommunikation', documentTypeName: 'SOP', description: 'Grundlagen des Funkverkehrs', updatedIso: '2026-11-01T10:00:00.000Z' },
  { title: 'Einsatzgrundlagen', code: 'MAT-002', category: 'Taktik', documentTypeName: 'Leitfaden', description: 'Grundlagen für den Einsatz', updatedIso: '2026-11-03T10:00:00.000Z' },
  { title: 'Funk-SOP', code: 'MAT-003', category: 'Kommunikation', documentTypeName: 'Dienstanweisung', description: 'Verbindliche Funkregeln', updatedIso: '' }
];

test('library search ranks title and code matches above weaker metadata matches', () => {
  assert.ok(getLibrarySearchScore(entries[0], 'Funkverfahren') > getLibrarySearchScore(entries[0], 'Kommunikation'));
  const results = sortLibraryEntries(entries.filter(entry => matchesLibrarySearch(entry, 'Funk')), 'Funk', 'relevance');
  assert.deepEqual(results.map(entry => entry.title), ['Funk-SOP', 'Funkverfahren']);
});

test('library search requires every query token but allows tokens across metadata fields', () => {
  assert.equal(matchesLibrarySearch(entries[0], 'Funk Kommunikation'), true);
  assert.equal(matchesLibrarySearch(entries[0], 'Funk nichtvorhanden'), false);
  assert.equal(matchesLibrarySearch(entries[0], '   '), true);
});

test('library search is case-insensitive and treats German diacritics consistently', () => {
  assert.equal(matchesLibrarySearch({ ...entries[0], title: 'Überblick' }, 'uberblick'), true);
  assert.equal(matchesLibrarySearch(entries[0], 'FUNK'), true);
});

test('relevance sort falls back to alphabetical order without a search query', () => {
  assert.deepEqual(
    sortLibraryEntries(entries, '', 'relevance').map(entry => entry.title),
    ['Einsatzgrundlagen', 'Funk-SOP', 'Funkverfahren']
  );
});

test('alphabetical and actual update-date sorting remain deterministic', () => {
  assert.deepEqual(
    sortLibraryEntries(entries.filter(entry => matchesLibrarySearch(entry, 'Funk')), 'Funk', 'alphabetical').map(entry => entry.title),
    ['Funk-SOP', 'Funkverfahren']
  );
  assert.deepEqual(
    sortLibraryEntries(entries, '', 'updated').map(entry => entry.title),
    ['Einsatzgrundlagen', 'Funkverfahren', 'Funk-SOP']
  );
});
