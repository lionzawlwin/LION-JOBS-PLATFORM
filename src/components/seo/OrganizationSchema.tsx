const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

// Layer 20 (AEO/AI-crawler readiness): site-wide Organization + WebSite
// JSON-LD. JobPostingSchema.tsx already covers individual listings for
// Google for Jobs; this is the entity-level signal that's been missing --
// it's what lets an AI answer engine (ChatGPT, Perplexity, Claude) resolve
// "Lion Jobs Agency" to a real, identifiable organization rather than just
// unstructured page text, and what a llms.txt file alone can't provide.
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EmploymentAgency',
        '@id': `${SITE_URL}/#organization`,
        name: 'Lion Jobs Agency',
        url: SITE_URL,
        description:
          "Myanmar's premier job agency platform. Search hundreds of curated positions across engineering, design, marketing, and more.",
        areaServed: {
          '@type': 'Country',
          name: 'Myanmar',
        },
      },
      {
        // No SearchAction: /candidate's search is client-side state with
        // no URL query-param sync today, so a SearchAction target here
        // would claim a deep-link capability that doesn't actually exist.
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Lion Jobs Agency',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
