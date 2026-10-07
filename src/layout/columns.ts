import { groupLines } from './lines.js';
import type { Line, TextRun } from '../types.js';

/** Body text normally starts at the margin or a list indent; text further right sits beside a figure. */
const FLOW_MAX_X = 140;
/** A horizontal gap this wide inside a line separates two side-by-side text columns. */
const COLUMN_GAP = 24;
/** Fragment starts closer than this belong to the same column. */
const COLUMN_SPREAD = 80;

export type Region =
  | { readonly kind: 'flow'; readonly lines: readonly Line[] }
  | { readonly kind: 'columns'; readonly columns: readonly { readonly left: number; readonly lines: readonly Line[] }[] };

const gapAfter = (runs: readonly TextRun[], i: number): number => {
  const a = runs[i];
  const b = runs[i + 1];
  return a && b ? b.x - (a.x + a.width) : 0;
};

const isColumnar = (line: Line): boolean =>
  line.x > FLOW_MAX_X || line.runs.some((_, i) => gapAfter(line.runs, i) > COLUMN_GAP);

/** Splits a line at wide gaps into fragments. */
const fragments = (line: Line): TextRun[][] =>
  line.runs.reduce<TextRun[][]>((out, run, i) => {
    if (i === 0 || gapAfter(line.runs, i - 1) > COLUMN_GAP) out.push([run]);
    else out[out.length - 1]?.push(run);
    return out;
  }, []);

const columnsOf = (lines: readonly Line[]): { left: number; lines: Line[] }[] => {
  const frags = lines.flatMap(fragments);
  const lefts = frags
    .map((f) => f[0]?.x ?? 0)
    .sort((a, b) => a - b)
    .reduce<number[]>((acc, x) => ((acc[acc.length - 1] ?? -Infinity) + COLUMN_SPREAD < x ? [...acc, x] : acc), []);
  const owner = (x: number): number => lefts.reduce((best, l, i) => (x >= l - 1 ? i : best), 0);
  return lefts.map((left, i) => ({
    left,
    lines: groupLines(frags.filter((f) => owner(f[0]?.x ?? 0) === i).flat()),
  }));
};

/** Separates normal flowing text from blocks of side-by-side text (captions beside screenshots). */
export const splitRegions = (lines: readonly Line[]): Region[] => {
  const regions: { columnar: boolean; lines: Line[] }[] = [];
  for (const line of lines) {
    const columnar = isColumnar(line);
    const last = regions[regions.length - 1];
    if (last && last.columnar === columnar) last.lines.push(line);
    else regions.push({ columnar, lines: [line] });
  }
  return regions.map((r) => (r.columnar ? { kind: 'columns', columns: columnsOf(r.lines) } : { kind: 'flow', lines: r.lines }));
};
