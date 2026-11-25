// Single source of truth for the "Teaching materials" section on the six
// course-module pages. Page counts are fixed (measured from the PDFs); file
// sizes are read at build time from public/documents so they stay accurate.
// Module titles/names come from ./modules — short names here are only the
// labels for the "Explore the other modules" buttons.

/** A downloadable document inside a teaching-materials group. */
export interface TMDoc {
  /** Short left tag shown on a green chip (Intro, L1, Q1, A1…). */
  tag: string;
  /** Document title. */
  title: string;
  /** Path under /documents/ (e.g. "modules/m1/intro.pdf"). */
  file: string;
  /** Page count. Omit for non-paginated formats (DOCX). */
  pages?: number;
  /** File format label. Defaults to PDF. */
  format?: 'PDF' | 'DOCX';
  /** For study questions: the lecture number they go with. */
  goesWith?: number;
}

/** A numbered group of documents. Numbers are fixed per group type. */
export interface TMGroup {
  num: string;
  name: string;
  hint: string;
  docs: TMDoc[];
}

/** Everything the teaching-materials section needs for one module. */
export interface ModuleTM {
  groups: TMGroup[];
  /** Train-the-Trainers toolkit for this module. */
  tot: { file: string; pages: number };
}

/** Short labels for the "Explore the other modules" buttons (M1…M6). */
export const moduleShort: Record<number, string> = {
  1: 'Climate resilience',
  2: 'Circular economy',
  3: 'Green construction',
  4: 'Energy management',
  5: 'Indoor climate',
  6: 'Smart buildings',
};

const START = { num: '01', name: 'Start here', hint: 'Read this first' };
const LECTURES = { num: '02', name: 'Lectures', hint: 'Follow in order' };
const PRACTICE = { num: '03', name: 'Practice', hint: 'Test yourself after each lecture' };

