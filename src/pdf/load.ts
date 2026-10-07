import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api.js';
import { collectGraphics } from './graphics.js';
import { NON_TEXT } from './non-text.js';
import type { LinkArea, RawPage, TextRun } from '../types.js';


interface PdfTextItem {
  readonly str: string;
  readonly transform: number[];
  readonly width: number;
  readonly height: number;
  readonly fontName: string;
}

interface PdfLinkAnnotation {
  readonly subtype: string;
  readonly url?: string;
  readonly rect: number[];
}

const fontStyle = (page: PDFPageProxy, fontName: string): { bold: boolean; italic: boolean } => {
  const font = page.commonObjs.has(fontName) ? (page.commonObjs.get(fontName) as { name?: string }) : {};
  const name = font.name ?? '';
  return { bold: /bold/i.test(name), italic: /italic|oblique/i.test(name) };
};

const linkAreas = async (page: PDFPageProxy): Promise<LinkArea[]> => {
  const annotations = (await page.getAnnotations()) as PdfLinkAnnotation[];
  return annotations.flatMap((a) => {
    if (a.subtype !== 'Link' || !a.url) return [];
    const [left = 0, bottom = 0, right = 0, top = 0] = a.rect;
    return [{ href: a.url, left, bottom, right, top }];
  });
};

const hrefAt = (links: readonly LinkArea[], x: number, y: number): string | null =>
  links.find((l) => x >= l.left && x <= l.right && y >= l.bottom && y <= l.top)?.href ?? null;

const toRun = (page: PDFPageProxy, item: PdfTextItem, links: readonly LinkArea[]): TextRun => {
  const x = item.transform[4] ?? 0;
  const y = item.transform[5] ?? 0;
  const centerX = x + item.width / 2;
  const centerY = y + item.height / 3;
  return {
    text: item.str.replace(NON_TEXT, ''),
    x,
    y,
    width: item.width,
    size: Math.round(item.height * 2) / 2,
    ...fontStyle(page, item.fontName),
    href: hrefAt(links, centerX, centerY),
  };
};

const loadPage = async (page: PDFPageProxy): Promise<RawPage> => {
  const ops = await page.getOperatorList();
  const content = await page.getTextContent();
  const links = await linkAreas(page);
  const items = content.items.filter((i): i is PdfTextItem & typeof i => 'str' in i);
  const runs = items.map((i) => toRun(page, i, links)).filter((r) => r.text.trim() !== '');
  return { number: page.pageNumber, runs, ...collectGraphics(ops) };
};

/** Reads every page of the PDF into positioned text runs and table border segments. */
export const loadPdf = async (data: Uint8Array): Promise<RawPage[]> => {
  const task = getDocument({ data, fontExtraProperties: true, verbosity: 0 });
  const doc = await task.promise;
  const pages: RawPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    pages.push(await loadPage(await doc.getPage(n)));
  }
  await task.destroy();
  return pages;
};
