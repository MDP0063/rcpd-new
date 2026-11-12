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
  const leadingWhitespace = selection.text.length - selection.text.trimStart().length;
  const trailingEnd = selection.text.trimEnd().length;
  const quote = selection.text.trim();
  const startOffset = selection.startOffset + leadingWhitespace;
  const endOffset = selection.startOffset + trailingEnd;
  if (!quote || quote.length > MAX_QUOTE_LENGTH ||
      selection.startOffset < 0 || selection.endOffset <= selection.startOffset ||
      selection.endOffset > sourceText.length ||
      sourceText.slice(selection.startOffset, selection.endOffset) !== selection.text ||
      sourceText.slice(startOffset, endOffset) !== quote) return null;

  const anchor: AcademyPrivateNoteTextAnchor = {
    kind: selection.kind,
    quote,
    prefix: sourceText.slice(Math.max(0, startOffset - CONTEXT_LENGTH), startOffset),
    suffix: sourceText.slice(endOffset, endOffset + CONTEXT_LENGTH)
  };
  if (selection.kind === 'markdown' && selection.headingPath?.length) {
    anchor.headingPath = selection.headingPath.slice(-6).map(value => value.slice(0, 120));
  }
  if (selection.kind === 'code') {
    anchor.startLine = sourceText.slice(0, startOffset).split(/\r?\n/).length;
    anchor.endLine = anchor.startLine + (quote.match(/\n/g)?.length ?? 0);
  }
  return anchor;
}

export function resolveTextAnchor(sourceText: string, anchor: AcademyPrivateNoteTextAnchor): TextAnchorResolution {
  if (typeof anchor.quote !== 'string' || !anchor.quote || anchor.quote.length > MAX_QUOTE_LENGTH ||
      typeof anchor.prefix !== 'string' || typeof anchor.suffix !== 'string' ||
      anchor.prefix.length > CONTEXT_LENGTH || anchor.suffix.length > CONTEXT_LENGTH) return { status: 'missing' };
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


/** Determine the nearest Markdown heading hierarchy for a selected text node. */
export function headingPathForTextNode(root: HTMLElement, node: Text): string[] {
  const stack: Array<{ level: number; title: string }> = [];
  for (const heading of Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6'))) {
    const parent = node.parentElement;
    const precedesNode = heading.contains(node) || Boolean(parent &&
      (heading.compareDocumentPosition(parent) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    if (!precedesNode) continue;
    const level = Number(heading.tagName.slice(1));
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    const title = heading.textContent?.trim() || '';
    if (title) stack.push({ level, title });
  }
  return stack.slice(-6).map(item => item.title);
}

/** Create an anchor only when a browser selection maps exactly to one text node. */
export function createTextAnchorFromRange(
  root: HTMLElement,
  kind: 'markdown' | 'code',
  range: Range
): AcademyPrivateNoteTextAnchor | null {
  if (range.startContainer !== range.endContainer ||
      range.startContainer.nodeType !== Node.TEXT_NODE ||
      !root.contains(range.startContainer)) return null;
  const node = range.startContainer as Text;
  return createTextAnchor({
    kind,
    text: range.toString(),
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    headingPath: kind === 'markdown' ? headingPathForTextNode(root, node) : []
  }, node.textContent || '');
}

export type TextAnchorDomResolution =
  | { status: 'resolved'; range: Range }
  | { status: 'missing' }
  | { status: 'ambiguous'; matches: number };

/** Resolve a saved anchor within the exact currently rendered material version. */
export function resolveTextAnchorInElement(
  root: HTMLElement,
  anchor: AcademyPrivateNoteTextAnchor
): TextAnchorDomResolution {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const matches: Array<{ node: Text; start: number; end: number }> = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const node = current as Text;
    if (anchor.kind === 'markdown' && anchor.headingPath?.length &&
        JSON.stringify(headingPathForTextNode(root, node)) !== JSON.stringify(anchor.headingPath)) continue;
    const result = resolveTextAnchor(node.textContent || '', anchor);
    if (result.status === 'ambiguous') return result;
    if (result.status === 'resolved') matches.push({ node, start: result.start, end: result.end });
    if (matches.length > 1) return { status: 'ambiguous', matches: matches.length };
  }
  if (matches.length !== 1) return { status: 'missing' };
  const match = matches[0];
  const range = document.createRange();
  range.setStart(match.node, match.start);
  range.setEnd(match.node, match.end);
  return { status: 'resolved', range };
}
