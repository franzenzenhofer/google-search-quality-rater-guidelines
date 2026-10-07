import { PAGES_URL, PATHS, REPO_URL } from '../config.js';
import { headingLabel } from '../layout/headings.js';
import type { SectionFile } from './sections.js';
import type { GuidelineDocument } from '../types.js';

const RAW = `${REPO_URL.replace('github.com', 'raw.githubusercontent.com')}/main`;

const fileLine = (f: SectionFile): string =>
  `- [${headingLabel(f.head.number, f.head.title)}](${RAW}/${f.path}): PDF pages ${f.pages}`;

const citeExample = (doc: GuidelineDocument): string => {
  const s = doc.sections.find((x) => x.title.includes('E-E-A-T')) ?? doc.sections[0];
  return s ? `${doc.meta.sourceUrl}#page=${s.pageStart} for "${headingLabel(s.number, s.title)}"` : doc.meta.sourceUrl;
};

/** llms.txt (https://llmstxt.org/) telling agents which file to read for what. */
export const renderLlms = (doc: GuidelineDocument, files: readonly SectionFile[]): string => `# Google Search Quality Rater Guidelines (unofficial machine-readable mirror)

> Google's Search Quality Evaluator Guidelines ("General Guidelines", the human quality rater guideline), version ${doc.meta.version}, converted from the official PDF into Markdown, plain text, JSON and HTML so agents can read, grep and cite it. The text is (c) Google LLC; this mirror is not affiliated with or endorsed by Google. Official PDF: ${doc.meta.sourceUrl}

Version facts: version date ${doc.meta.version}, ${doc.meta.pageCount} PDF pages, sha256 ${doc.meta.sha256}. The file VERSION holds these three values (date, source URL, sha256), one per line.

How to use:
- Search: grep markdown/sections/*.md or text/qrg.txt. Every PDF page starts with the marker \`<!-- page N -->\` (same format in Markdown and text), so the nearest marker above a match is the page to cite.
- Structure: json/qrg.json has one entry per heading (${doc.sections.length} entries; matches the printed table of contents): id, number, title, level, pageStart, pageEnd, pdfUrl, file, text. \`text\` is the section's own text up to the next heading.
- Cite: always link the official PDF with a page fragment, e.g. ${citeExample(doc)}. Quote verbatim from the text files; do not cite this mirror as the source.
- Tables are GitHub Markdown tables in the Markdown files (cell paragraphs joined by <br>), and "Header: cell" lines in the text file.
- Screenshots and example images of the PDF are not included; links to them (guidelines.raterhub.com/images/...) are kept in the Markdown and HTML files.

## Full text

- [markdown/qrg.md](${RAW}/${PATHS.markdown}): complete document as Markdown, headings mirror the numbering (# part, ## N.0, ### N.N, #### N.N.N)
- [text/qrg.txt](${RAW}/${PATHS.text}): complete document as plain text
- [json/qrg.json](${RAW}/${PATHS.json}): sections with page ranges and text
- [html/index.html](${PAGES_URL}): one readable page with table of contents (GitHub Pages)
- [pdf/searchqualityevaluatorguidelines.pdf](${RAW}/${PATHS.pdf}): unchanged copy of the official PDF

## Sections (markdown/sections/, one file per part and chapter, with front matter: title, number, level, pages, source)

${files.map(fileLine).join('\n')}

## Optional

- [README.md](${RAW}/README.md): what this is, how it is generated, how to cite
- [versions/](${REPO_URL}/tree/main/versions): earlier versions of the guideline, kept when Google publishes a new one
`;
