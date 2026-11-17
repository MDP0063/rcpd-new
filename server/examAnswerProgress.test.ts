import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  answerPersistenceState,
  areAnswerMapsEqual,
  areAnswerValuesEqual,
  countConfirmedAnswers,
  countPendingAnswers,
  hasAnswer
} from '../src/lib/examAnswerProgress.ts';

test('only server-confirmed answers count as answered', () => {
  const questionIds = ['single', 'text', 'boolean'];
  const local = { single: 'option-a', text: 'draft', boolean: false };
  const confirmed = { single: null, text: null, boolean: null };

  assert.equal(countConfirmedAnswers(questionIds, confirmed), 0);
  assert.equal(countPendingAnswers(questionIds, local, confirmed), 3);
});

test('a previously saved answer remains confirmed while a local replacement is pending', () => {
  const questionIds = ['single', 'text'];
  const local = { single: 'option-b', text: '' };
  const confirmed = { single: 'option-a', text: 'previously saved' };

  assert.equal(countConfirmedAnswers(questionIds, confirmed), 2);
  assert.equal(countPendingAnswers(questionIds, local, confirmed), 2);
  assert.equal(answerPersistenceState(local.single, confirmed.single, 'saving'), 'pending');
  assert.equal(answerPersistenceState(local.text, confirmed.text, 'saving'), 'pending');
});

test('failed saves are visible without falsely counting unsaved drafts', () => {
  const questionIds = ['saved', 'draft'];
  const local = { saved: 'a', draft: 'b' };
  const confirmed = { saved: 'a', draft: null };

  assert.equal(countConfirmedAnswers(questionIds, confirmed), 1);
  assert.equal(countPendingAnswers(questionIds, local, confirmed), 1);
  assert.equal(answerPersistenceState(local.saved, confirmed.saved, 'error'), 'saved');
  assert.equal(answerPersistenceState(local.draft, confirmed.draft, 'error'), 'error');
});

test('false is a valid saved answer while empty text and empty selections are not', () => {
  assert.equal(hasAnswer(false), true);
  assert.equal(hasAnswer('  '), false);
  assert.equal(hasAnswer([]), false);
  assert.equal(hasAnswer(null), false);
  assert.equal(countConfirmedAnswers(['boolean', 'text', 'multi'], {
    boolean: false,
    text: ' ',
    multi: []
  }), 1);
});

test('empty representations compare as the same unanswered state', () => {
  assert.equal(areAnswerValuesEqual(undefined, null), true);
  assert.equal(areAnswerValuesEqual('', null), true);
  assert.equal(areAnswerValuesEqual('   ', undefined), true);
  assert.equal(areAnswerValuesEqual([], null), true);
  assert.equal(areAnswerMapsEqual({ q1: '', q2: [] }, { q1: null, q2: undefined }), true);
});

test('matching and multiple-choice arrays compare by their serialized answer snapshot', () => {
  assert.equal(areAnswerValuesEqual(['a', 'b'], ['a', 'b']), true);
  assert.equal(areAnswerValuesEqual(['a', 'b'], ['b', 'a']), false);
  assert.equal(areAnswerValuesEqual([{ pairId: 'p1', targetId: 't1' }], [{ pairId: 'p1', targetId: 't1' }]), true);
});
