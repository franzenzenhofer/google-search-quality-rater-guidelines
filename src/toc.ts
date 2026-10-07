import { LAYOUT } from './config.js';
import { parseHeading } from './layout/headings.js';
import { groupLines, lineSpans, spansText } from './layout/lines.js';
import type { Line, RawPage, TocEntry } from './types.js';

const PAGE_NUMBER_X = 500;
const LEVEL_X = [36, 54, 72, 90] as const;
const TITLE_SIZE = 24;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const levelFromX = (x: number): number => {
  const nearest = LEVEL_X.reduce((best, lx, i) => (Math.abs(lx - x) < Math.abs((LEVEL_X[best] ?? 0) - x) ? i : best), 0);
  return nearest + 1;
};

const splitLine = (line: Line): { text: string; page: number | null } => {
  const titleRuns = line.runs.filter((r) => r.x < PAGE_NUMBER_X);
  const pageRun = line.runs.find((r) => r.x >= PAGE_NUMBER_X && /^\d+$/.test(r.text.trim()));
  return { text: spansText(lineSpans(titleRuns)).replace(/\s+/g, ' ').trim(), page: pageRun ? Number(pageRun.text) : null };
};

const isTocLine = (l: Line): boolean =>
  l.size < TITLE_SIZE && !l.runs.some((r) => r.x >= PAGE_NUMBER_X && !/^\d+$/.test(r.text.trim()));

const tocLines = (pages: readonly RawPage[]): { line: Line; page: number }[] =>
  pages
    .filter((p) => p.number <= LAYOUT.tocLastPage)
    .flatMap((p) => groupLines(p.runs.filter((r) => r.y > LAYOUT.footerMaxY)).map((line) => ({ line, page: p.number })))
    .filter(({ line }) => isTocLine(line));

/** Parses the printed table of contents (pages 1-4); wrapped titles are joined. */
export const parseToc = (pages: readonly RawPage[]): TocEntry[] => {
  const entries: TocEntry[] = [];
  let pending: { text: string; x: number; printedOn: number } | null = null;
  for (const { line, page: printedOn } of tocLines(pages)) {
    const { text, page } = splitLine(line);
    const start: { text: string; x: number; printedOn: number } = pending ?? { text: '', x: line.x, printedOn };
    const joined = `${start.text} ${text}`.trim();
    if (page === null) {
      pending = { ...start, text: joined };
      continue;
    }
    entries.push({ ...parseHeading(joined), page, level: levelFromX(start.x), printedOn: start.printedOn });
    pending = null;
  }
  return entries;
};

/** Reads the version date printed at the top of page 1 ("September 11, 2025") as YYYY-MM-DD. */
export const parseVersionDate = (pages: readonly RawPage[]): string => {
  const text = (pages[0]?.runs ?? []).map((r) => r.text).join(' ');
  const match = new RegExp(`(${MONTHS.join('|')}) (\\d{1,2}), (\\d{4})`).exec(text);
  if (!match) throw new Error('Version date not found on page 1 of the PDF');
  const month = String(MONTHS.indexOf(match[1] ?? '') + 1).padStart(2, '0');
  return `${match[3]}-${month}-${(match[2] ?? '').padStart(2, '0')}`;
};

interface Heading {
  readonly number: string | null;
  readonly title: string;
  readonly level: number;
  readonly pageStart: number;
}

const describe = (h: { number: string | null; title: string; level: number }, page: number): string =>
  `L${h.level} ${h.number ?? '-'} "${h.title}" p.${page}`;

/** Differences between the printed table of contents and the headings found in the body. */
export const tocMismatches = (toc: readonly TocEntry[], headings: readonly Heading[]): string[] => {
  const rows = Math.max(toc.length, headings.length);
  return Array.from({ length: rows }, (_, i) => {
    const t = toc[i];
    const h = headings[i];
    const a = t ? describe(t, t.page) : 'missing';
    const b = h ? describe(h, h.pageStart) : 'missing';
    return a === b ? null : `#${i + 1}: TOC ${a} / body ${b}`;
  }).filter((d): d is string => d !== null);
};
