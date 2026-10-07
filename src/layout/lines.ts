import { LAYOUT } from '../config.js';
import type { Line, Span, TextRun } from '../types.js';

const byReadingOrder = (a: TextRun, b: TextRun): number => b.y - a.y || a.x - b.x;

const SUPERSCRIPT_RATIO = 0.75;
const SUPERSCRIPT_RISE = 5;

/** Superscripts ("41st") sit a few points above the baseline in a smaller font. */
const isSuperscriptOf = (run: TextRun, base: TextRun): boolean =>
  run.size <= base.size * SUPERSCRIPT_RATIO && run.y > base.y && run.y - base.y <= SUPERSCRIPT_RISE;

const baselineRun = (runs: readonly TextRun[]): TextRun | undefined =>
  runs.reduce<TextRun | undefined>((best, r) => (!best || r.size > best.size ? r : best), undefined);

/** Groups runs into lines (shared baseline), each sorted left to right, top to bottom. */
export const groupLines = (runs: readonly TextRun[]): Line[] => {
  const lines: TextRun[][] = [];
  for (const run of [...runs].sort(byReadingOrder)) {
    const current = lines[lines.length - 1];
    const anchor = current?.[0];
    if (current && anchor && Math.abs(anchor.y - run.y) <= LAYOUT.baselineTolerance) current.push(run);
    else lines.push([run]);
  }
  return mergeSuperscripts(lines).map(toLine);
};

/** Folds a line made only of superscript runs into the line directly below it. */
const mergeSuperscripts = (lines: readonly TextRun[][]): TextRun[][] => {
  const out: TextRun[][] = [];
  let carried: TextRun[] = [];
  lines.forEach((line, i) => {
    const merged = [...carried, ...line];
    const below = baselineRun(lines[i + 1] ?? []);
    carried = below && merged.every((r) => isSuperscriptOf(r, below)) ? merged : [];
    if (carried.length === 0) out.push(merged);
  });
  return out;
};

const toLine = (rs: TextRun[]): Line => {
  const ordered = rs.sort((a, b) => a.x - b.x);
  const first = ordered[0] as TextRun;
  const base = baselineRun(ordered) ?? first;
  return { runs: ordered, x: first.x, y: base.y, size: base.size };
};

const sameStyle = (a: Span, b: Span): boolean =>
  a.bold === b.bold && a.italic === b.italic && a.href === b.href;

/** Appends a span, merging it into the previous one when the style is identical. */
export const pushSpan = (spans: Span[], span: Span): void => {
  const last = spans[spans.length - 1];
  if (last && sameStyle(last, span)) spans[spans.length - 1] = { ...last, text: last.text + span.text };
  else spans.push(span);
};

const needsSpace = (prev: TextRun, next: TextRun): boolean => {
  if (/\s$/.test(prev.text) || /^\s/.test(next.text)) return false;
  return next.x - (prev.x + prev.width) > LAYOUT.joinGap;
};

/** Converts the runs of one line into styled spans with correct inter-run spacing. */
export const lineSpans = (runs: readonly TextRun[]): Span[] => {
  const spans: Span[] = [];
  runs.forEach((run, i) => {
    const prev = runs[i - 1];
    const style = { bold: run.bold, italic: run.italic, href: run.href };
    if (prev && needsSpace(prev, run)) pushSpan(spans, { text: ' ', ...style, href: prev.href === run.href ? run.href : null });
    pushSpan(spans, { text: run.text, ...style });
  });
  return spans;
};

export const spansText = (spans: readonly Span[]): string => spans.map((s) => s.text).join('');

/** True when a wrapped line ending in this text continues the word without a space. */
const gluesToNextLine = (text: string): boolean => /[\p{L}\p{N}][-\u2010\u2014/]$/u.test(text);

/** Joins the spans of a following line onto a paragraph, inserting a space where the line wrapped. */
export const appendLine = (spans: Span[], next: readonly Span[]): void => {
  const glue = gluesToNextLine(spansText(spans).trimEnd());
  const last = spans[spans.length - 1];
  if (last) spans[spans.length - 1] = { ...last, text: last.text.trimEnd() };
  const first = next[0];
  if (!glue && first && spans.length > 0) pushSpan(spans, { ...first, text: ' ', href: last?.href === first.href ? first.href : null });
  next.forEach((s, i) => pushSpan(spans, i === 0 ? { ...s, text: s.text.trimStart() } : s));
};
