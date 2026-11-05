import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectExamWorkshopMaster } from './examWorkshopProjection.ts';

test('delegated workshop projection removes answer keys and private scoring fields', () => {
  const projected = projectExamWorkshopMaster({
    id: 'exam_safe',
    title: 'Training',
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
  }, false);
  const json = JSON.stringify(projected);
  for (const forbidden of ['correctOptionId', 'correctOptionIds', 'correctBoolean', 'explanation', 'gradingRubric', 'internalScore', 'targetId']) {
    assert.equal(json.includes(forbidden), false, `projection exposed ${forbidden}`);
  }
  const question = (projected.questions as any[])[0];
  assert.equal(question.options[0].text, 'Visible option');
  assert.deepEqual(new Set(question.matchingPairs.map((pair: { id: string; prompt: string }) => `${pair.id}:${pair.prompt}`)), new Set([
    'pair-cat:Cat', 'pair-car:Car', 'pair-plane:Plane'
  ]));
  assert.deepEqual(new Set(question.matchingTargets.map((target: { text: string }) => target.text)), new Set(['Feline', 'Vehicle', 'Aircraft']));
  assert.equal(question.matchingPairs.some((pair: Record<string, unknown>) => 'targetText' in pair || 'targetId' in pair), false);
  assert.equal(question.matchingTargets.some((target: Record<string, unknown>) => 'prompt' in target), false);

  // Explicitly prove the response does not retain the source's pair-by-pair positional mapping.
  assert.deepEqual(new Set(question.matchingPairs.map((pair: { id: string }) => pair.id)), new Set(['pair-cat', 'pair-car', 'pair-plane']));
  const originalTargetIds = ['target-feline', 'target-vehicle', 'target-aircraft'];
  assert.deepEqual(new Set(question.matchingTargets.map((target: { id: string }) => target.id)), new Set(originalTargetIds));
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
  assert.deepEqual(projectExamWorkshopMaster(master, true), master);
});
