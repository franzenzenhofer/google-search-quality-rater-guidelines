import { PAGE_MARKER } from '../config.js';
import { headingLabel } from '../layout/headings.js';
import { plainMarker, plainSpans } from './inline.js';
import type { Block, ParagraphBlock, TableBlock } from '../types.js';

const INDENT = '  ';

export const paragraphText = (p: ParagraphBlock): string => {
  const depth = p.marker === null ? p.listDepth : p.listDepth - 1;
  return `${INDENT.repeat(Math.max(0, depth))}${plainMarker(p)}${plainSpans(p.spans)}`;
};

const cellText = (cell: readonly ParagraphBlock[]): string =>
  cell.map((p) => `${plainMarker(p)}${plainSpans(p.spans)}`).join(' ');

/** Tables become one block per row: "Header: cell" lines when the table has a header row. */
export const tableText = (t: TableBlock): string => {
  const [first = [], ...rest] = t.rows;
  if (!t.header) return t.rows.map((r) => r.map(cellText).join(' | ')).join('\n\n');
  const labels = first.map(cellText);
  const rowText = (r: readonly (readonly ParagraphBlock[])[]): string =>
    r
      .map((cell, i) => ({ label: labels[i] ?? '', text: cellText(cell) }))
      .filter((c) => c.text !== '')
      .map((c) => (c.label ? `${c.label}: ${c.text}` : c.text))
      .join('\n');
  return [`[Table: ${labels.filter(Boolean).join(' | ')}]`, ...rest.map(rowText).filter(Boolean)].join('\n\n');
};

const blockText = (b: Block, withPages: boolean): string | null => {
  switch (b.kind) {
    case 'page': return withPages ? PAGE_MARKER(b.page) : null;
    case 'heading': return headingLabel(b.number, b.title);
    case 'paragraph': return paragraphText(b);
    case 'table': return tableText(b);
  }
};

const isListItem = (b: Block | undefined): boolean => b?.kind === 'paragraph' && b.listDepth > 0;

/** Plain text of blocks; paragraphs are single lines separated by blank lines, list items are tight. */
export const blocksText = (blocks: readonly Block[], withPages: boolean): string => {
  const kept = blocks.filter((b) => withPages || b.kind !== 'page');
  return kept
    .map((b, i) => {
      const text = blockText(b, withPages) ?? '';
      const sep = i === 0 ? '' : isListItem(kept[i - 1]) && isListItem(b) ? '\n' : '\n\n';
      return sep + text;
    })
    .join('');
};
