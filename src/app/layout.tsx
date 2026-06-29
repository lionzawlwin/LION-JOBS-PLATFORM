import type { Metadata } from 'next';
import { Geist, Geist_Mono, Padauk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SocialFloatWidget } from '@/components/ui/SocialFloatWidget';
import { PWARegister } from '@/components/PWARegister';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

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
    "Myanmar's premier job agency platform. Search hundreds of curated positions across engineering, design, marketing, and more.",
  keywords: 'jobs myanmar, job agency, careers, employment, lion jobs',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Lion Jobs Agency',
    description: 'Find your dream job in Myanmar',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lion Jobs',
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
          <LanguageProvider>
            {children}
            <SocialFloatWidget />
            <Analytics />
            <PWARegister />
            <Toaster
              position="bottom-right"
              richColors
              toastOptions={{
                classNames: {
                  toast: 'rounded-xl shadow-lg',
                },
              }}
            />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
