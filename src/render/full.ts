import { PAGE_MARKER, pdfPageUrl } from '../config.js';
import { headingLabel } from '../layout/headings.js';
import { blocksMd, sectionHeading } from './markdown.js';
import { blocksText } from './text.js';
import type { Block, GuidelineDocument, TocEntry } from '../types.js';

export const DOC_TITLE = 'Search Quality Evaluator Guidelines (General Guidelines)';

export const NOTICE =
  'Unofficial mirror of a document published by Google. Copyright Google LLC. ' +
  'Converted from the official PDF for reading, searching and citing; always cite the official PDF.';

/** The document's own blocks in reading order: preamble, then every section with its heading. */
export const allBlocks = (doc: GuidelineDocument): Block[] => [
  ...doc.preamble,
  ...doc.sections.flatMap((s) => [sectionHeading(s), ...s.blocks]),
];

const tocLines = (toc: readonly TocEntry[], line: (e: TocEntry) => string): string[] =>
  toc.flatMap((e, i) => {
    const marker = toc[i - 1]?.printedOn === e.printedOn ? [] : ['', PAGE_MARKER(e.printedOn), ''];
    return [...marker, line(e)];
  });

const frontMatter = (doc: GuidelineDocument): string =>
  [
    '---',
    `title: "${DOC_TITLE}"`,
    `version: ${doc.meta.version}`,
    `source: ${doc.meta.sourceUrl}`,
    `sha256: ${doc.meta.sha256}`,
    `pages: ${doc.meta.pageCount}`,
    'copyright: "Google LLC. Unofficial mirror, not affiliated with or endorsed by Google."',
    '---',
  ].join('\n');

const mdTocLine = (e: TocEntry): string =>
  `${'  '.repeat(e.level - 1)}- ${headingLabel(e.number, e.title)} ([p. ${e.page}](${pdfPageUrl(e.page)}))`;

export const renderMarkdown = (doc: GuidelineDocument): string =>
  [
    frontMatter(doc),
    `> ${NOTICE} Official source: ${doc.meta.sourceUrl} (version ${doc.meta.version}).`,
    `**Table of contents** (as printed on pages 1-4 of the PDF)`,
    tocLines(doc.toc, mdTocLine).join('\n').trim(),
    blocksMd(allBlocks(doc)),
  ].join('\n\n') + '\n';

const txtTocLine = (e: TocEntry): string =>
  `${'  '.repeat(e.level - 1)}${headingLabel(e.number, e.title)} .... ${e.page}`;

export const renderText = (doc: GuidelineDocument): string =>
  [
    `${DOC_TITLE}, version ${doc.meta.version}`,
    `${NOTICE}`,
    `Source: ${doc.meta.sourceUrl}`,
    `SHA-256: ${doc.meta.sha256}`,
    'Table of contents',
    tocLines(doc.toc, txtTocLine).join('\n').trim(),
    blocksText(allBlocks(doc), true),
  ].join('\n\n') + '\n';
