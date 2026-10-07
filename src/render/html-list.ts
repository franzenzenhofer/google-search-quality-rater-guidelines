import { escapeHtml, htmlSpans, isBullet } from './inline.js';
import type { ParagraphBlock } from '../types.js';

interface Open {
  readonly depth: number;
  readonly tag: 'ul' | 'ol';
}

const tagOf = (marker: string): 'ul' | 'ol' => (/^\d+\.$/.test(marker) ? 'ol' : 'ul');

/** Item text; enumerators that HTML lists cannot express ("a.", "iv.") stay visible. */
const itemText = (p: ParagraphBlock): string => {
  const marker = p.marker ?? '';
  const prefix = isBullet(marker) || tagOf(marker) === 'ol' ? '' : `${escapeHtml(marker)} `;
  return prefix + htmlSpans(p.spans);
};

/** Renders consecutive list paragraphs (items and their continuation paragraphs) as nested lists. */
export const htmlList = (items: readonly ParagraphBlock[]): string => {
  const stack: Open[] = [];
  let html = '';
  const close = (depth: number): void => {
    while ((stack[stack.length - 1]?.depth ?? 0) > depth) html += `</li></${stack.pop()?.tag}>`;
  };
  for (const p of items) {
    if (p.marker === null) {
      close(p.listDepth);
      html += `<p>${htmlSpans(p.spans)}</p>`;
      continue;
    }
    close(p.listDepth);
    const top = stack[stack.length - 1];
    if (top && top.depth === p.listDepth) html += '</li>';
    else {
      const tag = tagOf(p.marker);
      const start = tag === 'ol' ? ` start="${parseInt(p.marker, 10)}"` : '';
      html += `<${tag}${start}>`;
      stack.push({ depth: p.listDepth, tag });
    }
    html += `<li>${itemText(p)}`;
  }
  close(0);
  return html;
};
