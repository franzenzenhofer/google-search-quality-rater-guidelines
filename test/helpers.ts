import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from '../src/config.js';
import { readDocument } from '../src/generate.js';
import type { GuidelineDocument } from '../src/types.js';

export const read = (rel: string, root: string = ROOT_DIR): string => readFileSync(path.join(root, rel), 'utf8');

let cached: Promise<GuidelineDocument> | null = null;

/** The document parsed from the committed PDF (parsed once per test file). */
export const parsedDocument = (): Promise<GuidelineDocument> => (cached ??= readDocument(ROOT_DIR));

/** Markdown reduced to its text: emphasis, links, escapes and table pipes removed. */
export const stripMarkdown = (md: string): string =>
  md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|(?<!\\)\*/g, '')
    .replace(/\\([*`\\|])/g, '$1')
    .replace(/<br>/g, ' ')
    .replace(/&lt;/g, '<');

/** PDF page of the nearest `<!-- page N -->` marker before `index`. */
export const pageAt = (text: string, index: number): number | null => {
  const markers = [...text.slice(0, index).matchAll(/<!-- page (\d+) -->/g)];
  const last = markers[markers.length - 1];
  return last ? Number(last[1]) : null;
};

export const currentVersion = (): string => read('VERSION').split('\n')[0] ?? '';
