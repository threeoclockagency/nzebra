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
  /** SEO meta description (<=155 chars). */
  description: string;
}

export const modules: CourseModule[] = [
  {
    number: 1,
    slug: 'climate-change-adaptation',
    title: 'Climate resilience: Adapting buildings to climate change',
    description:
      'Module 1 of the nZEBRA course: adapting buildings and urban energy systems to climate change and extreme weather for greater resilience.',
  },
  {
    number: 2,
    slug: 'circular-economy',
    title: 'Circular economy and symbiosis',
    description:
      'Module 2 of the nZEBRA course: circular economy and industrial symbiosis in construction, from recycling to resource-efficient materials.',
  },
  {
    number: 3,
    slug: 'life-cycle-assessment-of-buildings',
    title: 'Green construction: Life cycle assessment of buildings',
    description:
      'Module 3 of the nZEBRA course: life cycle assessment for green construction, measuring the environmental impact of buildings and materials.',
  },
  {
    number: 4,
    slug: 'energy-production',
    title: 'Energy and buildings: Advanced energy management and production',
    description:
      'Module 4 of the nZEBRA course: advanced energy management and renewable energy production for nearly zero-energy and smart buildings.',
  },
  {
    number: 5,
    slug: 'indoor-climate-heating-cooling-ventilation',
    title: 'Energy and buildings: Indoor climate, heating, cooling and ventilation systems',
    description:
      'Module 5 of the nZEBRA course: indoor climate and the heating, cooling and ventilation systems that keep buildings comfortable and efficient.',
  },
  {
    number: 6,
    slug: 'smart-buildings',
    title: 'Smart buildings: Modern technologies and systems integration',
    description:
      'Module 6 of the nZEBRA course: smart building technologies, the Smart Readiness Indicator and system integration for energy efficiency.',
  },
];
