import { LAYOUT } from './config.js';
import { headingLabel, slugify } from './layout/headings.js';
import { carryTableHeaders, mergeAcrossPages } from './layout/merge.js';
import { pageBlocks } from './layout/page.js';
import { parseToc } from './toc.js';
import type { Block, DocumentMeta, GuidelineDocument, HeadingBlock, RawPage, Section } from './types.js';

const lastPage = (blocks: readonly Block[], fallback: number): number =>
  blocks.reduce((max, b) => (b.kind === 'page' ? max : Math.max(max, b.page)), fallback);

const sectionId = (h: HeadingBlock): string => slugify(headingLabel(h.number, h.title));

/** Splits the block stream at every heading; each section owns the blocks up to the next heading. */
const splitSections = (blocks: readonly Block[]): { preamble: Block[]; sections: Section[] } => {
  const preamble: Block[] = [];
  const sections: { heading: HeadingBlock; blocks: Block[] }[] = [];
  for (const b of blocks) {
    if (b.kind === 'heading') sections.push({ heading: b, blocks: [] });
    else (sections[sections.length - 1]?.blocks ?? preamble).push(b);
  }
  return {
    preamble,
    sections: sections.map(({ heading, blocks: own }) => ({
      id: sectionId(heading),
      number: heading.number,
      title: heading.title,
      level: heading.level,
      pageStart: heading.page,
      pageEnd: lastPage(own, heading.page),
      blocks: own,
    })),
  };
};

/** Extends pageEnd over all subsections, so the range covers everything under the heading. */
const withSubtreeRanges = (sections: readonly Section[]): Section[] =>
  sections.map((s, i) => {
    const nextSibling = sections.slice(i + 1).findIndex((o) => o.level <= s.level);
    const subtree = sections.slice(i, nextSibling === -1 ? sections.length : i + 1 + nextSibling);
    return { ...s, pageEnd: Math.max(...subtree.map((o) => o.pageEnd)) };
  });

/** Builds the structured document from the raw PDF pages. */
export const buildDocument = (pages: readonly RawPage[], meta: DocumentMeta): GuidelineDocument => {
  const body = pages.filter((p) => p.number > LAYOUT.tocLastPage).map(pageBlocks);
  const blocks = carryTableHeaders(mergeAcrossPages(body));
  const { preamble, sections } = splitSections(blocks);
  return { meta, toc: parseToc(pages), preamble, sections: withSubtreeRanges(sections) };
};
