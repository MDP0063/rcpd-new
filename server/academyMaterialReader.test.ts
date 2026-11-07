import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractHeadings } from '../src/lib/academyMaterialOutline.ts';

test('reader outline matches Markdown heading levels, duplicate slugs and fenced-code boundaries', () => {
  const headings = extractHeadings('Intro\n===\n\n# Repeated\n\n## Repeated\n\n````ts\n# not a heading\n```\n# still code\n````\n\n### After code');
  assert.deepEqual(headings.map(item => [item.level, item.title, item.id, item.line]), [
    [1, 'Intro', 'intro', 1],
    [1, 'Repeated', 'repeated', 4],
    [2, 'Repeated', 'repeated-1', 6],
    [3, 'After code', 'after-code', 14]
  ]);
});
