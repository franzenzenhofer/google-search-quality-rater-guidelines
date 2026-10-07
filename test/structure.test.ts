import { describe, expect, it } from 'vitest';
import { headingLabel } from '../src/layout/headings.js';
import { tocMismatches } from '../src/toc.js';
import { FIXTURE_VERSION, PAGE_COUNT, PART_TITLES, SECTION_COUNT } from './fixtures.js';
import { currentVersion, parsedDocument } from './helpers.js';

describe('document structure parsed from the PDF', () => {
  it('finds the printed table of contents and every heading in the body, in the same order', async () => {
    const doc = await parsedDocument();
    expect(doc.toc.length).toBeGreaterThan(100);
    expect(tocMismatches(doc.toc, doc.sections)).toEqual([]);
  });

  it('reads the version date from page 1 and it matches VERSION', async () => {
    const doc = await parsedDocument();
    expect(doc.meta.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.meta.version).toBe(currentVersion());
  });

  it('keeps headings in page order with valid ranges and unique ids', async () => {
    const doc = await parsedDocument();
    doc.sections.forEach((s, i) => {
      expect(s.pageEnd).toBeGreaterThanOrEqual(s.pageStart);
      expect(s.pageStart).toBeGreaterThanOrEqual(doc.sections[i - 1]?.pageStart ?? 1);
    });
    expect(new Set(doc.sections.map((s) => s.id)).size).toBe(doc.sections.length);
  });

  it('nests numbered headings by their numbering (N.0 level 2, N.N level 3, N.N.N level 4)', async () => {
    const doc = await parsedDocument();
    for (const s of doc.sections.filter((x) => x.number && /^\d/.test(x.number))) {
      const parts = (s.number ?? '').split('.');
      const expected = parts.length === 2 && (parts[1] === '0' || parts[0] === '0') ? 2 : parts.length + 1;
      expect(s.level, headingLabel(s.number, s.title)).toBe(expected);
    }
  });
});

describe.runIf(currentVersion() === FIXTURE_VERSION)(`known structure of version ${FIXTURE_VERSION}`, () => {
  it('has the seven top-level parts as printed', async () => {
    const doc = await parsedDocument();
    const parts = doc.sections.filter((s) => s.level === 1).map((s) => headingLabel(s.number, s.title));
    expect(parts).toEqual(PART_TITLES);
  });

  it('has the expected numbers of headings and pages', async () => {
    const doc = await parsedDocument();
    expect(doc.sections.length).toBe(SECTION_COUNT);
    expect(doc.meta.pageCount).toBe(PAGE_COUNT);
  });

  it('places key sections on their printed pages', async () => {
    const doc = await parsedDocument();
    const page = (n: string): number | undefined => doc.sections.find((s) => s.number === n)?.pageStart;
    expect([page('2.3'), page('3.4'), page('4.6.4'), page('13.0'), page('31.0')]).toEqual([11, 26, 41, 113, 181]);
  });
});
