import Link from 'next/link';
import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react';

const CONTACT = {
  address: 'No. 29, Room 3A, 2nd Floor, Kyay Tine Su 1st Street, Pain Nae Kone Ward, Insein Township, Yangon.',
  phone:   '09979333333',
  phone2:  '09428954289',
  email:   'lionzawlwin@gmail.com',
};

const QUICK_LINKS = [
  { label: 'Browse All Jobs',  href: '/#jobs' },
  { label: 'Drop Your CV',     href: '/drop-cv' },
  { label: 'Resume Builder',   href: '/resume-builder' },
  { label: 'My Applications',  href: '/my-applications' },
];

const CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Finance', 'Healthcare', 'Remote'];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-brand-700 to-brand-950 text-white">
      {/* Myanmar lotus pattern overlay */}
      <div className="absolute inset-0 myanmar-pattern opacity-[0.07]" aria-hidden />
      {/* Top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* ── Brand column ── */}
          <div className="lg:col-span-1">
            <Link href="/" className="group inline-flex items-center gap-2.5 font-bold text-xl text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-500 text-brand-950 text-base shadow-lg shadow-gold-500/25 group-hover:shadow-gold-500/40 group-hover:scale-105 transition-all duration-200">
                🦁
              </div>
              <span>
                Lion{' '}
                <span className="text-gradient-gold">Jobs</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Myanmar&apos;s premier AI-powered recruitment agency. We architect careers and build the teams that define Myanmar&apos;s next decade.
            </p>
            {/* CTA chip */}
            <Link
              href="/drop-cv"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 transition-colors"
            >
              Drop Your CV <ArrowRight size={12} />
            </Link>
          </div>

          {/* ── Quick Links ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-white/60 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Top Categories ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Top Categories
            </h3>
            <ul className="space-y-2.5 text-sm">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <Link href="/#jobs" className="text-white/60 hover:text-white transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Contact
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-white/60">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gold-400/70" />
                <span className="leading-relaxed">{CONTACT.address}</span>
              </li>
              <li>
                <a href={`tel:${CONTACT.phone}`} className="flex items-center gap-2.5 text-white/60 hover:text-white transition-colors">
                  <Phone size={14} className="shrink-0 text-gold-400/70" />
                  {CONTACT.phone}
                </a>
              </li>
              <li>
                <a href={`tel:${CONTACT.phone2}`} className="flex items-center gap-2.5 text-white/60 hover:text-white transition-colors">
                  <Phone size={14} className="shrink-0 text-gold-400/70" />
                  {CONTACT.phone2}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2.5 text-white/60 hover:text-white transition-colors break-all">
                  <Mail size={14} className="shrink-0 text-gold-400/70" />
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>© {new Date().getFullYear()} Lion Jobs Agency · Yangon, Myanmar</p>
          <p className="text-white/20">AI-Powered · Human-Verified · Free for Candidates</p>
        </div>
      </div>
    </footer>
  );
}
