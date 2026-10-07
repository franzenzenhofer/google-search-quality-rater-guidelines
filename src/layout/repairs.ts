import type { Span } from '../types.js';

/**
 * Text the PDF's text layer cannot carry. The Devanagari words on pages 168 and 171 are drawn with
 * shaped glyphs (reph, vowel sign i) that have no Unicode mapping in the embedded font, so every
 * extractor (pdf.js, poppler) drops them. Each entry was checked against the rendered page.
 */
export const GLYPH_REPAIRS: readonly (readonly [string, string])[] = [
  ['राजा रव वमा', 'राजा रवि वर्मा'],
  ['हावड वेबसाइट', 'हार्वर्ड वेबसाइट'],
];

export const repairText = (text: string): string =>
  GLYPH_REPAIRS.reduce((out, [broken, fixed]) => out.split(broken).join(fixed), text);

export const repairSpans = (spans: readonly Span[]): Span[] => spans.map((s) => ({ ...s, text: repairText(s.text) }));
