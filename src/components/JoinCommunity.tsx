'use client';

import { openDeepLink, LION_LINKS, type DeepLinkConfig } from '@/lib/deepLink';

type Channel = {
  name:        string;
  tagline:     string;
  description: string;
  cta:         string;
  link:        DeepLinkConfig;
  bg:          string;
  hoverBg:     string;
  ring:        string;
  lightBg:     string;
  textColor:   string;
  icon:        React.ReactNode;
};

const CHANNELS: Channel[] = [
  {
    name:        'Telegram',
    tagline:     'Channel',
    description: 'Subscribe to our channel for real-time job postings and hiring news.',
    cta:         'Join Telegram Channel',
    link:        LION_LINKS.telegramChannel,
    bg:          'bg-[#229ED9]',
    hoverBg:     'hover:bg-[#1a86bb]',
    ring:        'ring-[#229ED9]/30',
    lightBg:     'bg-[#E6F4FB]',
    textColor:   'text-[#229ED9]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z" />
      </svg>
    ),
  },
];

export function JoinCommunity() {
  return (
    <section className="my-14 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <span className="mb-3 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700 dark:bg-brand-600/10 dark:text-brand-400">
            Free Job Alerts
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Never Miss a Job Opportunity
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join our official channels and get new jobs delivered to you — daily, for free.
          </p>
        </div>

        {/* Channel card — single centred card */}
        <div className="mx-auto max-w-sm">
          {CHANNELS.map((ch) => (
            <button
              key={ch.name}
              type="button"
              onClick={(e) => openDeepLink(e, ch.link)}
              className={`group flex w-full flex-col rounded-2xl border border-border bg-card p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ring-0 hover:ring-4 ${ch.ring} cursor-pointer`}
            >
              {/* Platform icon + name */}
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ch.lightBg} ${ch.textColor}`}>
                  {ch.icon}
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">{ch.name}</p>
                  <p className={`text-xs font-semibold ${ch.textColor}`}>{ch.tagline}</p>
                </div>
              </div>

              {/* Description */}
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                {ch.description}
              </p>

              {/* CTA */}
              <span
                className={`mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors ${ch.bg} ${ch.hoverBg}`}
              >
                {ch.cta}
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-muted-foreground">
          100% free &nbsp;·&nbsp; No spam &nbsp;·&nbsp; Unsubscribe any time
        </p>
      </div>
    </section>
  );
}
