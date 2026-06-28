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
    name:        'Facebook',
    tagline:     'Official Page',
    description: 'Like our page for daily job posts, career tips, and company news.',
    cta:         'Follow on Facebook',
    link:        LION_LINKS.facebookPage,
    bg:          'bg-[#1877F2]',
    hoverBg:     'hover:bg-[#1565C0]',
    ring:        'ring-[#1877F2]/30',
    lightBg:     'bg-[#E7F0FD]',
    textColor:   'text-[#1877F2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    ),
  },
  {
    name:        'Viber',
    tagline:     'Community',
    description: 'Join our Viber community — instant job alerts straight to your phone.',
    cta:         'Join Viber Community',
    link:        LION_LINKS.viberCommunity,
    bg:          'bg-[#7360F2]',
    hoverBg:     'hover:bg-[#5E4DD6]',
    ring:        'ring-[#7360F2]/30',
    lightBg:     'bg-[#F0EEFE]',
    textColor:   'text-[#7360F2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M11.4 0C5.5.3 1 4.2.2 10 0 11.3 0 12.7.2 14c.9 5.6 5.7 9.7 11.4 9.9V27h.1l2.7-2.7c5.1-.5 9.1-4.2 9.8-9.3.2-1.3.2-2.7 0-4C23.2 4.5 17.9.3 11.4 0zm5.1 16.1c-.2.5-.5.9-.9 1.2-.3.3-.7.4-1 .5-1.1.3-2.2 0-3-.5-1.4-.8-2.7-1.9-3.8-3.1-1-1.1-1.9-2.4-2.5-3.8-.3-.7-.4-1.4-.3-2.1.1-.5.3-1 .7-1.4.4-.4.8-.7 1.3-.8.2 0 .3 0 .5.1.2.1.3.2.4.4l1.4 2c.1.2.2.4.1.6-.1.2-.2.4-.3.5l-.5.5c0 .1-.1.1-.1.2.1.2.2.4.3.6.5.9 1.2 1.7 2 2.3.2.2.5.4.7.5.1.1.2.1.3 0l.5-.5c.2-.2.4-.3.6-.3.2 0 .4.1.5.2l2 1.4c.2.1.3.3.4.5s.1.3-.1.5zm-1.4-5.2c0 .3-.2.5-.5.5s-.5-.2-.5-.5c0-1.4-1.1-2.5-2.5-2.5-.3 0-.5-.2-.5-.5s.2-.5.5-.5c1.9 0 3.5 1.6 3.5 3.5zm2.5.1c0 .3-.2.5-.5.5s-.5-.2-.5-.5c0-3.3-2.7-6-6-6-.3 0-.5-.2-.5-.5s.2-.5.5-.5c3.9 0 7 3.1 7 7z" />
      </svg>
    ),
  },
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
      <div className="mx-auto max-w-4xl">

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

        {/* Channel cards — <button> so no default <a> navigation competes with the deep-link handler */}
        <div className="grid gap-4 sm:grid-cols-3">
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
