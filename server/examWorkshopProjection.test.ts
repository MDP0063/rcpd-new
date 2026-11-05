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
  assert.deepEqual(new Set(question.matchingPairs.map((pair: { prompt: string }) => pair.prompt)), new Set(['Cat', 'Car', 'Plane']));
  assert.deepEqual(new Set(question.matchingTargets.map((target: { text: string }) => target.text)), new Set(['Feline', 'Vehicle', 'Aircraft']));
  assert.equal(question.matchingPairs.some((pair: Record<string, unknown>) => 'targetText' in pair || 'targetId' in pair), false);
  assert.equal(question.matchingTargets.some((target: Record<string, unknown>) => 'prompt' in target), false);

  // Explicitly prove the response does not retain the source's pair-by-pair positional mapping.
  assert.equal(question.matchingPairs.some((pair: { id: string }) => ['pair-cat', 'pair-car', 'pair-plane'].includes(pair.id)), false);
  const originalTargetIds = ['target-feline', 'target-vehicle', 'target-aircraft'];
  assert.equal(question.matchingTargets.some((target: { id: string }) => originalTargetIds.includes(target.id)), false);
  assert.equal(new Set([...question.matchingPairs.map((pair: { id: string }) => pair.id), ...question.matchingTargets.map((target: { id: string }) => target.id)]).size, 6);
  question.matchingTargets.forEach((target: { id: string }, index: number) => {
    assert.notEqual(target.id, originalTargetIds[index], `target at index ${index} retained its source position`);
  });
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
