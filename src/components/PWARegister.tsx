'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => console.debug('[SW] Registered', reg.scope))
        .catch((err) => console.error('[SW] Registration failed', err));
    }
  }, []);

  return null;
}
