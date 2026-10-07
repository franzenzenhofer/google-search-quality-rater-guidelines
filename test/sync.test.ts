import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PATHS, ROOT_DIR } from '../src/config.js';
import { sha256 } from '../src/meta.js';
import { VERSIONED_PATHS, applyDownload, archiveCurrent } from '../src/sync.js';
import { currentVersion } from './helpers.js';

let root = '';

const pdfBytes = async (): Promise<Uint8Array> => new Uint8Array(await readFile(path.join(ROOT_DIR, PATHS.pdf)));
const fetchInfo = async () => JSON.parse(await readFile(path.join(root, PATHS.fetchMeta), 'utf8')) as { sha256: string; fetchedAt: string };

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'qrg-sync-'));
  for (const rel of VERSIONED_PATHS) await cp(path.join(ROOT_DIR, rel), path.join(root, rel), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('sync on a copy of the repository', () => {
  it('leaves everything untouched when the official PDF has the same sha256', async () => {
    const before = await fetchInfo();
    const result = await applyDownload(root, { data: await pdfBytes(), lastModified: null }, new Date());
    expect(result).toEqual({ status: 'unchanged', version: currentVersion() });
    expect(await fetchInfo()).toEqual(before);
    expect(await readdir(root)).not.toContain(PATHS.versionsDir);
  });

  it('archives the previous version and regenerates when the sha256 differs', async () => {
    const info = await fetchInfo();
    await writeFile(path.join(root, PATHS.fetchMeta), JSON.stringify({ ...info, sha256: 'f'.repeat(64) }));
    const now = new Date('2030-01-06T06:00:00Z');
    const result = await applyDownload(root, { data: await pdfBytes(), lastModified: 'Mon, 06 Jan 2030 05:00:00 GMT' }, now);
    expect(result).toEqual({ status: 'updated', version: currentVersion(), archived: `versions/${currentVersion()}` });
    const archived = path.join(root, 'versions', currentVersion());
    expect((await readdir(archived)).sort()).toEqual([...VERSIONED_PATHS].sort());
    expect(await fetchInfo()).toMatchObject({ sha256: sha256(await pdfBytes()), fetchedAt: now.toISOString() });
    expect(await readFile(path.join(root, PATHS.markdown), 'utf8')).toBe(await readFile(path.join(archived, PATHS.markdown), 'utf8'));
  });

  it('never overwrites an archive: a re-issue with the same date gets a sha suffix', async () => {
    const info = await fetchInfo();
    const first = await archiveCurrent(root, { ...info, lastModified: null });
    const second = await archiveCurrent(root, { ...info, lastModified: null });
    expect(first).toBe(`versions/${currentVersion()}`);
    expect(second).toBe(`versions/${currentVersion()}-${info.sha256.slice(0, 8)}`);
  });
});
