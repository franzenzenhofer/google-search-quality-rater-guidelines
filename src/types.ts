/** A positioned run of text from the PDF, in page coordinates (points, y grows upwards). */
export interface TextRun {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly href: string | null;
}

/** A straight stroked segment (table border) in page coordinates. */
export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface LinkArea {
  readonly href: string;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
  readonly top: number;
}

export interface Rect {
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
}

export interface RawPage {
  readonly number: number;
  readonly runs: readonly TextRun[];
  readonly segments: readonly Segment[];
  /** Coloured filled rectangles (table cell shading). */
  readonly shades: readonly Rect[];
}

/** A line of text: runs sharing one baseline, ordered left to right. */
export interface Line {
  readonly runs: readonly TextRun[];
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface Span {
  readonly text: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly href: string | null;
}

export interface HeadingBlock {
  readonly kind: 'heading';
  readonly level: number;
  readonly number: string | null;
  readonly title: string;
  readonly page: number;
}

export interface ParagraphBlock {
  readonly kind: 'paragraph';
  readonly spans: readonly Span[];
  readonly page: number;
  /** 0 = body text, 1+ = list item nesting depth. */
  readonly listDepth: number;
  /** Marker as printed ("●", "1.") or null for plain paragraphs. */
  readonly marker: string | null;
  /** Plain paragraph indented from the container edge (rendered as a quote). */
  readonly indented: boolean;
  /** Left edge of the text (after any marker). */
  readonly x: number;
  /** Baseline of the last line, used to detect paragraphs that continue on the next page. */
  readonly lastY: number;
  readonly firstY: number;
}

export interface TableBlock {
  readonly kind: 'table';
  readonly rows: readonly (readonly (readonly ParagraphBlock[])[])[];
  readonly header: boolean;
  readonly page: number;
  readonly columns: readonly number[];
  /** Top border of the table on its page. */
  readonly top: number;
}

export interface PageBlock {
  readonly kind: 'page';
  readonly page: number;
}

export type Block = HeadingBlock | ParagraphBlock | TableBlock | PageBlock;

export interface TocEntry {
  readonly number: string | null;
  readonly title: string;
  /** Page the section starts on, as printed in the table of contents. */
  readonly page: number;
  readonly level: number;
  /** PDF page the TOC line itself is printed on (1-4). */
  readonly printedOn: number;
}

export interface Section {
  readonly id: string;
  readonly number: string | null;
  readonly title: string;
  readonly level: number;
  readonly pageStart: number;
  readonly pageEnd: number;
  /** Blocks belonging to this section only (up to the next heading of any level). */
  readonly blocks: readonly Block[];
}

export interface DocumentMeta {
  readonly version: string;
  readonly sourceUrl: string;
  readonly sha256: string;
  readonly fetchedAt: string;
  readonly pageCount: number;
}

export interface GuidelineDocument {
  readonly meta: DocumentMeta;
  readonly toc: readonly TocEntry[];
  readonly preamble: readonly Block[];
  readonly sections: readonly Section[];
}
