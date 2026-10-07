import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS, SOURCE_URL } from './config.js';
import { parseVersionDate } from './toc.js';
import type { DocumentMeta, RawPage } from './types.js';

export interface FetchInfo {
  readonly fetchedAt: string;
  readonly sha256: string;
  readonly lastModified: string | null;
}

export const sha256 = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');

export const readFetchInfo = async (root: string): Promise<FetchInfo> =>
  JSON.parse(await readFile(path.join(root, PATHS.fetchMeta), 'utf8')) as FetchInfo;

/** Document metadata; fails loudly if the recorded fetch does not belong to this PDF. */
export const buildMeta = (pdf: Uint8Array, pages: readonly RawPage[], fetch: FetchInfo): DocumentMeta => {
  const hash = sha256(pdf);
  if (hash !== fetch.sha256) throw new Error(`${PATHS.fetchMeta} records sha256 ${fetch.sha256}, PDF is ${hash}`);
  return { version: parseVersionDate(pages), sourceUrl: SOURCE_URL, sha256: hash, fetchedAt: fetch.fetchedAt, pageCount: pages.length };
};

/** VERSION file: version date, source URL, sha256 - one per line. */
export const renderVersion = (meta: DocumentMeta): string => `${meta.version}\n${meta.sourceUrl}\n${meta.sha256}\n`;
