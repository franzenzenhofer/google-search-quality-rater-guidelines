# Google Search Quality Rater Guidelines, machine- and human-readable

An **unofficial mirror** of Google's *Search Quality Evaluator Guidelines* (the "General Guidelines" that Google's human search quality raters work with), converted from the official PDF into Markdown, plain text, JSON and a single HTML page. It exists so that people in SEO workshops and AI agents can read, grep and cite the guideline without fighting a 182-page PDF.

- **Official source (always cite this):** https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf
- **Where Google links it:** [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content#:~:text=Rater%20data%20is%20not%20used%20directly%20in%20our%20ranking%20algorithms) on Google Search Central, which also explains that "Rater data is not used directly in our ranking algorithms."
- **Version mirrored:** 2025-09-11 (the date printed on page 1 of the PDF, "September 11, 2025"; see [`VERSION`](VERSION))
- **Readable page (GitHub Pages):** https://qrg.franzai.com/

## Copyright and license

The guideline text is **(c) Google LLC**. This repository is not affiliated with, sponsored or endorsed by Google. The PDF in `pdf/` is the unchanged file Google distributes publicly; every derived file keeps Google's wording and only changes the format. Nothing here replaces the official document: quote from it, link to it, and check the official PDF when it matters.

The converter code (`src/`, `test/`, configuration, workflows) is MIT licensed, (c) Franz Enzenhofer. The MIT license does **not** apply to the guideline text. See [`LICENSE`](LICENSE).

## Files

| Path | What it is |
| --- | --- |
| `pdf/searchqualityevaluatorguidelines.pdf` | The official PDF, byte for byte (`pdf/fetch.json` records when it was fetched) |
| `VERSION` | Three lines: version date (YYYY-MM-DD), source URL, sha256 of the PDF |
| `markdown/qrg.md` | Full text. Headings mirror the numbering: `#` part, `##` chapter (N.0), `###` section (N.N), `####` subsection (N.N.N). Every PDF page starts with `<!-- page N -->` |
| `markdown/sections/NN-<slug>.md` | One file per part, front-matter unit, appendix and chapter (N.0), in document order, each with front matter: `title`, `number`, `level`, `pages`, `source` (PDF link with `#page=N`), `version` |
| `text/qrg.txt` | Full plain text with the same `<!-- page N -->` markers; tables as "Header: cell" lines |
| `json/qrg.json` | `{ version, sourceUrl, sha256, fetchedAt, pageCount, sections: [{ id, number, title, level, pageStart, pageEnd, pdfUrl, file, text }] }`, one entry per heading |
| `html/index.html` | One self-contained page with a table of contents and an anchor per section, light and dark theme, published via GitHub Pages |
| `llms.txt` | Map of this repository for AI agents ([llmstxt.org](https://llmstxt.org/) format) |
| `versions/<YYYY-MM-DD>/` | Earlier guideline versions with all their formats, kept when Google publishes a new one |

In `json/qrg.json`, `text` is the section's own text up to the next heading of any level (subsections are their own entries), `pageEnd` covers the section including its subsections, and `file` names the Markdown section file that holds it.

## How to cite

Quote verbatim and link the **official PDF** with a page fragment, not this repository:

```
Google, Search Quality Evaluator Guidelines (version 2025-09-11), section 3.4,
https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf#page=26
```

To find the page of a passage, take the nearest `<!-- page N -->` marker above it in `markdown/` or `text/`, or `pageStart` in `json/qrg.json`. Each heading on the HTML page also links to its PDF page.

## For AI agents

1. Read [`llms.txt`](llms.txt) first: it lists every file with its page range.
2. Find passages with grep, for example `grep -n "E-E-A-T" markdown/sections/*.md` or `grep -n "Needs Met" text/qrg.txt`, and read the page marker above the hit.
3. For structure (all headings, levels, page ranges, per-section text) load `json/qrg.json`.
4. Cite `pdfUrl` (the official PDF with `#page=N`), quoting the text exactly as it appears in these files.

## How it is built

`npm run generate` reads the PDF with [pdf.js](https://github.com/mozilla/pdf.js) and rebuilds every format:

- Text runs keep position, font size, bold and italic, and link targets from the PDF's link annotations.
- Headings come from the typography (18pt parts, 12pt chapters, 11pt sections, bold 10pt N.N.N subsections). The build fails if they differ in any title, level or page from the table of contents printed on pages 1 to 4 (158 entries in this version).
- Tables are rebuilt from the drawn cell borders; a shaded or all-bold first row is the header. Rows split by a page break stay on their page so page markers remain exact; a continued table repeats its header.
- The running footer ("Copyright 2025" and the page number) and zero-width characters are removed. Paragraphs broken by a page break are joined so no sentence is cut in two. Lines that end in a hyphen are joined without a space, because the PDF never hyphenates words itself.
- Screenshots and diagrams are images in the PDF and are not part of the text; their links to `guidelines.raterhub.com/images/...` are kept in Markdown and HTML.
- Two Devanagari example queries (pages 168 and 171) use shaped glyphs that have no Unicode mapping in the PDF, so every extractor loses some letters. They are restored from the rendered page in `src/layout/repairs.ts`.

## Staying current

`npm run sync` downloads the official PDF and compares its sha256 with `pdf/fetch.json`. Same hash: nothing changes. New hash: the current version (PDF and every format) is copied to `versions/<old date>/`, the new PDF is stored and all formats are regenerated. The [weekly workflow](.github/workflows/sync.yml) runs this every Monday and commits only when the guideline changed; the [CI workflow](.github/workflows/ci.yml) runs the gates and fails when the committed files differ from a fresh `npm run generate`.

## Development

Node 20 or newer.

```
npm ci
npm run typecheck && npm run lint && npm run test && npm run build
npm run generate   # rebuild all formats from pdf/
npm run sync       # fetch the official PDF, archive + regenerate if it changed
```

Tests (vitest, no mocks) parse the real PDF and check the generated files: the table of contents against the body headings, every page marker present once and in order, no footer or control characters, no split hyphenation, rectangular Markdown tables, section file front matter, the JSON shape, the HTML minimum font size, and 17 passages (body text, bullet and numbered lists, table cells, the Page Quality and Needs Met scales, E-E-A-T, YMYL, a superscript, the Devanagari repair) that were checked by eye against the rendered PDF pages, including the page each one is on.
