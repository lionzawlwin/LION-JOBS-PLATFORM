// Shared deep-link utility — import from any 'use client' component.
// All functions read navigator/window and MUST only be called from event
// handlers (user-gesture context), never at module load or during SSR.

export type DeepLinkConfig = {
  androidIntent: string | null;   // intent:// URL for Android Chrome
  iosScheme:     string | null;   // custom URI scheme for iOS
  webUrl:        string;          // web fallback — desktop always; iOS/Android fallback
};

// ── Device detection ──────────────────────────────────────────────
function isMobile():  boolean { return /android|iphone|ipad|ipod/i.test(navigator.userAgent); }
function isAndroid(): boolean { return /android/i.test(navigator.userAgent); }
function isIOS():     boolean { return /iphone|ipad|ipod/i.test(navigator.userAgent); }

// ── Core routing function ─────────────────────────────────────────
//
//  ANDROID
//    window.location.replace(intentUrl) — Chrome intercepts intent:// at
//    the navigation layer and fires the Android Intent system.
//    App installed   → app opens, current tab preserved.
//    App not installed → Chrome follows browser_fallback_url in same tab.
//
//  IOS
//    window.location.href = iosScheme — iOS hands off to the registered app.
//    App installed   → app opens, visibilitychange/blur fire → timer cancelled.
//    App not installed → 1.5 s timer opens webUrl in a new tab.
//
//  DESKTOP
//    window.open(webUrl, '_blank') — intent schemes never attempted.
//
export function openDeepLink(
  e: { preventDefault(): void; stopPropagation(): void },
  { androidIntent, iosScheme, webUrl }: DeepLinkConfig,
): void {
  e.preventDefault();
  e.stopPropagation();

  if (isMobile()) {
    if (isAndroid() && androidIntent) {
      window.location.replace(androidIntent);

    } else if (isIOS() && iosScheme) {
      window.location.href = iosScheme;

      const timer = setTimeout(() => {
        if (!document.hidden) window.open(webUrl, '_blank', 'noopener,noreferrer');
      }, 1500);

      const cancel = () => {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('blur', cancel);
      };
      const onVis = () => { if (document.hidden) cancel(); };
      document.addEventListener('visibilitychange', onVis, { once: true });
      window.addEventListener('blur',               cancel, { once: true });

    } else {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }

  } else {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  }
}

// ── Lion Jobs Agency — canonical deep-link configs ────────────────
//
// Single source of truth for every social button on the site.
// Update handles/IDs here and all components get the fix automatically.
//
// Numeric Facebook Page ID : 61553739861091
// Telegram username        : lionjobsagency
// Phone number             : +959979333333
//
export const LION_LINKS = {

  // ── Community / channel links ─────────────────────────────────
  // Used in: JoinCommunity, SocialFloatWidget

  telegramChannel: {
    androidIntent: 'intent://resolve?domain=lionjobsagency#Intent;scheme=tg;package=org.telegram.messenger;S.browser_fallback_url=https%3A%2F%2Ft.me%2Flionjobsagency;end',
    iosScheme:     'tg://resolve?domain=lionjobsagency',
    webUrl:        'https://t.me/lionjobsagency',
  },

  viberCommunity: {
    // S.browser_fallback_url is double-encoded (% → %25) as required by the intent spec
    androidIntent: 'intent://chat?number=%2B959979333333#Intent;scheme=viber;package=com.viber.voip;S.browser_fallback_url=https%3A%2F%2Finvite.viber.com%2F%3Fg2%3DAQA9D%252F4QWxGo0lbDjm%252BjVbAxdDgw3i0Ns1mic8G%252Bu6DIWheU45OXcSbwFtaYkd04;end',
    iosScheme:     'viber://chat?number=%2B959979333333',
    webUrl:        'https://invite.viber.com/?g2=AQA9D%2F4QWxGo0lbDjm%2BjVbAxdDgw3i0Ns1mic8G%2Bu6DIWheU45OXcSbwFtaYkd04',
  },

  facebookPage: {
    androidIntent: 'intent://page/61553739861091#Intent;scheme=fb;package=com.facebook.katana;S.browser_fallback_url=https%3A%2F%2Fwww.facebook.com%2F61553739861091;end',
    iosScheme:     'fb://page/61553739861091',
    webUrl:        'https://www.facebook.com/61553739861091',
  },

  // ── Direct message / follow-up links ─────────────────────────
  // Used in: SuccessModal

  telegramDM: {
    androidIntent: 'intent://msg?to=%2B959979333333#Intent;scheme=tg;package=org.telegram.messenger;S.browser_fallback_url=https%3A%2F%2Ft.me%2F%2B959979333333;end',
    iosScheme:     'tg://msg?to=%2B959979333333',
    webUrl:        'https://t.me/+959979333333',
  },

  viberDM: {
    androidIntent: 'intent://chat?number=%2B959979333333#Intent;scheme=viber;package=com.viber.voip;S.browser_fallback_url=https%3A%2F%2Fwww.viber.com%2Fdownload%2F;end',
    iosScheme:     'viber://chat?number=%2B959979333333',
    webUrl:        'https://www.viber.com/download/',
  },

  messenger: {
    androidIntent: 'intent://user-thread/61553739861091#Intent;scheme=fb-messenger;package=com.facebook.orca;S.browser_fallback_url=https%3A%2F%2Fm.me%2Flionjobsagency;end',
    iosScheme:     'fb-messenger://user-thread/61553739861091',
    webUrl:        'https://m.me/lionjobsagency',
  },

} satisfies Record<string, DeepLinkConfig>;
