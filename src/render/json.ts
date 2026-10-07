import { pdfPageUrl } from '../config.js';
import { blocksText } from './text.js';
import type { SectionFile } from './sections.js';
import type { GuidelineDocument } from '../types.js';

export interface JsonSection {
  readonly id: string;
  readonly number: string | null;
  readonly title: string;
  readonly level: number;
  readonly pageStart: number;
  readonly pageEnd: number;
  readonly pdfUrl: string;
  readonly file: string;
  readonly text: string;
}

export interface JsonDocument {
  readonly version: string;
  readonly sourceUrl: string;
  readonly sha256: string;
  readonly fetchedAt: string;
  readonly pageCount: number;
  readonly copyright: string;
  readonly notes: Readonly<Record<string, string>>;
  readonly sections: readonly JsonSection[];
}

const NOTES = {
  text: 'Plain text of the section itself, up to the next heading of any level; subsections are separate entries.',
  pageEnd: 'Last page covered by the section including its subsections.',
  pdfUrl: 'Official PDF deep link to the first page of the section; cite this.',
  file: 'Markdown file (markdown/sections/) that contains the section.',
};

/** Structured JSON: one entry per heading of the document, in document order. */
export const renderJson = (doc: GuidelineDocument, files: readonly SectionFile[]): string => {
  const fileOf = new Map(files.flatMap((f) => f.sections.map((s) => [s.id, f.path] as const)));
  const json: JsonDocument = {
    version: doc.meta.version,
    sourceUrl: doc.meta.sourceUrl,
    sha256: doc.meta.sha256,
    fetchedAt: doc.meta.fetchedAt,
    pageCount: doc.meta.pageCount,
    copyright: 'The guideline text is (c) Google LLC. Unofficial mirror; cite the official PDF.',
    notes: NOTES,
    sections: doc.sections.map((s) => ({
      id: s.id,
      number: s.number,
      title: s.title,
      level: s.level,
      pageStart: s.pageStart,
      pageEnd: s.pageEnd,
      pdfUrl: pdfPageUrl(s.pageStart),
      file: fileOf.get(s.id) ?? '',
      text: blocksText(s.blocks, false),
    })),
  };
  return `${JSON.stringify(json, null, 2)}\n`;
};
