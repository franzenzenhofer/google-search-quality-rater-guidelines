import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PATHS, ROOT_DIR, SOURCE_URL } from '../src/config.js';
import { NON_TEXT_OR_REPLACEMENT } from '../src/pdf/non-text.js';
import { read } from './helpers.js';

const txt = read(PATHS.text);
const md = read(PATHS.markdown);
const html = read(PATHS.html);
const json = JSON.parse(read(PATHS.json)) as {
  version: string; sourceUrl: string; sha256: string; fetchedAt: string; pageCount: number;
  sections: { id: string; number: string | null; title: string; level: number; pageStart: number; pageEnd: number; file: string; text: string }[];
};
const sectionFiles = readdirSync(path.join(ROOT_DIR, PATHS.sectionsDir)).sort();
const pageMarkers = (text: string): number[] => [...text.matchAll(/<!-- page (\d+) -->/g)].map((m) => Number(m[1]));
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

describe('VERSION and PDF', () => {
  it('VERSION is date, source URL, sha256 of the committed PDF', () => {
    const [date, url, sha, extra] = read(PATHS.version).split('\n');
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(url).toBe(SOURCE_URL);
    expect(sha).toBe(createHash('sha256').update(readFileSync(path.join(ROOT_DIR, PATHS.pdf))).digest('hex'));
    expect(extra).toBe('');
    expect([json.version, json.sha256, json.sourceUrl]).toEqual([date, sha, url]);
  });
});

describe('page markers', () => {
  it('text and markdown carry every PDF page marker once, in order', () => {
    expect(pageMarkers(txt)).toEqual(range(json.pageCount));
    expect(pageMarkers(md)).toEqual(range(json.pageCount));
  });
});

describe('clean text', () => {
  it('has no running footer, control or zero-width characters, or replacement glyphs', () => {
    for (const text of [txt, md]) {
      expect(text).not.toMatch(/Copyright 20\d\d/);
      expect(text).not.toMatch(NON_TEXT_OR_REPLACEMENT);
    }
  });

  it('has no words split by line-end hyphenation', () => {
    const allowed = ['basketball- reference'];
    const splits = [...txt.matchAll(/\b\p{L}{2,}- \p{Ll}{2,}/gu)].map((m) => m[0]).filter((m) => !allowed.includes(m));
    expect(splits).toEqual([]);
  });

  it('keeps every Markdown table rectangular', () => {
    const tables = md.split(/\n\n/).filter((b) => b.startsWith('| '));
    expect(tables.length).toBeGreaterThan(50);
    for (const table of tables) {
      const widths = table.trim().split('\n').map((row) => row.replace(/\\\|/g, '').split('|').length);
      expect(new Set(widths).size, table.slice(0, 120)).toBe(1);
    }
  });
});

describe('section files', () => {
  it('are numbered in document order and each starts with front matter and its page marker', () => {
    sectionFiles.forEach((f, i) => {
      expect(f).toMatch(new RegExp(`^${String(i + 1).padStart(2, '0')}-[a-z0-9-]+\\.md$`));
      const content = read(`${PATHS.sectionsDir}/${f}`);
      const front = /^---\ntitle: .+\nnumber: .+\nlevel: \d\npages: "(\d+)-(\d+)"\nsource: (\S+)#page=(\d+)\n/.exec(content);
      expect(front, f).not.toBeNull();
      expect(front?.[3]).toBe(SOURCE_URL);
      expect(front?.[4]).toBe(front?.[1]);
      expect(content).toContain(`---\n\n<!-- page ${front?.[1]} -->\n\n#`);
    });
  });

  it('together hold every heading exactly once', () => {
    const headings = sectionFiles.flatMap((f) => read(`${PATHS.sectionsDir}/${f}`).match(/^#{1,4} .+$/gm) ?? []);
    expect(headings.length).toBe(json.sections.length);
  });
});

describe('json/qrg.json', () => {
  it('has one entry per heading with the documented fields', () => {
    expect(json.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    for (const s of json.sections) {
      expect(Object.keys(s)).toEqual(['id', 'number', 'title', 'level', 'pageStart', 'pageEnd', 'pdfUrl', 'file', 'text']);
      expect(sectionFiles).toContain(path.basename(s.file));
    }
  });
});

describe('html/index.html', () => {
  it('has an anchor per section and a table of contents', () => {
    for (const s of json.sections) expect(html).toContain(`<section id="${s.id}">`);
    expect(html).toContain('<nav class="toc"');
  });

  it('never sets text below 16px and supports light and dark', () => {
    const sizes = [...html.matchAll(/font(?:-size)?:[^;{}]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(5);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
    expect(html).toContain('prefers-color-scheme: dark');
    expect(html).toContain('[data-theme="dark"]');
  });
});

describe('llms.txt', () => {
  it('lists every section file and the main formats', () => {
    const llms = read(PATHS.llms);
    for (const f of sectionFiles) expect(llms).toContain(`markdown/sections/${f}`);
    for (const p of [PATHS.markdown, PATHS.text, PATHS.json, PATHS.pdf]) expect(llms).toContain(p);
  });
});

describe('house style', () => {
  it('uses no em or en dashes in our own files', () => {
    const own = ['README.md', 'LICENSE', PATHS.llms, ...readdirSync(path.join(ROOT_DIR, 'src'), { recursive: true }).map((f) => `src/${String(f)}`).filter((f) => f.endsWith('.ts'))];
    for (const f of own) expect(read(f), f).not.toMatch(/[–—]/);
  });
});
