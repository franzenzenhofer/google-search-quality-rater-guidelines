import type { ParagraphBlock, Span } from '../types.js';

/** Bullet glyphs as printed; rendered as "-" list items. */
const BULLETS = new Set(['●', '○', '■', '□', '◦', '▪', '•', '-']);

export const isBullet = (marker: string): boolean => BULLETS.has(marker);

export const plainSpans = (spans: readonly Span[]): string =>
  spans.map((s) => s.text).join('').replace(/\s+/g, ' ').trim();

const escapeMd = (text: string): string => text.replace(/([*`\\])/g, '\\$1').replace(/<(?=[A-Za-z/!])/g, '&lt;');

/** Wraps the non-space core of `text` in `open`/`close`, keeping surrounding spaces outside. */
const wrap = (text: string, open: string, close: string): string => {
  const m = /^(\s*)(.*?)(\s*)$/s.exec(text);
  if (!m || !m[2]) return text;
  return `${m[1]}${open}${m[2]}${close}${m[3]}`;
};

/** Emphasis on punctuation alone ("**Important***:*") only adds noise. */
const hasWords = (text: string): boolean => /[\p{L}\p{N}]/u.test(text);

const spanMd = (s: Span): string => {
  let out = escapeMd(s.text);
  if (s.italic && hasWords(s.text)) out = wrap(out, '*', '*');
  if (s.bold && hasWords(s.text)) out = wrap(out, '**', '**');
  if (s.href) out = wrap(out, '[', `](${s.href.replace(/\)/g, '%29').replace(/ /g, '%20')})`);
  return out;
};

export const markdownSpans = (spans: readonly Span[]): string =>
  spans.map(spanMd).join('').replace(/[ \t]+/g, ' ').trim();

/** Header cells are bold by definition; drop the bold markup there. */
export const unbold = (spans: readonly Span[]): Span[] => spans.map((s) => ({ ...s, bold: false }));

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const spanHtml = (s: Span): string => {
  let out = escapeHtml(s.text);
  if (s.italic && hasWords(s.text)) out = wrap(out, '<em>', '</em>');
  if (s.bold && hasWords(s.text)) out = wrap(out, '<strong>', '</strong>');
  if (s.href) out = wrap(out, `<a href="${escapeHtml(s.href)}" rel="noopener">`, '</a>');
  return out;
};

export const htmlSpans = (spans: readonly Span[]): string =>
  spans.map(spanHtml).join('').replace(/[ \t]+/g, ' ').trim();

export { escapeHtml };

/** Printed marker of a list item, normalised for plain text. */
export const plainMarker = (p: ParagraphBlock): string =>
  p.marker === null ? '' : isBullet(p.marker) ? '- ' : `${p.marker} `;
