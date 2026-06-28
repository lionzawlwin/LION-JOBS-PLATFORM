import Link from 'next/link';
import { Briefcase, MapPin, Phone, Mail, MessageCircle } from 'lucide-react';

const CONTACT = {
  address: 'No. 29, Room 3A, 2nd Floor, Kyay Tine Su 1st Street, Pain Nae Kone Ward, Insein Township, Yangon.',
  phone: '09979333333',
  email: 'lionzawlwin@gmail.com',
  whatsapp: 'https://wa.me/959979333333',
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Briefcase size={15} />
              </span>
              <span>Lion <span className="text-brand-600">Jobs</span></span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Myanmar&apos;s trusted recruitment agency. We connect the right talent with the right opportunity — fast, fair, and free for candidates.
            </p>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={15} />
              Chat on WhatsApp
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Quick Links</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { label: 'Browse All Jobs', href: '/#jobs' },
                { label: 'Apply for a Job', href: '/apply' },
                { label: 'Client Dashboard', href: '/dashboard' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-muted-foreground hover:text-brand-600 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Job Categories */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Top Categories</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {['Engineering', 'Design', 'Marketing', 'Finance', 'Healthcare', 'Remote'].map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/#jobs`}
                    className="text-muted-foreground hover:text-brand-600 transition-colors"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Contact Us</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <MapPin size={15} className="mt-0.5 shrink-0 text-brand-600" />
                <span className="leading-relaxed">{CONTACT.address}</span>
              </li>
              <li>
                <a
                  href={`tel:${CONTACT.phone}`}
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-brand-600 transition-colors"
                >
                  <Phone size={15} className="shrink-0 text-brand-600" />
                  {CONTACT.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-brand-600 transition-colors break-all"
                >
                  <Mail size={15} className="shrink-0 text-brand-600" />
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Lion Jobs Agency. All rights reserved.</p>
          <p>Built with Next.js · Powered by AI</p>
        </div>
      </div>
    </footer>
  );
}
