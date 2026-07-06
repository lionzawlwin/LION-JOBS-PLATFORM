import { NextResponse } from 'next/server';

const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

// Layer 20 (AEO/AI-crawler readiness): llms.txt (https://llmstxt.org/) gives
// AI answer engines (ChatGPT, Perplexity, Claude, etc.) a concise, curated
// map of the site instead of making them infer structure from rendered
// HTML. Static, no DB calls -- avoids baking a job/company count into a
// cached text file that would go stale (the same "don't claim a number you
// can't stand behind" rule Layer 18 applied to the homepage).
const LLMS_TXT = `# Lion Jobs Agency

> Myanmar's premier job recruitment agency platform. Candidates search and apply to curated positions across engineering, design, marketing, and more, at zero cost. Employers post roles and manage hiring through a dedicated portal.

Lion Jobs Agency operates as a recruitment agency, not a raw job-listing aggregator -- every listing is sourced and vetted by Lion Jobs staff, and individual job postings carry Schema.org JobPosting structured data for accurate parsing.

## For candidates
- [Job board](${SITE_URL}/candidate): search and filter open positions by keyword, category, location, and salary
- [Drop a CV](${SITE_URL}/drop-cv): speculative application for candidates without a specific listing in mind
- [Resume builder](${SITE_URL}/resume-builder): free tool to build a formatted resume
- [Application tracker](${SITE_URL}/my-applications): candidates can check the status of applications already submitted

## For employers
- [Employer portal entry](${SITE_URL}/company): information for companies looking to hire through the agency

## Structure
- Individual job listings live at ${SITE_URL}/jobs/[slug] and carry JobPosting structured data (title, location, salary, employment type).
- Individual company profiles live at ${SITE_URL}/companies/[slug].
- A full, always-current list of live job URLs is published at ${SITE_URL}/sitemap.xml.
`;

export async function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
