import { REPO_URL, pdfPageUrl } from '../config.js';
import { headingLabel } from '../layout/headings.js';
import { DOC_TITLE, NOTICE } from './full.js';
import { HTML_SCRIPT, HTML_STYLE } from './html-style.js';
import { htmlList } from './html-list.js';
import { escapeHtml, htmlSpans, unbold } from './inline.js';
import type { Block, GuidelineDocument, ParagraphBlock, Section, TableBlock } from '../types.js';

const pageMarker = (page: number): string =>
  `<span class="pg" id="page-${page}"><a href="${pdfPageUrl(page)}">PDF page ${page}</a></span>`;

const cellHtml = (cell: readonly ParagraphBlock[], tag: 'td' | 'th'): string =>
  `<${tag}>${cell.map((p) => `<p>${p.marker ? `${escapeHtml(p.marker)} ` : ''}${htmlSpans(tag === 'th' ? unbold(p.spans) : p.spans)}</p>`).join('')}</${tag}>`;

const tableHtml = (t: TableBlock): string => {
  const width = Math.max(...t.rows.map((r) => r.length));
  const row = (cells: readonly (readonly ParagraphBlock[])[], tag: 'td' | 'th'): string =>
    `<tr>${Array.from({ length: width }, (_, i) => cellHtml(cells[i] ?? [], tag)).join('')}</tr>`;
  const [first = [], ...rest] = t.rows;
  const head = t.header ? `<thead>${row(first, 'th')}</thead>` : '';
  const body = (t.header ? rest : t.rows).map((r) => row(r, 'td')).join('\n');
  return `<div class="tbl"><table>${head}<tbody>${body}</tbody></table></div>`;
};

const paragraphHtml = (p: ParagraphBlock): string =>
  p.indented ? `<blockquote><p>${htmlSpans(p.spans)}</p></blockquote>` : `<p>${htmlSpans(p.spans)}</p>`;

const listItem = (b: Block): ParagraphBlock | null => (b.kind === 'paragraph' && b.listDepth > 0 ? b : null);

const blocksHtml = (blocks: readonly Block[]): string => {
  const out: string[] = [];
  let list: ParagraphBlock[] = [];
  const flush = (): void => {
    if (list.length > 0) out.push(htmlList(list));
    list = [];
  };
  for (const b of blocks) {
    const item = listItem(b);
    if (item) {
      list.push(item);
      continue;
    }
    flush();
    if (b.kind === 'page') out.push(pageMarker(b.page));
    else if (b.kind === 'table') out.push(tableHtml(b));
    else if (b.kind === 'paragraph') out.push(paragraphHtml(b));
  }
  flush();
  return out.join('\n');
};

const sectionHtml = (s: Section): string => {
  const tag = `h${Math.min(s.level, 4)}`;
  const label = escapeHtml(headingLabel(s.number, s.title));
  const src = `<a class="src" href="${pdfPageUrl(s.pageStart)}" title="Official PDF, page ${s.pageStart}">p. ${s.pageStart}</a>`;
  return `<section id="${s.id}"><${tag}${s.level === 1 ? ' class="s"' : ''}><a href="#${s.id}">${label}</a>${src}</${tag}>\n${blocksHtml(s.blocks)}</section>`;
};

/** Nested table of contents; a level-n entry nests under the nearest shallower one. */
const tocHtml = (sections: readonly Section[]): string => {
  let depth = 0;
  let html = '';
  for (const s of sections) {
    if (s.level > depth) html += '<ul>'.repeat(s.level - depth);
    else html += '</li>' + '</ul></li>'.repeat(depth - s.level);
    html += `<li class="l${s.level}"><a href="#${s.id}">${escapeHtml(headingLabel(s.number, s.title))}</a>`;
    depth = s.level;
  }
  return html + '</li></ul>'.repeat(depth);
};

const headerHtml = (doc: GuidelineDocument): string => `<header class="doc">
<h1>${escapeHtml(DOC_TITLE)}</h1>
<p class="formats">Version <strong>${doc.meta.version}</strong> - ${doc.meta.pageCount} pages - <a href="${doc.meta.sourceUrl}">official PDF</a> - other formats: <a href="${REPO_URL}/blob/main/markdown/qrg.md">Markdown</a>, <a href="${REPO_URL}/blob/main/text/qrg.txt">text</a>, <a href="${REPO_URL}/blob/main/json/qrg.json">JSON</a>, <a href="${REPO_URL}">GitHub</a> <button class="theme" id="theme" type="button">Light / dark</button></p>
<p class="notice">${escapeHtml(NOTICE)} The text below is (c) Google LLC; this page is not affiliated with or endorsed by Google. Every heading links to its page in the official PDF.</p>
</header>`;

/** The single self-contained reading page published via GitHub Pages. */
export const renderHtml = (doc: GuidelineDocument): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Search Quality Rater Guidelines</title>
<meta name="description" content="Unofficial readable mirror of Google's Search Quality Evaluator Guidelines, version ${doc.meta.version}, with a table of contents and links to the official PDF pages.">
<link rel="canonical" href="${doc.meta.sourceUrl}">
<style>${HTML_STYLE}</style>
</head>
<body>
<div class="layout">
<nav class="toc" aria-label="Table of contents">${tocHtml(doc.sections)}</nav>
<main>
${headerHtml(doc)}
${blocksHtml(doc.preamble)}
${doc.sections.map(sectionHtml).join('\n')}
</main>
</div>
<script>${HTML_SCRIPT}</script>
</body>
</html>
`;
