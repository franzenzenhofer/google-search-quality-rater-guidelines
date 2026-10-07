import { ROOT_DIR } from '../config.js';
import { applyDownload, downloadPdf } from '../sync.js';

const result = await applyDownload(ROOT_DIR, await downloadPdf(), new Date());
if (result.status === 'unchanged') console.log(`Unchanged: official PDF is still version ${result.version}.`);
else console.log(`Updated to version ${result.version}${result.archived ? `; previous version archived in ${result.archived}` : ''}.`);
