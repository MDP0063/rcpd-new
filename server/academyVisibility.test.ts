import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAcademyEntryVisible } from './academyVisibility.ts';

test('published available academy entries are visible in the catalog', () => {
  assert.equal(isAcademyEntryVisible({ publicationStatus: 'published', availability: 'available', isManager: false, hasParticipation: false }), true);
});
test('unavailable or archived entries stay hidden without a participation', () => {
  assert.equal(isAcademyEntryVisible({ publicationStatus: 'published', availability: 'unavailable', isManager: false, hasParticipation: false }), false);
  assert.equal(isAcademyEntryVisible({ publicationStatus: 'archived', availability: 'available', isManager: false, hasParticipation: false }), false);
});
test('existing participants retain access to archived and unavailable history', () => {
  assert.equal(isAcademyEntryVisible({ publicationStatus: 'archived', availability: 'unavailable', isManager: false, hasParticipation: true }), true);
});
test('managers retain access to drafts and archived entries', () => {
  assert.equal(isAcademyEntryVisible({ publicationStatus: 'draft', availability: 'available', isManager: true, hasParticipation: false }), true);
});