export const teachingMaterials: Record<number, ModuleTM> = {
  1: {
    groups: [
      {
        ...START,
        docs: [
          { tag: 'Intro', title: 'Introduction to the module', file: 'modules/m1/introduction-to-the-module.pdf', pages: 1 },
        ],
      },
      {
        ...LECTURES,
        docs: [
          { tag: 'L1', title: 'Part 1: Climate change fundamentals', file: 'modules/m1/part-1-climate-change-fundamentals.pdf', pages: 31 },
          { tag: 'L2', title: 'Part 2: Climate models and future climate data', file: 'modules/m1/part-2-climate-models-and-future-climate-data.pdf', pages: 4 },
          { tag: 'L3', title: 'Part 3: Climate adaptation, resilience and mitigation', file: 'modules/m1/part-3-climate-adaptation-resilience-and-mitigation.pdf', pages: 20 },
          { tag: 'L4', title: 'Part 4: Climate resilience and urban infrastructure', file: 'modules/m1/part-4-climate-resilience-and-urban-infrastructure.pdf', pages: 20 },
        ],
      },
      {
        ...PRACTICE,
        docs: [
          { tag: 'Q1', title: 'Study questions Part 1', file: 'modules/m1/study-questions-part-1.pdf', pages: 4, goesWith: 1 },
          { tag: 'Q2', title: 'Study questions Part 2', file: 'modules/m1/study-questions-part-2.pdf', pages: 4, goesWith: 2 },
          { tag: 'Q3', title: 'Study questions Part 3', file: 'modules/m1/study-questions-part-3.pdf', pages: 3, goesWith: 3 },
          { tag: 'Q4', title: 'Study questions Part 4', file: 'modules/m1/study-questions-part-4.pdf', pages: 4, goesWith: 4 },
        ],
      },
    ],
    tot: { file: 'modules/m1/tot-toolkit.pdf', pages: 19 },
  },
  2: {
    groups: [
      {
        ...LECTURES,
        docs: [
          { tag: 'L1', title: 'Circular economy', file: 'modules/m2/circular-economy.pdf', pages: 17 },
          { tag: 'L2', title: 'Circularity assessment and industrial symbiosis', file: 'modules/m2/circularity-assessment-and-industrial-symbiosis.pdf', pages: 15 },
          { tag: 'L3', title: 'Academic resources: full reading list', file: 'modules/m2/academic-resources.docx', format: 'DOCX' },
        ],
      },
      {
        ...PRACTICE,
        docs: [
          { tag: 'Q1', title: 'Study questions Part I', file: 'modules/m2/study-questions-part-1.docx', format: 'DOCX', goesWith: 1 },
          { tag: 'Q2', title: 'Study questions Part II', file: 'modules/m2/study-questions-part-2.docx', format: 'DOCX', goesWith: 2 },
        ],
      },
    ],
    tot: { file: 'modules/m2/tot-toolkit.pdf', pages: 12 },
  },
  3: {
    groups: [
      {
        ...LECTURES,
        docs: [
          { tag: 'L1', title: 'An introduction to life cycle assessment', file: 'modules/m3/an-introduction-to-life-cycle-assessment.pdf', pages: 24 },
          { tag: 'L2', title: 'Sustainability in the construction sector', file: 'modules/m3/sustainability-in-the-construction-sector.pdf', pages: 18 },
        ],
      },
      {
        ...PRACTICE,
        docs: [
          { tag: 'A1', title: 'Challenge-based learning and project assignment', file: 'modules/m3/challenge-based-learning-and-project-assignment.pdf', pages: 9 },
        ],
      },
    ],
    tot: { file: 'modules/m3/tot-toolkit.pdf', pages: 17 },
  },
  4: {
    groups: [
      {
        ...START,
        docs: [
          { tag: 'Intro', title: 'Introduction to the module', file: 'modules/m4/introduction-to-the-module.pdf', pages: 102 },
        ],
      },
    ],
    tot: { file: 'modules/m4/tot-toolkit.pdf', pages: 14 },
  },
  5: {
    groups: [
      {
        ...LECTURES,
        docs: [
          { tag: 'L1', title: 'Building physics', file: 'modules/m5/building-physics.pdf', pages: 248 },
          { tag: 'L2', title: 'Conduction', file: 'modules/m5/conduction.pdf', pages: 11 },
          { tag: 'L3', title: 'Moisture calculations', file: 'modules/m5/moisture-calculations.pdf', pages: 31 },
          { tag: 'L4', title: 'Energy efficiency in buildings', file: 'modules/m5/energy-efficiency-in-buildings.pdf', pages: 62 },
          { tag: 'L5', title: 'The Passivhaus principles', file: 'modules/m5/the-passivhaus-principles.pdf', pages: 2 },
        ],
      },
      {
        ...PRACTICE,
        docs: [
          { tag: 'A1', title: 'Assignment 1', file: 'modules/m5/assignment-1.pdf', pages: 2 },
          { tag: 'A2', title: 'Assignment 2', file: 'modules/m5/assignment-2.pdf', pages: 7 },
        ],
      },
    ],
    tot: { file: 'modules/m5/tot-toolkit.pdf', pages: 11 },
  },
  6: {
    groups: [
      {
        ...START,
        docs: [
          { tag: 'Quiz', title: 'Initial questionnaire', file: 'modules/m6/initial-questionnaire.pdf', pages: 2 },
        ],
      },
      {
        ...LECTURES,
        docs: [
          { tag: 'L1', title: 'Introduction to smart buildings', file: 'modules/m6/introduction-to-smart-buildings.pdf', pages: 2 },
          { tag: 'L2', title: 'EU regulatory framework for smart buildings', file: 'modules/m6/eu-regulatory-framework-for-smart-buildings.pdf', pages: 3 },
          { tag: 'L3', title: 'Smart buildings seminar', file: 'modules/m6/smart-buildings-seminar.pdf', pages: 13 },
          { tag: 'L4', title: 'Examples of smart buildings', file: 'modules/m6/examples-of-smart-buildings.pdf', pages: 6 },
          { tag: 'L5', title: 'Smart buildings booklet', file: 'modules/m6/smart-buildings-booklet.pdf', pages: 13 },
        ],
      },
    ],
    tot: { file: 'modules/m6/tot-toolkit.pdf', pages: 17 },
  },
};
