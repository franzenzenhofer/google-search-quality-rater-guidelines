import { LAYOUT } from '../config.js';
import { lineSpans, spansText } from './lines.js';
import type { Line } from '../types.js';

const SUBSECTION = /^\d+\.\d+\.\d+\s/;
const PART = /^((?:Part|Appendix) \d+):\s*(.*)$/;
const NUMBERED = /^(\d+(?:\.\d+)+)\s+(.*)$/;

export const lineText = (line: Line): string => spansText(lineSpans(line.runs)).replace(/\s+/g, ' ').trim();

/** Heading level from typography: 18pt part, 12pt chapter, 11pt section, bold 10pt "N.N.N" subsection. */
export const headingLevel = (line: Line): number | null => {
  if (!line.runs.every((r) => r.bold)) return null;
  if (line.size >= LAYOUT.partSize) return 1;
  if (line.size >= LAYOUT.chapterSize) return 2;
  if (line.size >= LAYOUT.sectionSize) return 3;
  return SUBSECTION.test(lineText(line)) ? 4 : null;
};

/** Splits "2.4.1 Identifying..." / "Part 1: Page..." into number and title. */
export const parseHeading = (text: string): { number: string | null; title: string } => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const part = PART.exec(clean) ?? NUMBERED.exec(clean);
  return part ? { number: part[1] ?? null, title: part[2] ?? '' } : { number: null, title: clean };
};

/** Display form of a heading as printed in the document. */
export const headingLabel = (number: string | null, title: string): string => {
  if (!number) return title;
  return /^(Part|Appendix)/.test(number) ? `${number}: ${title}` : `${number} ${title}`;
};

const SLUG_MAX = 60;

/** Lowercase ASCII slug, cut at a word boundary to at most SLUG_MAX characters. */
export const slugify = (text: string): string => {
  const full = text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (full.length <= SLUG_MAX) return full;
  const cut = full.slice(0, SLUG_MAX + 1);
  return cut.slice(0, cut.lastIndexOf('-'));
};
