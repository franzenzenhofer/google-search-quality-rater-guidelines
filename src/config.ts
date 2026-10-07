import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const SOURCE_URL =
  'https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf';
export const REPO_URL = 'https://github.com/franzenzenhofer/google-search-quality-rater-guidelines';
export const PAGES_URL = 'https://qrg.franzai.com/';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const PATHS = {
  pdf: 'pdf/searchqualityevaluatorguidelines.pdf',
  fetchMeta: 'pdf/fetch.json',
  version: 'VERSION',
  markdown: 'markdown/qrg.md',
  sectionsDir: 'markdown/sections',
  text: 'text/qrg.txt',
  json: 'json/qrg.json',
  html: 'html/index.html',
  llms: 'llms.txt',
  versionsDir: 'versions',
} as const;

/** Layout constants of the September 2025 print (points). */
export const LAYOUT = {
  /** Running footer ("Copyright 2025" + page number) sits below this baseline. */
  footerMaxY: 60,
  /** TOC occupies the pages up to this one; body text starts after. */
  tocLastPage: 4,
  /** Two runs on one line closer than this (points) are joined without a space. */
  joinGap: 0.8,
  /** Baselines closer than this belong to one line. */
  baselineTolerance: 2.5,
  /** Font sizes used for headings. */
  partSize: 18,
  chapterSize: 12,
  sectionSize: 11,
} as const;

export const PAGE_MARKER = (page: number): string => `<!-- page ${page} -->`;

export const pdfPageUrl = (page: number): string => `${SOURCE_URL}#page=${page}`;
