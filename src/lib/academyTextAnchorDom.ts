import type { AcademyPrivateNoteTextAnchor } from '../types/academy';
import { createTextAnchor, resolveTextAnchor } from './academyTextAnchors';

export function headingPathForTextNode(root: HTMLElement, node: Text): string[] {
  const stack: Array<{ level: number; title: string }> = [];
  for (const heading of Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6'))) {
    const precedesNode = heading.contains(node) ||
      (heading.compareDocumentPosition(node.parentElement!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    if (!precedesNode) continue;
    const level = Number(heading.tagName.slice(1));
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    const title = heading.textContent?.trim() || '';
    if (title) stack.push({ level, title });
  }
  return stack.slice(-6).map(item => item.title);
}

export function captureTextAnchorFromSelection(
  root: HTMLElement,
  kind: 'markdown' | 'code'
): AcademyPrivateNoteTextAnchor | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (range.startContainer !== range.endContainer ||
      range.startContainer.nodeType !== Node.TEXT_NODE ||
      !root.contains(range.startContainer)) return null;

  const node = range.startContainer as Text;
  const sourceText = node.textContent || '';
  const headingPath = kind === 'markdown' ? headingPathForTextNode(root, node) : [];
  return createTextAnchor({
    kind,
    text: range.toString(),
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    headingPath
  }, sourceText);
}

export function jumpToTextAnchor(
  root: HTMLElement | null,
  anchor: AcademyPrivateNoteTextAnchor
): 'resolved' | 'missing' | 'ambiguous' {
  if (!root) return 'missing';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const matches: Array<{ node: Text; start: number; end: number }> = [];
  let current: Node | null;

  while ((current = walker.nextNode())) {
    const node = current as Text;
    if (anchor.kind === 'markdown' && anchor.headingPath?.length &&
        JSON.stringify(headingPathForTextNode(root, node)) !== JSON.stringify(anchor.headingPath)) continue;
    const result = resolveTextAnchor(node.textContent || '', anchor);
    if (result.status === 'ambiguous') return 'ambiguous';
    if (result.status === 'resolved') matches.push({ node, start: result.start, end: result.end });
    if (matches.length > 1) return 'ambiguous';
  }

  if (matches.length !== 1) return 'missing';
  const match = matches[0];
  const range = document.createRange();
  range.setStart(match.node, match.start);
  range.setEnd(match.node, match.end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  match.node.parentElement?.scrollIntoView({ behavior, block: 'center' });
  return 'resolved';
}
