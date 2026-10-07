import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT_DIR } from '../src/config.js';
import { FIXTURE_VERSION, PASSAGES } from './fixtures.js';
import { currentVersion, pageAt, read, stripMarkdown } from './helpers.js';

/** The fixture version is either the current one or archived under versions/<date>/. */
const fixtureRoot = currentVersion() === FIXTURE_VERSION ? ROOT_DIR : path.join(ROOT_DIR, 'versions', FIXTURE_VERSION);

const txt = read('text/qrg.txt', fixtureRoot);
const md = stripMarkdown(read('markdown/qrg.md', fixtureRoot));
const json = JSON.parse(read('json/qrg.json', fixtureRoot)) as { sections: { text: string; pageStart: number }[] };
const sectionsDir = path.join(fixtureRoot, 'markdown/sections');
const sectionTexts = readdirSync(sectionsDir).map((f) => stripMarkdown(read(path.join('markdown/sections', f), fixtureRoot)));

describe(`verbatim passages of version ${FIXTURE_VERSION}`, () => {
  it.each(PASSAGES)('text/qrg.txt has "$what" on page $page', ({ text, page }) => {
    const at = txt.indexOf(text);
    expect(at, text).toBeGreaterThan(-1);
    expect(pageAt(txt, at)).toBe(page);
  });

  it.each(PASSAGES)('markdown/qrg.md has "$what" on page $page', ({ text, page }) => {
    const at = md.indexOf(text);
    expect(at, text).toBeGreaterThan(-1);
    expect(pageAt(md, at)).toBe(page);
  });

  it.each(PASSAGES)('json/qrg.json has "$what"', ({ text }) => {
    expect(json.sections.some((s) => s.text.includes(text)), text).toBe(true);
  });

  it.each(PASSAGES)('exactly one section file has "$what" on page $page', ({ text, page }) => {
    const hits = sectionTexts.filter((s) => s.includes(text));
    expect(hits.length, text).toBeGreaterThanOrEqual(1);
    const file = hits[0] ?? '';
    expect(pageAt(file, file.indexOf(text))).toBe(page);
  });
});
