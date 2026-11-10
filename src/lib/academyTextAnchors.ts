import type { AcademyPrivateNoteTextAnchor } from '../types/academy';

export interface TextAnchorSelection {
  kind: 'markdown' | 'code';
  text: string;
  startOffset: number;
  endOffset: number;
  headingPath?: string[];
}

export type TextAnchorResolution =
  | { status: 'resolved'; start: number; end: number }
  | { status: 'missing' }
  | { status: 'ambiguous'; matches: number };

const MAX_QUOTE_LENGTH = 1000;
const CONTEXT_LENGTH = 80;

export function createTextAnchor(selection: TextAnchorSelection, sourceText: string): AcademyPrivateNoteTextAnchor | null {
  const quote = selection.text.trim();
  if (!quote || quote.length > MAX_QUOTE_LENGTH ||
      selection.startOffset < 0 || selection.endOffset <= selection.startOffset ||
      selection.endOffset > sourceText.length ||
      sourceText.slice(selection.startOffset, selection.endOffset) !== selection.text) return null;

  const anchor: AcademyPrivateNoteTextAnchor = {
    kind: selection.kind,
    quote,
    prefix: sourceText.slice(Math.max(0, selection.startOffset - CONTEXT_LENGTH), selection.startOffset),
    suffix: sourceText.slice(selection.endOffset, selection.endOffset + CONTEXT_LENGTH)
  };
  if (selection.kind === 'markdown' && selection.headingPath?.length) {
    anchor.headingPath = selection.headingPath.slice(-6).map(value => value.slice(0, 120));
  }
  if (selection.kind === 'code') {
    anchor.startLine = sourceText.slice(0, selection.startOffset).split(/\r?\n/).length;
    anchor.endLine = anchor.startLine + (selection.text.match(/\n/g)?.length ?? 0);
  }
  return anchor;
}

export function resolveTextAnchor(sourceText: string, anchor: AcademyPrivateNoteTextAnchor): TextAnchorResolution {
  if (!anchor.quote || anchor.quote.length > MAX_QUOTE_LENGTH) return { status: 'missing' };
  const matches: number[] = [];
  let from = 0;
  while (from <= sourceText.length - anchor.quote.length) {
    const index = sourceText.indexOf(anchor.quote, from);
    if (index < 0) break;
    const before = sourceText.slice(Math.max(0, index - anchor.prefix.length), index);
    const after = sourceText.slice(index + anchor.quote.length, index + anchor.quote.length + anchor.suffix.length);
    if (before === anchor.prefix && after === anchor.suffix) matches.push(index);
    from = index + 1;
  }
  if (matches.length === 0) return { status: 'missing' };
  if (matches.length > 1) return { status: 'ambiguous', matches: matches.length };
  return { status: 'resolved', start: matches[0], end: matches[0] + anchor.quote.length };
}
