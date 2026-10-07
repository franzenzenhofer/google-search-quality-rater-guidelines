import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './config.js';
import { buildDocument } from './document.js';
import { buildMeta, readFetchInfo, renderVersion } from './meta.js';
import { loadPdf } from './pdf/load.js';
import { renderMarkdown, renderText } from './render/full.js';
import { renderHtml } from './render/html.js';
import { renderJson } from './render/json.js';
import { renderLlms } from './render/llms.js';
import { sectionFiles } from './render/sections.js';
import { tocMismatches } from './toc.js';
import type { GuidelineDocument } from './types.js';

const write = async (root: string, rel: string, content: string): Promise<void> => {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
};

/** Removes section files that the new build no longer produces (e.g. after a renamed chapter). */
const pruneSections = async (root: string, keep: ReadonlySet<string>): Promise<void> => {
  const dir = path.join(root, PATHS.sectionsDir);
  const existing = await readdir(dir).catch(() => [] as string[]);
  const stale = existing.filter((f) => f.endsWith('.md') && !keep.has(`${PATHS.sectionsDir}/${f}`));
  await Promise.all(stale.map((f) => rm(path.join(dir, f))));
};

/** Parses the PDF in `root` and fails if its headings disagree with its printed table of contents. */
export const readDocument = async (root: string): Promise<GuidelineDocument> => {
  const pdf = new Uint8Array(await readFile(path.join(root, PATHS.pdf)));
  const pages = await loadPdf(pdf.slice());
  const doc = buildDocument(pages, buildMeta(pdf, pages, await readFetchInfo(root)));
  const problems = tocMismatches(doc.toc, doc.sections);
  if (problems.length > 0) throw new Error(`Headings do not match the table of contents:\n${problems.join('\n')}`);
  return doc;
};

/** Regenerates every derived format from the PDF in `root`. */
export const generate = async (root: string): Promise<GuidelineDocument> => {
  const doc = await readDocument(root);
  const files = sectionFiles(doc);
  await pruneSections(root, new Set(files.map((f) => f.path)));
  await Promise.all([
    write(root, PATHS.version, renderVersion(doc.meta)),
    write(root, PATHS.markdown, renderMarkdown(doc)),
    write(root, PATHS.text, renderText(doc)),
    write(root, PATHS.json, renderJson(doc, files)),
    write(root, PATHS.html, renderHtml(doc)),
    write(root, PATHS.llms, renderLlms(doc, files)),
    ...files.map((f) => write(root, f.path, f.content)),
  ]);
  return doc;
};
