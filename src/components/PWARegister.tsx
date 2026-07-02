'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // A service worker registered during local dev cache-first-serves stale
      // /_next/static chunks forever, surviving dev server restarts and
      // causing hydration mismatches unrelated to the current source. Only
      // ever register in production; unregister any leftover dev registration.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => console.debug('[SW] Registered', reg.scope))
      .catch((err) => console.error('[SW] Registration failed', err));
  }, []);

  return null;
}
