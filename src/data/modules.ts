// Single source of truth for the six course modules. Titles are the unified
// names taken from the WP3 course-content PDFs (approved). Used on the module
// pages, the nZEBRA course cards and the Resources document list.
export interface CourseModule {
  /** Module number 1–6 (WP3 ordering). */
  number: number;
  /** URL slug under /course/. */
  slug: string;
  /** Full unified title ("Lead: subtitle"). */
  title: string;
}

export const modules: CourseModule[] = [
  {
    number: 1,
    slug: 'climate-change-adaptation',
    title: 'Climate resilience: Adapting buildings to climate change',
  },
  {
    number: 2,
    slug: 'circular-economy',
    title: 'Circular economy and symbiosis',
  },
  {
    number: 3,
    slug: 'life-cycle-assessment-of-buildings',
    title: 'Green construction: Life cycle assessment of buildings',
  },
  {
    number: 4,
    slug: 'energy-production',
    title: 'Energy and buildings: Advanced energy management and production',
  },
  {
    number: 5,
    slug: 'indoor-climate-heating-cooling-ventilation',
    title: 'Energy and buildings: Indoor climate, heating, cooling and ventilation systems',
  },
  {
    number: 6,
    slug: 'smart-buildings',
    title: 'Smart buildings: Modern technologies and systems integration',
  },
];
