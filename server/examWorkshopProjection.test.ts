import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectExamWorkshopMaster, shuffleMatchingProjection } from './examWorkshopProjection.ts';

test('Matching-Projektion nutzt Fisher–Yates und kann jede Permutation erzeugen', () => {
  const permutations = new Set<string>();
  for (let firstPick = 0; firstPick < 3; firstPick += 1) {
    for (let secondPick = 0; secondPick < 2; secondPick += 1) {
      const choices = [firstPick, secondPick];
      const shuffled = shuffleMatchingProjection(['a', 'b', 'c'], () => choices.shift()!);
      permutations.add(shuffled.join(''));
    }
  }
  assert.equal(permutations.size, 6);
  assert.deepEqual([...permutations].sort(), ['abc', 'acb', 'bac', 'bca', 'cab', 'cba']);
  assert.throws(() => shuffleMatchingProjection(['a', 'b'], () => 2), /EXAM_MATCHING_SHUFFLE_INVALID/);
});

test('delegated workshop projection removes answer keys and private scoring fields', () => {
  assert.throws(
    () => projectExamWorkshopMaster({ id: 'exam_safe', questions: [] } as any, false),
    /EXAM_WORKSHOP_PROJECTION_SECRET_INVALID/
  );
  const projected = projectExamWorkshopMaster({
    id: 'exam_safe',
    title: 'Training',
    authorUid: 'private-author-uid',
    currentPublishedVersionId: 'private-version-document-id',
    assessmentStage: 'test',
    questions: [{
      id: 'q1', type: 'matching', question: 'Match', pointsMilli: 1000,
      correctOptionId: 'secret', correctOptionIds: ['secret'], correctBoolean: true,
      explanation: 'secret explanation', gradingRubric: 'private rubric', internalScore: 9,
      matchingPairs: [
        { id: 'pair-cat', prompt: 'Cat', targetId: 'target-feline', targetText: 'Feline' },
        { id: 'pair-car', prompt: 'Car', targetId: 'target-vehicle', targetText: 'Vehicle' },
        { id: 'pair-plane', prompt: 'Plane', targetId: 'target-aircraft', targetText: 'Aircraft' }
      ],
      options: [{ id: 'secret', text: 'Visible option' }]
    }]
  }, false, 'projection-test-secret-is-at-least-32-bytes');
  const json = JSON.stringify(projected);
  for (const forbidden of ['correctOptionId', 'correctOptionIds', 'correctBoolean', 'explanation', 'gradingRubric', 'internalScore', 'targetId']) {
    assert.equal(json.includes(forbidden), false, `projection exposed ${forbidden}`);
  }
  assert.equal(json.includes('private-author-uid'), false);
  assert.equal(json.includes('private-version-document-id'), false);
  const question = (projected.questions as any[])[0];
  assert.equal(question.options[0].text, 'Visible option');
  const prompts = question.matchingPairs as Array<{ id: string; prompt: string }>;
  const targets = question.matchingTargets as Array<{ id: string; text: string }>;
  const originalPairIds = ['pair-cat', 'pair-car', 'pair-plane'];
  const originalTargetIds = ['target-feline', 'target-vehicle', 'target-aircraft'];
  const promptIds = prompts.map(pair => pair.id);
  const targetIds = targets.map(target => target.id);
  assert.equal(prompts.length, originalPairIds.length);
  assert.equal(targets.length, originalTargetIds.length);
  assert.deepEqual(new Set(prompts.map(pair => pair.prompt)), new Set(['Cat', 'Car', 'Plane']));
  assert.deepEqual(new Set(targets.map(target => target.text)), new Set(['Feline', 'Vehicle', 'Aircraft']));
  assert.equal(new Set(targets.map(target => target.text)).size, targets.length);
  assert.equal(new Set(promptIds).size, prompts.length, 'prompt alias IDs must be unique');
  assert.equal(new Set(targetIds).size, targets.length, 'target alias IDs must be unique');
  assert.equal(promptIds.some(id => originalPairIds.includes(id)), false);
  assert.equal(targetIds.some(id => originalTargetIds.includes(id)), false);
  assert.equal(promptIds.some(id => originalTargetIds.includes(id)), false);
  assert.equal(targetIds.some(id => originalPairIds.includes(id)), false);
  assert.equal(promptIds.some(id => targetIds.includes(id)), false, 'prompt and target aliases must be disjoint');
  assert.equal(prompts.every(pair => Object.keys(pair).sort().join(',') === 'id,prompt'), true);
  assert.equal(targets.every(target => Object.keys(target).sort().join(',') === 'id,text'), true);
  assert.deepEqual(Object.keys(question).sort(), ['id', 'matchingPairs', 'matchingTargets', 'options', 'pointsMilli', 'question', 'type']);
});

test('administrator projection retains the complete master document', () => {
  const master = {
    id: 'exam_admin',
    questions: [{
      id: 'q1', correctOptionId: 'right', matchingPairs: [
        { id: 'pair-cat', prompt: 'Cat', targetId: 'target-feline', targetText: 'Feline' }
      ]
    }]
  };
  assert.deepEqual(projectExamWorkshopMaster(master, true, 'projection-test-secret-is-at-least-32-bytes'), master);
});
