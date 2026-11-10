import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isApplicationStatus,
  isOfficerRole,
  isRankChangeRequestRole,
  isWhitelistPromotionRole,
  isWhitelistStatus
} from './accountValidation.ts';

test('account roles accept only the five configured role values', () => {
  for (const value of ['admin', 'colonel', 'officer', 'rookie', 'trainee']) {
    assert.equal(isOfficerRole(value), true);
  }
  for (const value of ['superadmin', '__proto__', 'constructor', '', null, 1, {}, []]) {
    assert.equal(isOfficerRole(value), false);
  }
});

test('whitelist status accepts only configured lifecycle values', () => {
  for (const value of ['whitelisted', 'probation', 'pending', 'suspended', 'revoked']) {
    assert.equal(isWhitelistStatus(value), true);
  }
  for (const value of ['approved', 'deleted', '__proto__', '', null, {}, []]) {
    assert.equal(isWhitelistStatus(value), false);
  }
});

test('application status accepts only configured workflow values', () => {
  for (const value of ['pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected']) {
    assert.equal(isApplicationStatus(value), true);
  }
  for (const value of ['approved', 'closed', '__proto__', '', null, {}, []]) {
    assert.equal(isApplicationStatus(value), false);
  }
});

test('whitelist acceptance cannot assign the protected admin role', () => {
  for (const value of ['trainee', 'rookie', 'officer', 'colonel']) {
    assert.equal(isWhitelistPromotionRole(value), true);
  }
  for (const value of ['admin', '__proto__', 'constructor', '', null, {}, []]) {
    assert.equal(isWhitelistPromotionRole(value), false);
  }
});

test('rank change requests are limited to the ranks offered by the existing form', () => {
  for (const value of ['rookie', 'officer', 'colonel']) {
    assert.equal(isRankChangeRequestRole(value), true);
  }
  for (const value of ['admin', 'trainee', '__proto__', 'constructor', '', null, {}, []]) {
    assert.equal(isRankChangeRequestRole(value), false);
  }
});
