import type { Metadata } from 'next';
import { Geist, Geist_Mono, Padauk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SocialFloatWidget } from '@/components/ui/SocialFloatWidget';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// Padauk — designed for Myanmar Unicode (Burmese script).
// Loaded with preload:false so it doesn't block the main bundle;
// the browser fetches it on-demand when Myanmar characters are encountered.
const padauk = Padauk({
  variable: '--font-padauk',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'Lion Jobs Agency | Find Your Dream Job in Myanmar',
  description:
    'Myanmar\'s premier job agency platform. Search hundreds of curated positions across engineering, design, marketing, and more.',
  keywords: 'jobs myanmar, job agency, careers, employment, lion jobs',
  openGraph: {
    title: 'Lion Jobs Agency',
    description: 'Find your dream job in Myanmar',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${padauk.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <SocialFloatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
