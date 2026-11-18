import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeExamPrerequisite } from '../src/lib/examPrerequisites.ts';

const visibleExams = [
  { id: 'basic', title: 'Grundausbildungsprüfung' },
  { id: 'advanced', title: 'Fortgeschrittenenprüfung' }
];

test('completed prerequisites are described with the visible exam title', () => {
  assert.equal(
    describeExamPrerequisite({ examId: 'basic', mode: 'completed' }, visibleExams),
    'Grundausbildungsprüfung muss abgeschlossen sein.'
  );
});

test('passed prerequisites include a configured minimum score', () => {
  assert.equal(
    describeExamPrerequisite({ examId: 'basic', mode: 'passed', minScoreBasisPoints: 8750 }, visibleExams),
    'Grundausbildungsprüfung muss bestanden sein (mindestens 87,5%).'
  );
});

test('passed prerequisites without a minimum do not invent one', () => {
  assert.equal(
    describeExamPrerequisite({ examId: 'advanced', mode: 'passed' }, visibleExams),
    'Fortgeschrittenenprüfung muss bestanden sein.'
  );
});

test('titles of prerequisites outside the visible catalog are not disclosed', () => {
  assert.equal(
    describeExamPrerequisite({ examId: 'hidden-exam', mode: 'completed' }, visibleExams),
    'Eine vorherige Prüfung muss abgeschlossen sein.'
  );
});

test('invalid configured minimum scores are not rendered as misleading percentages', () => {
  assert.equal(
    describeExamPrerequisite({ examId: 'basic', mode: 'passed', minScoreBasisPoints: 12_000 }, visibleExams),
    'Grundausbildungsprüfung muss bestanden sein.'
  );
});
