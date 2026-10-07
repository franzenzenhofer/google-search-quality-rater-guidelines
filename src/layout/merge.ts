import { appendLine, spansText } from './lines.js';
import type { Block, ParagraphBlock, TableBlock } from '../types.js';

const PAGE_BOTTOM_ZONE = 110;
const PAGE_TOP_ZONE = 720;
const SAME_X = 3;
const SENTENCE_END = /[.!?:;]["”’)\]]*$/;

const lastContent = (blocks: readonly Block[]): Block | undefined =>
  [...blocks].reverse().find((b) => b.kind !== 'page');

/** A paragraph cut by the page break: ends low on its page, resumes at the top of the next at the same x. */
const continuesAcrossPages = (prev: ParagraphBlock, next: ParagraphBlock): boolean => {
  if (next.marker !== null || prev.lastY > PAGE_BOTTOM_ZONE || next.firstY < PAGE_TOP_ZONE) return false;
  if (Math.abs(prev.x - next.x) >= SAME_X) return false;
  const text = spansText(next.spans).trimStart();
  return !SENTENCE_END.test(spansText(prev.spans).trimEnd()) || /^[\p{Ll}]/u.test(text);
};

const joinParagraphs = (prev: ParagraphBlock, next: ParagraphBlock): ParagraphBlock => {
  const spans = [...prev.spans];
  appendLine(spans, next.spans);
  return { ...prev, spans, lastY: next.lastY };
};

/**
 * Joins paragraphs split by a page break (the joined text stays on its first page, so a
 * sentence is never cut in two), and repeats a table header on continuation pages.
 */
export const mergeAcrossPages = (pages: readonly Block[][]): Block[] => {
  const out: Block[] = [];
  for (const page of pages) {
    const [marker, first, ...rest] = page;
    const prev = lastContent(out);
    if (prev?.kind === 'paragraph' && first?.kind === 'paragraph' && continuesAcrossPages(prev, first)) {
      out[out.lastIndexOf(prev)] = joinParagraphs(prev, first);
      out.push(...(marker ? [marker] : []), ...rest);
    } else {
      out.push(...page);
    }
  }
  return out;
};

const sameColumns = (a: TableBlock, b: TableBlock): boolean =>
  a.columns.length === b.columns.length && a.columns.every((x, i) => Math.abs(x - (b.columns[i] ?? 0)) < SAME_X);

/** The table starts at the top of the page right after the page that held `source`. */
const continues = (source: TableBlock, b: TableBlock): boolean =>
  !b.header && source.header && b.page === source.page + 1 && b.top > PAGE_TOP_ZONE && sameColumns(source, b);

/** Gives a continuation table without its own header the header of the table it continues. */
export const carryTableHeaders = (blocks: readonly Block[]): Block[] => {
  let lastTable: TableBlock | null = null;
  return blocks.map((b) => {
    if (b.kind === 'heading') lastTable = null;
    if (b.kind !== 'table') return b;
    const source: TableBlock | null = lastTable;
    const carried = source !== null && continues(source, b)
      ? { ...b, header: true, rows: [source.rows[0] ?? [], ...b.rows] }
      : b;
    lastTable = carried;
    return carried;
  });
};
