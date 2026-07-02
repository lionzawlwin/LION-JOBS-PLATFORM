import type { NextConfig } from 'next';

// next-auth/react reads process.env.NEXTAUTH_URL at MODULE EVALUATION time via
// parseUrl(). If the var is absent or an empty string the parseUrl() call does
// `new URL('')` which throws TypeError: Invalid URL and aborts static generation
// for every page that SSR-renders <SessionProvider> (including /_not-found via
// the root layout).  Set a safe fallback here — before any modules load — so the
// URL is always valid.  Vercel's own NEXTAUTH_URL env var takes precedence when set.
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'https://lion-jobs-platform.vercel.app';
}

const nextConfig: NextConfig = {
  // ── Images ────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    // Myanmar mobile-first breakpoints: 360 (budget), 414 (iPhone), 768 (tablet), 1280 (desktop)
    deviceSizes: [360, 414, 768, 1280, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256],
    minimumCacheTTL: 86_400, // 24 h CDN cache for optimised images
  },

  // ── Security / perf ───────────────────────────────────────────
  compress: true,
  poweredByHeader: false,

  // ── Headers ───────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Prefetch DNS for Google Fonts and APIs used server-side
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Immutable cache for hashed chunks — production only. Turbopack dev
      // chunk filenames aren't guaranteed to change across recompiles, so
      // this header in dev pins the browser's HTTP cache to stale content
      // for a year regardless of how many times the page is refreshed.
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/_next/static/(.*)',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
              ],
            },
          ]
        : []),
      {
        // ISR pages — serve stale while regenerating
        source: '/jobs/(.*)',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        // Short TTL for the jobs JSON feed (SWR client re-fetches this)
        source: '/api/jobs',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
