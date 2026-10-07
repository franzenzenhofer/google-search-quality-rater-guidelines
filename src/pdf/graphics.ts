import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Rect, Segment } from '../types.js';

type Matrix = readonly [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const MOVE_TO = 0;
const LINE_TO = 1;
const CURVE_TO = 2;
const QUAD_TO = 3;
const MIN_LENGTH = 2;
const AXIS_TOLERANCE = 0.5;

export interface OperatorList {
  readonly fnArray: readonly number[];
  readonly argsArray: readonly unknown[];
}

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

const isAxisAligned = (s: Segment): boolean => {
  const dx = Math.abs(s.x2 - s.x1);
  const dy = Math.abs(s.y2 - s.y1);
  return (dy < AXIS_TOLERANCE && dx > MIN_LENGTH) || (dx < AXIS_TOLERANCE && dy > MIN_LENGTH);
};

/** Turns one pdf.js path (DrawOPS-encoded) into straight segments. */
const pathSegments = (path: ArrayLike<number>, ctm: Matrix): Segment[] => {
  const out: Segment[] = [];
  let i = 0;
  let cur: [number, number] = [0, 0];
  while (i < path.length) {
    const op = path[i] ?? -1;
    if (op === MOVE_TO || op === LINE_TO) {
      const next = apply(ctm, path[i + 1] ?? 0, path[i + 2] ?? 0);
      if (op === LINE_TO) out.push({ x1: cur[0], y1: cur[1], x2: next[0], y2: next[1] });
      cur = next;
      i += 3;
    } else {
      i += op === CURVE_TO ? 7 : op === QUAD_TO ? 5 : 1;
    }
  }
  return out.filter(isAxisAligned);
};

const STROKES = new Set<number>([OPS.stroke, OPS.closeStroke]);
const FILLS = new Set<number>([OPS.fill, OPS.eoFill]);
/** Coloured cell backgrounds (header shading); white page backgrounds and black boxes are not shades. */
const SHADE = /^#(?!ffffff$|000000$)[0-9a-f]{6}$/i;

interface State {
  readonly ctm: Matrix;
  readonly fill: string;
}

const pathOf = (args: unknown): { paint: number; paths: ArrayLike<number>[] } => {
  const [paint, paths] = args as [number, ArrayLike<number>[]];
  return { paint, paths };
};

const shadeRect = (paths: ArrayLike<number>[], ctm: Matrix): Rect | null => {
  const points = paths.flatMap((p) => pathSegments(p, ctm).flatMap((s) => [[s.x1, s.y1], [s.x2, s.y2]]));
  if (points.length === 0) return null;
  const xs = points.map((p) => p[0] ?? 0);
  const ys = points.map((p) => p[1] ?? 0);
  return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) };
};

export interface Graphics {
  readonly segments: Segment[];
  readonly shades: Rect[];
}

const paint = (args: unknown, state: State, out: Graphics): void => {
  const { paint: op, paths } = pathOf(args);
  if (STROKES.has(op)) out.segments.push(...paths.flatMap((p) => pathSegments(p, state.ctm)));
  const rect = FILLS.has(op) && SHADE.test(state.fill) ? shadeRect(paths, state.ctm) : null;
  if (rect) out.shades.push(rect);
};

/** Collects stroked axis-aligned segments (table borders) and coloured filled rectangles (cell shading). */
export const collectGraphics = (ops: OperatorList): Graphics => {
  const stack: State[] = [];
  let state: State = { ctm: IDENTITY, fill: '#000000' };
  const out: Graphics = { segments: [], shades: [] };
  ops.fnArray.forEach((fn, i) => {
    const args = ops.argsArray[i];
    if (fn === OPS.save) stack.push(state);
    else if (fn === OPS.restore) state = stack.pop() ?? state;
    else if (fn === OPS.transform) state = { ...state, ctm: multiply(state.ctm, args as unknown as Matrix) };
    else if (fn === OPS.setFillRGBColor) state = { ...state, fill: String((args as unknown[])[0]) };
    else if (fn === OPS.constructPath) paint(args, state, out);
  });
  return out;
};
