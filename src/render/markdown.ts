import { PAGE_MARKER } from '../config.js';
import { headingLabel } from '../layout/headings.js';
import { isBullet, markdownSpans, unbold } from './inline.js';
import type { Block, ParagraphBlock, Section, TableBlock } from '../types.js';

const NEST = '    ';

const listPrefix = (p: ParagraphBlock): string => {
  if (p.marker === null) return '';
  if (isBullet(p.marker)) return '- ';
  return /^\d+\.$/.test(p.marker) ? `${p.marker} ` : `- ${p.marker} `;
};

export const paragraphMd = (p: ParagraphBlock): string => {
  const text = markdownSpans(p.spans);
  if (p.marker !== null) return `${NEST.repeat(p.listDepth - 1)}${listPrefix(p)}${text}`;
  if (p.listDepth > 0) return `${NEST.repeat(p.listDepth)}${text}`;
  return p.indented ? `> ${text}` : text;
};

type Cells = readonly (readonly ParagraphBlock[])[];
type SpanStyle = (spans: ParagraphBlock['spans']) => ParagraphBlock['spans'];

const keepStyle: SpanStyle = (spans) => spans;

/** One table cell: its paragraphs separated by <br>, list items keep their printed marker. */
const cellMd = (cell: readonly ParagraphBlock[], style: SpanStyle): string =>
  cell
    .map((p) => `${p.marker === null ? '' : `${p.marker} `}${markdownSpans(style(p.spans))}`)
    .join('<br>')
    .replace(/\|/g, '\\|');

const rowMd = (cells: Cells, width: number, style: SpanStyle): string =>
  `| ${Array.from({ length: width }, (_, i) => cellMd(cells[i] ?? [], style)).join(' | ')} |`;

/** GitHub-flavoured Markdown table; header cells are plain because the header row is bold already. */
export const tableMd = (t: TableBlock): string => {
  const width = Math.max(...t.rows.map((r) => r.length));
  const [first = [], ...rest] = t.rows;
  const head = t.header ? rowMd(first, width, unbold) : rowMd([], width, keepStyle);
  const body = t.header ? rest : t.rows;
  const rule = `| ${Array.from({ length: width }, () => '---').join(' | ')} |`;
  return [head, rule, ...body.map((r) => rowMd(r, width, keepStyle))].join('\n');
};

const isListItem = (b: Block | undefined): boolean => b?.kind === 'paragraph' && b.listDepth > 0;

const blockMd = (b: Block): string => {
  switch (b.kind) {
    case 'page': return PAGE_MARKER(b.page);
    case 'heading': return `${'#'.repeat(b.level)} ${headingLabel(b.number, b.title)}`;
    case 'paragraph': return paragraphMd(b);
    case 'table': return tableMd(b);
  }
};

/** Renders blocks; consecutive list items stay in one tight list. */
export const blocksMd = (blocks: readonly Block[]): string =>
  blocks
    .map((b, i) => {
      const prev = blocks[i - 1];
      const sep = i === 0 ? '' : isListItem(prev) && isListItem(b) ? '\n' : '\n\n';
      return sep + blockMd(b);
    })
    .join('');

export const sectionHeading = (s: Section): Block => ({
  kind: 'heading', level: s.level, number: s.number, title: s.title, page: s.pageStart,
});

/** A section with its heading, rendered as Markdown. */
export const sectionMd = (s: Section): string => blocksMd([sectionHeading(s), ...s.blocks]);
