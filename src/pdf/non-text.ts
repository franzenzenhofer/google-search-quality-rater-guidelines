/**
 * Characters that carry no text: control codes (icon glyphs of a Type3 font, unmapped glyphs come
 * through as U+0000 or U+0087) and zero-width characters (the PDF has one after almost every line).
 */
// eslint-disable-next-line no-control-regex, no-misleading-character-class -- matching these characters is the point
export const NON_TEXT = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b\u200c\u200d\ufeff]/g;

/** Same set plus the replacement character, as a non-global test pattern. */
// eslint-disable-next-line no-control-regex, no-misleading-character-class -- matching these characters is the point
export const NON_TEXT_OR_REPLACEMENT = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b\u200c\u200d\ufeff\ufffd]/;
