import Link from 'next/link';
import { Briefcase } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Briefcase size={14} />
              </span>
              <span>Lion <span className="text-brand-600">Jobs</span></span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Myanmar&apos;s premier job agency. We connect top talent with world-class companies.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Platform</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/#jobs" className="text-muted-foreground hover:text-foreground transition-colors">Browse Jobs</Link></li>
              <li><Link href="/apply" className="text-muted-foreground hover:text-foreground transition-colors">Apply Now</Link></li>
              <li><Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Client Dashboard</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Yangon, Myanmar</li>
              <li>hello@lionjobs.agency</li>
              <li>+959 77 000 0000</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Lion Jobs Agency. All rights reserved.</p>
          <p>Built with Next.js · Powered by AI</p>
        </div>
      </div>
    </footer>
  );
}
