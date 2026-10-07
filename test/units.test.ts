import { describe, expect, it } from 'vitest';
import { headingLabel, parseHeading, slugify } from '../src/layout/headings.js';
import { appendLine } from '../src/layout/lines.js';
import { repairText } from '../src/layout/repairs.js';
import { cluster } from '../src/layout/tables.js';
import { tocMismatches } from '../src/toc.js';
import type { Span } from '../src/types.js';

const span = (text: string): Span => ({ text, bold: false, italic: false, href: null });
const join = (a: string, b: string): string => {
  const spans = [span(a)];
  appendLine(spans, [span(b)]);
  return spans.map((s) => s.text).join('');
};

describe('headings', () => {
  it('splits numbers, parts and appendices from titles', () => {
    expect(parseHeading('2.4.1 Identifying the Main Content (MC)')).toEqual({ number: '2.4.1', title: 'Identifying the Main Content (MC)' });
    expect(parseHeading('Part 1: Page Quality Rating Guideline')).toEqual({ number: 'Part 1', title: 'Page Quality Rating Guideline' });
    expect(parseHeading('General Guidelines Overview')).toEqual({ number: null, title: 'General Guidelines Overview' });
    expect(headingLabel('Appendix 2', 'Guideline Change Log')).toBe('Appendix 2: Guideline Change Log');
  });

  it('slugs are ASCII and cut at word boundaries', () => {
    expect(slugify('3.4 Experience, Expertise, Authoritativeness, and Trust (E-E-A-T)')).toBe('3-4-experience-expertise-authoritativeness-and-trust-e-e-a-t');
    expect(slugify('24.0 Rating Dictionary and Encyclopedia Results for Different Queries')).toBe('24-0-rating-dictionary-and-encyclopedia-results-for');
  });
});

describe('line joining', () => {
  it('adds a space at a normal wrap and none after a wrapped hyphen', () => {
    expect(join('the welfare or', 'well-being')).toBe('the welfare or well-being');
    expect(join('E-E-A-', 'T is important')).toBe('E-E-A-T is important');
    expect(join('September 2023 -', 'September 2025')).toBe('September 2023 - September 2025');
  });
});

describe('helpers', () => {
  it('clusters nearly equal coordinates', () => {
    expect(cluster([36, 36.4, 180, 181.2, 576])).toEqual([36, 180, 576]);
  });

  it('repairs glyphs the PDF text layer drops, and nothing else', () => {
    expect(repairText('Query: [राजा रव वमा]')).toBe('Query: [राजा रवि वर्मा]');
    expect(repairText('plain text')).toBe('plain text');
  });

  it('reports table of contents mismatches', () => {
    const toc = [{ number: '1.0', title: 'A', page: 9, level: 2, printedOn: 1 }];
    expect(tocMismatches(toc, [{ number: '1.0', title: 'A', level: 2, pageStart: 9 }])).toEqual([]);
    expect(tocMismatches(toc, [{ number: '1.0', title: 'B', level: 2, pageStart: 9 }])).toHaveLength(1);
    expect(tocMismatches(toc, [])).toHaveLength(1);
  });
});
