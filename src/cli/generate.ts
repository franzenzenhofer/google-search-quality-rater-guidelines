import { ROOT_DIR } from '../config.js';
import { generate } from '../generate.js';

const doc = await generate(ROOT_DIR);
console.log(`Generated version ${doc.meta.version}: ${doc.sections.length} sections, ${doc.meta.pageCount} pages.`);
