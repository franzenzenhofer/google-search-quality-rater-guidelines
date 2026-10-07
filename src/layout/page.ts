import { LAYOUT } from '../config.js';
import { headingLevel, lineText, parseHeading } from './headings.js';
import { splitRegions } from './columns.js';
import { groupLines } from './lines.js';
import { buildParagraphs } from './paragraphs.js';
import { detectGrids, fillGrid, inGrid, type Grid } from './tables.js';
import type { Block, HeadingBlock, Line, RawPage, Rect, TableBlock, TextRun } from '../types.js';

const BODY = { left: 36, right: 576 } as const;
const CELL_PADDING = 4;
const HEADING_WRAP_FACTOR = 1.6;

const cellBox = (grid: Grid, col: number) => ({
  left: grid.xs[col] ?? grid.left,
  right: (grid.xs[col + 1] ?? grid.right) - CELL_PADDING,
});

const columnBox = (c: { left: number; lines: readonly Line[] }) => ({
  left: c.left,
  right: Math.max(...c.lines.map((l) => Math.max(...l.runs.map((r) => r.x + r.width)))),
});

const SHADED_SHARE = 0.9;

/** Share of the table width that grey header shading covers in the first row. */
const shadedShare = (grid: Grid, shades: readonly Rect[]): number => {
  const middle = ((grid.ys[0] ?? 0) + (grid.ys[1] ?? 0)) / 2;
  const covered = shades
    .filter((s) => s.bottom <= middle && s.top >= middle)
    .reduce((sum, s) => sum + Math.max(0, Math.min(s.right, grid.right) - Math.max(s.left, grid.left)), 0);
  return covered / (grid.right - grid.left);
};

/** Columns that only hold images are dropped. The first row is a header when the whole row is shaded grey or every cell is set in bold. */
const hasHeader = (grid: Grid, first: readonly (readonly TextRun[])[], shades: readonly Rect[]): boolean => {
  if (!first.some((c) => c.length > 0)) return false;
  const bold = first.every((c) => c.length > 0 && c.every((r) => r.bold));
  return bold || shadedShare(grid, shades) >= SHADED_SHARE;
};

const toTable = (grid: Grid, runs: readonly TextRun[], page: RawPage): TableBlock => {
  const cells = fillGrid(grid, runs).filter((row) => row.some((c) => c.length > 0));
  const used = (col: number): boolean => cells.some((row) => (row[col]?.length ?? 0) > 0);
  const rows = cells.map((row) =>
    row.flatMap((cell, col) => (used(col) ? [buildParagraphs(groupLines(cell), cellBox(grid, col), page.number)] : [])),
  );
  const header = hasHeader(grid, cells[0] ?? [], page.shades);
  return { kind: 'table', rows, header, page: page.number, columns: grid.xs, top: grid.top };
};

const headingBlock = (line: Line, level: number, page: number): HeadingBlock => ({
  kind: 'heading',
  level,
  ...parseHeading(lineText(line)),
  page,
});

/** Turns body lines into blocks; side-by-side text columns are emitted one column after the other. */
const bodyBlocks = (lines: readonly Line[], page: number): Block[] =>
  splitRegions(lines).flatMap((region) =>
    region.kind === 'flow'
      ? flowBlocks(region.lines, page)
      : region.columns.flatMap((c) => buildParagraphs(c.lines, columnBox(c), page)),
  );

/** Turns a run of flowing body lines into headings, paragraphs and lists. */
const flowBlocks = (lines: readonly Line[], page: number): Block[] => {
  const out: Block[] = [];
  let pending: Line[] = [];
  let lastHeading: { line: Line; index: number } | null = null;
  const flush = (): void => {
    out.push(...buildParagraphs(pending, BODY, page));
    pending = [];
  };
  for (const line of lines) {
    const level = headingLevel(line);
    const wraps = lastHeading && pending.length === 0 && line.runs.every((r) => r.bold) &&
      line.size === lastHeading.line.size && lastHeading.line.y - line.y <= line.size * HEADING_WRAP_FACTOR;
    if (lastHeading && wraps) {
      const prev = out[lastHeading.index] as HeadingBlock;
      out[lastHeading.index] = { ...prev, title: `${prev.title} ${lineText(line)}` };
      lastHeading = { line, index: lastHeading.index };
    } else if (level !== null) {
      flush();
      out.push(headingBlock(line, level, page));
      lastHeading = { line, index: out.length - 1 };
    } else {
      pending.push(line);
      lastHeading = null;
    }
  }
  flush();
  return out;
};

const isContent = (r: TextRun): boolean => r.y > LAYOUT.footerMaxY;

/** Lays out one body page: tables from border lines, everything else as flowing text. */
export const pageBlocks = (page: RawPage): Block[] => {
  const runs = page.runs.filter(isContent);
  const grids = detectGrids(page.segments).filter((g) => runs.some((r) => inGrid(g, r)));
  const body = runs.filter((r) => !grids.some((g) => inGrid(g, r)));
  const lines = groupLines(body);
  const out: Block[] = [{ kind: 'page', page: page.number }];
  let cursor = 0;
  for (const grid of grids) {
    const above = lines.slice(cursor).filter((l) => l.y > grid.top);
    out.push(...bodyBlocks(above, page.number));
    cursor += above.length;
    const inside = runs.filter((r) => inGrid(grid, r));
    if (inside.length > 0) out.push(toTable(grid, inside, page));
  }
  out.push(...bodyBlocks(lines.slice(cursor), page.number));
  return out;
};
