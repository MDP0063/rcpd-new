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
      matchingPairs: [{ id: 'p1', prompt: 'Prompt', targetId: 'right-target', targetText: 'Target' }],
      options: [{ id: 'secret', text: 'Visible option' }]
    }]
  }, false);
  const json = JSON.stringify(projected);
  for (const forbidden of ['correctOptionId', 'correctOptionIds', 'correctBoolean', 'explanation', 'gradingRubric', 'internalScore', 'right-target']) {
    assert.equal(json.includes(forbidden), false, `projection exposed ${forbidden}`);
  }
  assert.equal((projected.questions as any[])[0].options[0].text, 'Visible option');
});

test('administrator projection retains the complete master document', () => {
  const master = { id: 'exam_admin', questions: [{ id: 'q1', correctOptionId: 'right' }] };
  assert.deepEqual(projectExamWorkshopMaster(master, true), master);
});
