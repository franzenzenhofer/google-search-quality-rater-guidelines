import type { Segment, TextRun } from '../types.js';

const TOUCH = 2;
const CLUSTER = 2.5;
const PAD = 1.5;

export interface Grid {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  /** Column boundaries, left to right. */
  readonly xs: readonly number[];
  /** Row boundaries, top to bottom (descending y). */
  readonly ys: readonly number[];
}

const isVertical = (s: Segment): boolean => Math.abs(s.x1 - s.x2) < 0.5;

const bounds = (s: Segment) => ({
  l: Math.min(s.x1, s.x2), r: Math.max(s.x1, s.x2), b: Math.min(s.y1, s.y2), t: Math.max(s.y1, s.y2),
});

const touches = (a: Segment, b: Segment): boolean => {
  const p = bounds(a);
  const q = bounds(b);
  return p.l <= q.r + TOUCH && q.l <= p.r + TOUCH && p.b <= q.t + TOUCH && q.b <= p.t + TOUCH;
};

/** Connected components of touching segments (union-find). */
const components = (segments: readonly Segment[]): Segment[][] => {
  const parent = segments.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i] ?? i)));
  segments.forEach((a, i) => segments.forEach((b, j) => {
    if (j > i && touches(a, b)) parent[find(i)] = find(j);
  }));
  const groups = new Map<number, Segment[]>();
  segments.forEach((s, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), s]));
  return [...groups.values()];
};

/** Merges nearly equal coordinates. */
export const cluster = (values: readonly number[]): number[] =>
  [...values].sort((a, b) => a - b).reduce<number[]>((acc, v) => {
    const last = acc[acc.length - 1];
    if (last === undefined || v - last > CLUSTER) acc.push(v);
    return acc;
  }, []);

const NEAR_COLUMN = 10;

/** Column borders; a short frame line next to a real border (image frames inside cells) is dropped. */
const columnXs = (verticals: readonly Segment[]): number[] => {
  const weight = (x: number): number =>
    verticals.filter((s) => Math.abs(s.x1 - x) <= CLUSTER).reduce((sum, s) => sum + bounds(s).t - bounds(s).b, 0);
  const xs = cluster(verticals.map((s) => s.x1));
  return xs.filter((x) => !xs.some((o) => o !== x && Math.abs(o - x) < NEAR_COLUMN && weight(o) > weight(x)));
};

const toGrid = (segs: readonly Segment[]): Grid | null => {
  const verticals = segs.filter(isVertical);
  const horizontals = segs.filter((s) => !isVertical(s));
  const xs = columnXs(verticals);
  const width = Math.max(...horizontals.map((s) => bounds(s).r)) - Math.min(...horizontals.map((s) => bounds(s).l));
  const fullRows = horizontals.filter((s) => bounds(s).r - bounds(s).l > width * 0.9);
  const ys = cluster(fullRows.map((s) => s.y1)).reverse();
  if (xs.length < 2 || ys.length < 2 || (xs.length === 2 && ys.length === 2)) return null;
  return { left: xs[0] ?? 0, right: xs[xs.length - 1] ?? 0, top: ys[0] ?? 0, bottom: ys[ys.length - 1] ?? 0, xs, ys };
};

const contains = (outer: Grid, inner: Grid): boolean =>
  outer !== inner && inner.left >= outer.left - PAD && inner.right <= outer.right + PAD &&
  inner.top <= outer.top + PAD && inner.bottom >= outer.bottom - PAD;

/** Detects bordered tables from stroked segments; single boxes and grids nested in cells are ignored. */
export const detectGrids = (segments: readonly Segment[]): Grid[] => {
  const grids = components(segments).map(toGrid).filter((g): g is Grid => g !== null);
  return grids.filter((g) => !grids.some((o) => contains(o, g))).sort((a, b) => b.top - a.top);
};

export const inGrid = (g: Grid, r: TextRun): boolean =>
  r.x >= g.left - PAD && r.x <= g.right && r.y <= g.top + PAD && r.y >= g.bottom - PAD;

const slot = (bounds: readonly number[], v: number, descending: boolean): number => {
  const idx = bounds.findIndex((b, i) => {
    const next = bounds[i + 1];
    if (next === undefined) return false;
    return descending ? v <= b + PAD && v > next - PAD : v >= b - PAD && v < next - PAD;
  });
  return Math.max(0, idx);
};

/** Distributes runs into cells: result[row][column] = runs. */
export const fillGrid = (g: Grid, runs: readonly TextRun[]): TextRun[][][] => {
  const cells = g.ys.slice(1).map(() => g.xs.slice(1).map((): TextRun[] => []));
  for (const r of runs) {
    const row = cells[slot(g.ys, r.y + r.size * 0.7, true)];
    row?.[slot(g.xs, r.x, false)]?.push(r);
  }
  return cells;
};
