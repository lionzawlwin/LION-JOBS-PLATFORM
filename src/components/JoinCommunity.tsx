'use client';

import { openDeepLink, LION_LINKS, type DeepLinkConfig } from '@/lib/deepLink';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';

type Channel = {
  name:            string;
  taglineKey:      TranslationKey;
  descriptionKey:  TranslationKey;
  ctaKey:          TranslationKey;
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
    name:            'Telegram',
    taglineKey:      'jc2_tag_channel',
    descriptionKey:  'jc2_telegram_desc',
    ctaKey:          'jc2_telegram_cta',
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
  {
    name:            'WhatsApp',
    taglineKey:      'jc2_tag_channel',
    descriptionKey:  'jc2_whatsapp_desc',
    ctaKey:          'jc2_whatsapp_cta',
    link:        LION_LINKS.whatsappChannel,
    bg:          'bg-[#25D366]',
    hoverBg:     'hover:bg-[#1eba57]',
    ring:        'ring-[#25D366]/30',
    lightBg:     'bg-[#E8FAF0]',
    textColor:   'text-[#25D366]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    name:            'Facebook',
    taglineKey:      'jc2_tag_page',
    descriptionKey:  'jc2_facebook_desc',
    ctaKey:          'jc2_facebook_cta',
    link:        LION_LINKS.facebookPage,
    bg:          'bg-[#1877F2]',
    hoverBg:     'hover:bg-[#1060cc]',
    ring:        'ring-[#1877F2]/30',
    lightBg:     'bg-[#E7F0FD]',
    textColor:   'text-[#1877F2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name:            'Viber',
    taglineKey:      'jc2_tag_community',
    descriptionKey:  'jc2_viber_desc',
    ctaKey:          'jc2_viber_cta',
    link:        LION_LINKS.viberCommunity,
    bg:          'bg-[#7360F2]',
    hoverBg:     'hover:bg-[#5e4dd4]',
    ring:        'ring-[#7360F2]/30',
    lightBg:     'bg-[#EEF0FD]',
    textColor:   'text-[#7360F2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
        <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.03 4.444.36 7.314.282 10.89c-.079 3.576-.172 10.27 6.327 12.075h.006l-.006 2.771s-.042.995.623 1.2c.795.247 1.263-.506 2.024-1.318.418-.452.995-1.116 1.43-1.616 3.937.33 6.963-.424 7.308-.537.794-.257 5.288-.831 6.021-6.783.755-6.127-.366-9.998-2.394-11.73l-.001-.001c-.604-.547-3.033-2.19-7.915-2.216a16.5 16.5 0 0 0-2.307.267zM11.46 1.8h.012c4.368.024 6.527 1.415 7.038 1.878 1.726 1.47 2.659 4.95 2.011 10.203-.613 5.002-4.283 5.341-4.951 5.556-.293.095-3.002.76-6.384.537 0 0-2.531 3.043-3.317 3.83-.123.124-.264.174-.358.15-.132-.035-.168-.195-.166-.43l.022-3.813c-.001 0-.001 0 0 0-5.525-1.534-5.44-7.272-5.37-10.422.079-3.15.639-5.638 2.326-7.275 2.005-1.83 5.775-2.19 9.137-2.214zm.245 3.024c-.286 0-.518.232-.518.518s.232.518.518.518c1.496.006 2.706.493 3.699 1.49.994.998 1.49 2.21 1.494 3.712 0 .286.232.518.518.518s.518-.232.518-.518c-.005-1.784-.604-3.268-1.793-4.462-1.188-1.195-2.67-1.782-4.436-1.776zm-2.89.993c-.137.004-.265.059-.368.172l-.43.468c-.346.376-.512.789-.512 1.265.004.372.112.73.328 1.083.648 1.074 1.434 2.027 2.342 2.84.91.813 1.953 1.486 3.102 2.009.38.178.762.268 1.138.268h.003c.477 0 .888-.174 1.249-.516l.449-.434c.25-.241.25-.626 0-.867l-1.776-1.776c-.25-.25-.627-.25-.876 0l-.522.521c-.101.102-.231.152-.368.152-.098 0-.195-.028-.28-.085-.657-.42-1.25-.913-1.756-1.464-.507-.551-.937-1.178-1.275-1.87a.668.668 0 0 1-.069-.293c0-.134.05-.264.15-.364l.522-.521c.25-.25.25-.626 0-.877L9.181 5.95a.618.618 0 0 0-.366-.133zm3.141 1.193c-.286 0-.518.232-.518.518s.232.518.518.518c.678.007 1.228.234 1.69.7.463.462.69 1.015.696 1.697 0 .286.232.518.518.518s.518-.232.518-.518c-.008-.964-.33-1.77-.98-2.425-.651-.654-1.454-.994-2.442-1.008z" />
      </svg>
    ),
  },
];

export function JoinCommunity() {
  const { t } = useLanguage();
  return (
    <section className="my-14 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <span className="mb-3 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-700 dark:bg-brand-600/10 dark:text-brand-400">
            {t('jc2_free_alerts_badge')}
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {t('jc2_never_miss')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('jc2_join_channels_sub')}
          </p>
        </div>

        {/* Channel cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <p className={`text-xs font-semibold ${ch.textColor}`}>{t(ch.taglineKey)}</p>
                </div>
              </div>

              {/* Description */}
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                {t(ch.descriptionKey)}
              </p>

              {/* CTA */}
              <span
                className={`mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors ${ch.bg} ${ch.hoverBg}`}
              >
                {t(ch.ctaKey)}
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
          {t('jc2_free_label')} &nbsp;·&nbsp; {t('jc2_no_spam')} &nbsp;·&nbsp; {t('jc2_unsub_anytime')}
        </p>
      </div>
    </section>
  );
}
