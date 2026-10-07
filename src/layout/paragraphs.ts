import { appendLine, lineSpans } from './lines.js';
import { repairSpans } from './repairs.js';
import type { Line, ParagraphBlock, Span } from '../types.js';

const MARKER = /^(?:[●○■□◦▪•-]|\d{1,2}\.|[a-z]\.|[ivx]{1,4}\.)$/;
const MARKER_GAP = 2;
const SAME_X = 3;
const LINE_GAP_FACTOR = 1.6;
const DEPTH_STEP = 36;
/** Free room (points) beyond the next word that proves a line ended with a hard break, not a wrap. */
const BREAK_MARGIN = 10;
const SPACE_EM = 0.28;

/** Horizontal extent of the text area the lines flow in. */
export interface Box {
  readonly left: number;
  readonly right: number;
}

interface Draft {
  spans: Span[];
  marker: string | null;
  depth: number;
  textX: number;
  firstY: number;
  lastY: number;
  lastStart: number;
  lastEnd: number;
  size: number;
}

/** A list marker is a lone bullet or enumerator followed by text further right. */
const markerOf = (line: Line): string | null => {
  const [first, second] = line.runs;
  if (!first || !second || !MARKER.test(first.text.trim())) return null;
  return second.x - (first.x + first.width) >= MARKER_GAP ? first.text.trim() : null;
};

const depthOf = (markerX: number, left: number): number => 1 + Math.max(0, Math.floor((markerX - left) / DEPTH_STEP));

const lineEnd = (line: Line): number => Math.max(...line.runs.map((r) => r.x + r.width));

/** Width of the first word of a line, which may span several runs ("(" + link + "),"). */
const firstWordWidth = (line: Line): number => {
  let width = 0;
  for (const run of line.runs) {
    const text = width === 0 ? run.text.trimStart() : run.text;
    const cut = text.search(/\s/);
    const perChar = run.text.length > 0 ? run.width / run.text.length : 0;
    width += perChar * (cut === -1 ? text.length : cut);
    if (cut !== -1) return width;
  }
  return width;
};

/** The previous line had room for the first word of this one, so the author broke the line. */
const hardBreak = (draft: Draft, line: Line, box: Box): boolean => {
  const needed = firstWordWidth(line) + draft.size * SPACE_EM + BREAK_MARGIN;
  const leftAligned = draft.lastEnd + needed < box.right;
  const centered = draft.lastEnd - draft.lastStart + needed < box.right - box.left;
  return leftAligned && centered;
};

/** Next line of the same paragraph: normal leading, same left edge (plain paragraphs may be centered). */
const continues = (draft: Draft, line: Line, box: Box): boolean =>
  (draft.marker === null || Math.abs(line.x - draft.textX) < SAME_X) &&
  draft.lastY - line.y <= draft.size * LINE_GAP_FACTOR &&
  !hardBreak(draft, line, box);

const INDENT = 20;

const toBlock = (d: Draft, left: number, page: number): ParagraphBlock => ({
  kind: 'paragraph',
  spans: repairSpans(d.spans),
  page,
  listDepth: d.depth,
  marker: d.marker,
  indented: d.depth === 0 && d.textX - left > INDENT,
  x: d.textX,
  firstY: d.firstY,
  lastY: d.lastY,
});

const startDraft = (line: Line, left: number, last: Draft | undefined): Draft => {
  const marker = markerOf(line);
  const base = { firstY: line.y, lastY: line.y, lastStart: line.x, lastEnd: lineEnd(line), size: line.size };
  if (marker) {
    const [first, second] = line.runs;
    const depth = depthOf(first?.x ?? left, left);
    return { ...base, spans: lineSpans(line.runs.slice(1)), marker, depth, textX: second?.x ?? line.x };
  }
  const underItem = last !== undefined && last.depth > 0 && Math.abs(line.x - last.textX) < SAME_X;
  return { ...base, spans: lineSpans(line.runs), marker: null, depth: underItem ? last.depth : 0, textX: line.x };
};

/** Folds lines into paragraphs and list items within a text box. */
export const buildParagraphs = (lines: readonly Line[], box: Box, page: number): ParagraphBlock[] => {
  const drafts: Draft[] = [];
  for (const line of lines) {
    const current = drafts[drafts.length - 1];
    if (current && !markerOf(line) && continues(current, line, box)) {
      appendLine(current.spans, lineSpans(line.runs));
      Object.assign(current, { lastY: line.y, lastStart: line.x, lastEnd: lineEnd(line) });
    } else {
      drafts.push(startDraft(line, box.left, current));
    }
  }
  return drafts.map((d) => toBlock(d, box.left, page));
};
