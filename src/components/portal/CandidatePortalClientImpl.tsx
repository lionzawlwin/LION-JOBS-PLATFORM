'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, UserCircle, LogOut, Calendar, MapPin, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';

interface ApplicationSummary {
  id: string;
  position: string;
  company: string | null;
  stage: string;
  appliedAt: string;
  interviewDate: string | null;
  interviewLocation: string | null;
}

interface MeResponse {
  name: string;
  applications: ApplicationSummary[];
}

const STAGE_STYLE: Record<string, string> = {
  Applied:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Shortlisted:  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  Interview:    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  Hired:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const STAGE_KEYS: Record<string, TranslationKey> = {
  Applied:     'candp_stage_applied',
  Shortlisted: 'candp_stage_shortlisted',
  Interview:   'candp_stage_interview',
  Hired:       'candp_stage_hired',
};

export function CandidatePortalClientImpl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, toggleLang } = useLanguage();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fires once per real login (the ?login=success param verify/route.ts
  // adds), not on every subsequent page view -- stripped from the URL
  // immediately after so a refresh doesn't re-fire it.
  useEffect(() => {
    if (searchParams.get('login') === 'success') {
      trackEvent('portal_login', { portal: 'candidate' });
      router.replace('/candidate/portal');
    }
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/candidate-portal/me');
        if (res.status === 401) { router.replace('/candidate/portal/login'); return; }
        if (!res.ok) { if (!cancelled) setError(true); return; }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleLogout() {
    await fetch('/api/candidate-portal/logout', { method: 'POST' });
    router.replace('/candidate/portal/login');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{t('cp_load_error')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><UserCircle size={18} /></span>
            <div>
              <h1 className="text-sm font-bold text-foreground">{data.name}</h1>
              <p className="text-xs text-muted-foreground">{t('candp_applications_title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              aria-label="Switch language"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <Languages size={13} /> {t('nav_lang_toggle')}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <LogOut size={13} /> {t('cp_sign_out')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-4 py-8 sm:px-6">
        {data.applications.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t('candp_no_applications')}
          </p>
        ) : (
          data.applications.map((app) => (
            <div key={app.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{app.position}</p>
                  {app.company && <p className="text-xs text-muted-foreground">{app.company}</p>}
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STAGE_STYLE[app.stage] ?? 'bg-muted text-muted-foreground')}>
                  {STAGE_KEYS[app.stage] ? t(STAGE_KEYS[app.stage]) : app.stage}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar size={11} /> {t('candp_applied_on').replace('{date}', new Date(app.appliedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}</span>
                {app.interviewDate && (
                  <span className="flex items-center gap-1"><Calendar size={11} /> {t('candp_interview_on').replace('{date}', new Date(app.interviewDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}</span>
                )}
                {app.interviewLocation && (
                  <span className="flex items-center gap-1"><MapPin size={11} /> {app.interviewLocation}</span>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
