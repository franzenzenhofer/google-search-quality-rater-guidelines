import { PATHS, pdfPageUrl } from '../config.js';
import { headingLabel, slugify } from '../layout/headings.js';
import { blocksMd, sectionHeading } from './markdown.js';
import type { Block, GuidelineDocument, Section } from '../types.js';

/** Sections at this level or above start a new file: parts, front matter, appendices and chapters (N.0). */
const FILE_LEVEL = 2;

export interface SectionFile {
  readonly path: string;
  readonly head: Section;
  readonly sections: readonly Section[];
  /** "start-end" PDF pages of the content in this file. */
  readonly pages: string;
  readonly content: string;
}

const groupUnits = (sections: readonly Section[]): Section[][] =>
  sections.reduce<Section[][]>((units, s) => {
    const current = units[units.length - 1];
    if (!current || s.level <= FILE_LEVEL) units.push([s]);
    else current.push(s);
    return units;
  }, []);

const yamlString = (v: string): string => JSON.stringify(v);

/** Last PDF page with content in this file (a part file holds only the part title). */
const contentEnd = (unit: readonly Section[]): number =>
  Math.max(...unit.flatMap((s) => [s.pageStart, ...s.blocks.filter((b) => b.kind !== 'page').map((b) => b.page)]));

const frontMatter = (head: Section, pages: string, version: string): string =>
  [
    '---',
    `title: ${yamlString(head.title)}`,
    `number: ${head.number === null ? 'null' : yamlString(head.number)}`,
    `level: ${head.level}`,
    `pages: "${pages}"`,
    `source: ${pdfPageUrl(head.pageStart)}`,
    `version: ${version}`,
    'copyright: "Google LLC. Unofficial mirror; cite the official PDF."',
    '---',
  ].join('\n');

const unitBlocks = (unit: readonly Section[]): Block[] => {
  const blocks = unit.flatMap((s) => [sectionHeading(s), ...s.blocks]);
  const trailingMarker = blocks[blocks.length - 1]?.kind === 'page' ? blocks.slice(0, -1) : blocks;
  return [{ kind: 'page', page: unit[0]?.pageStart ?? 0 }, ...trailingMarker];
};

/** One Markdown file per part / front-matter unit / chapter, numbered in document order. */
export const sectionFiles = (doc: GuidelineDocument): SectionFile[] =>
  groupUnits(doc.sections).map((unit, i) => {
    const head = unit[0] as Section;
    const name = `${String(i + 1).padStart(2, '0')}-${slugify(headingLabel(head.number, head.title))}.md`;
    const pages = `${head.pageStart}-${contentEnd(unit)}`;
    const content = `${frontMatter(head, pages, doc.meta.version)}\n\n${blocksMd(unitBlocks(unit))}\n`;
    return { path: `${PATHS.sectionsDir}/${name}`, head, sections: unit, pages, content };
  });
