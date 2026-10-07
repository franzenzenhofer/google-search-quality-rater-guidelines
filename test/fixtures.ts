/**
 * Passages checked by eye against the rendered PDF pages of version 2025-09-11
 * (body text, bullet and numbered lists, table cells, superscripts, Devanagari).
 */
export const FIXTURE_VERSION = '2025-09-11';

export interface Passage {
  readonly page: number;
  readonly text: string;
  readonly what: string;
}

export const PASSAGES: readonly Passage[] = [
  { page: 9, what: 'bullet list item', text: 'In-depth knowledge of these guidelines.' },
  { page: 11, what: 'YMYL definition', text: 'Some topics have a high risk of harm because content about these topics could significantly impact the health, financial stability, or safety of people, or the welfare or well-being of society. We call these topics “Your Money or Your Life” or YMYL.' },
  { page: 12, what: 'YMYL table cell', text: 'Evacuation routes for a tsunami' },
  { page: 13, what: 'numbered list with italics', text: 'Would a careful person seek out experts or highly trusted sources to prevent harm? Could even minor inaccuracies cause harm? If yes, then the topic is likely YMYL.' },
  { page: 19, what: 'Page Quality rating scale', text: 'You may also use the in-between ratings of Lowest+, Low+, Medium+, and High+. Please interpret the “+” as “+ ½,” meaning that the Lowest+ rating is halfway between Lowest and Low, Low+ is halfway between Low and Medium, etc.' },
  { page: 19, what: 'original wording kept ("to pages to pages")', text: 'harmful products sold online to pages to pages that mimic the look of scientific papers or encyclopedia entries' },
  { page: 26, what: 'E-E-A-T', text: 'Experience, Expertise, Authoritativeness and Trust (E-E-A-T) are all important considerations in PQ rating. The most important member at the center of the E-E-A-T family is Trust.' },
  { page: 26, what: 'E-E-A-T bullet', text: 'Informational pages on clear YMYL topics must be accurate to prevent harm to people and society.' },
  { page: 28, what: 'E-E-A-T table cell', text: 'Sleep challenges when pregnant' },
  { page: 29, what: 'Lowest table cell', text: 'The Lowest rating is required if the page has a harmful purpose, or if it is designed to deceive people about its true purpose or who is responsible for the content on the page.' },
  { page: 40, what: 'spam policy', text: 'Expired domain abuse is where an expired domain name is purchased and repurposed primarily to benefit the new website owner by hosting content that provides little to no value to users.' },
  { page: 42, what: 'spam policy', text: 'Scaled content abuse is a spam practice described in the Google Search Web Spam Policies.' },
  { page: 101, what: 'superscript', text: '41st US president' },
  { page: 113, what: 'Needs Met scale table', text: 'A very helpful result for any dominant, common or reasonable minor query interpretation/user intent.' },
  { page: 118, what: 'Fully Meets', text: 'Fully Meets is a special rating category which only applies when all of the following are true:' },
  { page: 168, what: 'Devanagari repaired from the rendered page', text: 'राजा रवि वर्मा' },
  { page: 182, what: 'change log list', text: 'Updated YMYL definitions' },
];

export const PART_TITLES: readonly string[] = [
  'General Guidelines Overview',
  'Introduction to Search Quality Rating',
  'Part 1: Page Quality Rating Guideline',
  'Part 2: Understanding Search User Needs',
  'Part 3: Needs Met Rating Guideline',
  'Appendix 1: Using the Evaluation Platform',
  'Appendix 2: Guideline Change Log',
];

export const SECTION_COUNT = 158;
export const PAGE_COUNT = 182;
