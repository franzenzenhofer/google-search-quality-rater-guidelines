import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS, SOURCE_URL } from './config.js';
import { generate } from './generate.js';
import { sha256, type FetchInfo } from './meta.js';
import { loadPdf } from './pdf/load.js';
import { parseVersionDate } from './toc.js';

/** Everything that belongs to one guideline version and is archived when a new one arrives. */
export const VERSIONED_PATHS = ['pdf', PATHS.version, 'markdown', 'text', 'json', 'html', PATHS.llms] as const;

const PDF_MAGIC = '%PDF-';

export interface Download {
  readonly data: Uint8Array;
  readonly lastModified: string | null;
}

export type SyncResult =
  | { readonly status: 'unchanged'; readonly version: string }
  | { readonly status: 'updated'; readonly version: string; readonly archived: string | null };

/** Downloads the official PDF; anything but a 200 response with a PDF body is an error. */
export const downloadPdf = async (url: string = SOURCE_URL): Promise<Download> => {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} for ${url}`);
  const data = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(data.slice(0, PDF_MAGIC.length)) !== PDF_MAGIC) throw new Error(`Not a PDF: ${url}`);
  return { data, lastModified: res.headers.get('last-modified') };
};

const exists = async (p: string): Promise<boolean> => stat(p).then(() => true, () => false);

const currentInfo = async (root: string): Promise<FetchInfo | null> => {
  const file = path.join(root, PATHS.fetchMeta);
  return (await exists(file)) ? (JSON.parse(await readFile(file, 'utf8')) as FetchInfo) : null;
};

/** First free archive folder for a version date (a re-issue with the same date gets a sha suffix). */
const archiveDir = async (root: string, version: string, sha: string): Promise<string> => {
  const plain = path.join(root, PATHS.versionsDir, version);
  return (await exists(plain)) ? `${plain}-${sha.slice(0, 8)}` : plain;
};

/** Copies the current version's files into versions/<date>/ before they are replaced. */
export const archiveCurrent = async (root: string, info: FetchInfo): Promise<string> => {
  const version = (await readFile(path.join(root, PATHS.version), 'utf8')).split('\n')[0] ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) throw new Error(`VERSION does not start with a date: "${version}"`);
  const target = await archiveDir(root, version, info.sha256);
  await mkdir(target, { recursive: true });
  for (const rel of VERSIONED_PATHS) {
    const from = path.join(root, rel);
    if (await exists(from)) await cp(from, path.join(target, rel), { recursive: true });
  }
  return path.relative(root, target);
};

/** Stores a downloaded PDF plus its fetch record as the current version. */
export const storePdf = async (root: string, download: Download, fetchedAt: Date): Promise<FetchInfo> => {
  const info: FetchInfo = { fetchedAt: fetchedAt.toISOString(), sha256: sha256(download.data), lastModified: download.lastModified };
  await mkdir(path.join(root, 'pdf'), { recursive: true });
  await writeFile(path.join(root, PATHS.pdf), download.data);
  await writeFile(path.join(root, PATHS.fetchMeta), `${JSON.stringify(info, null, 2)}\n`);
  return info;
};

/** Applies a download: unchanged sha = no-op; new sha = archive the old version, store, regenerate. */
export const applyDownload = async (root: string, download: Download, now: Date): Promise<SyncResult> => {
  const current = await currentInfo(root);
  if (current?.sha256 === sha256(download.data)) {
    return { status: 'unchanged', version: parseVersionDate(await loadPdf(download.data.slice())) };
  }
  const archived = current ? await archiveCurrent(root, current) : null;
  await storePdf(root, download, now);
  const doc = await generate(root);
  return { status: 'updated', version: doc.meta.version, archived };
};
