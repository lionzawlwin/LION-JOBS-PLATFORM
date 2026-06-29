'use client';

import { useState } from 'react';
import { Mail, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export function EmailAlerts() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t('email_alerts_error'));
      }
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('email_alerts_error'));
      setStatus('error');
    }
  }

  return (
    <section className="border-t border-border/50 bg-gradient-to-r from-brand-50/60 to-blue-50/60 py-10 dark:from-brand-950/20 dark:to-blue-950/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <Mail size={22} />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-foreground">{t('email_alerts_title')}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('email_alerts_sub')}</p>
          </div>

          <div className="w-full sm:w-auto sm:min-w-[320px]">
            {status === 'success' ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-700/30 dark:bg-green-900/20 dark:text-green-400">
                <Bell size={16} className="shrink-0" />
                {t('email_alerts_success')}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_alerts_placeholder')}
                  required
                  disabled={status === 'loading'}
                  className="min-w-0 flex-1"
                />
                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  className="shrink-0 bg-brand-600 text-white hover:bg-brand-700"
                >
                  {status === 'loading' ? '…' : t('email_alerts_btn')}
                </Button>
              </form>
            )}
            {status === 'error' && errorMsg && (
              <p className="mt-1.5 text-xs text-red-500">{errorMsg}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
