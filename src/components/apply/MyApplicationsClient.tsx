'use client';

import { useState } from 'react';
import { Search, CheckCircle2, Clock, XCircle, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { AntiBypassConsentModal } from './AntiBypassConsentModal';

interface ApplicationRecord {
  id: string;
  name: string;
  position: string;
  company: string;
  stage: string;
  appliedAt: string;
  stageUpdatedAt: string;
  needsConsent?: boolean;
  interviewLocation?: string;
  interviewerContact?: string;
}

type IconComponent = React.ComponentType<{ size?: number }>;

const STAGE_META: Record<string, { icon: IconComponent; color: string; label: string }> = {
  Applied:     { icon: Clock,         color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',     label: 'Applied' },
  Shortlisted: { icon: Star,          color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30', label: 'Shortlisted' },
  Interview:   { icon: CheckCircle2,  color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30', label: 'Interview' },
  Hired:       { icon: CheckCircle2,  color: 'text-green-600 bg-green-50 dark:bg-green-900/30',   label: 'Hired' },
  Rejected:    { icon: XCircle,       color: 'text-red-600 bg-red-50 dark:bg-red-900/30',         label: 'Not Selected' },
};

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function MyApplicationsClient() {
  const { t } = useLanguage();
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<ApplicationRecord[] | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [consentTarget, setConsentTarget] = useState<string | null>(null);
  // The query that actually produced the currently-displayed `results` —
  // frozen at fetch time so the consent modal always verifies identity
  // against the query that surfaced this row, not whatever the user may
  // have since typed into the still-editable search box.
  const [resultsQuery, setResultsQuery] = useState('');

  async function handleCheck(overrideQuery?: string) {
    const q = (overrideQuery ?? query).trim();
    if (q.length < 5) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res  = await fetch(`/api/apply/status?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
      } else {
        setResults(data.results ?? []);
        setResultsQuery(q);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">{t('status_title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('status_privacy')}</p>
      </div>

      {/* Search box */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            placeholder={t('status_placeholder')}
            className="w-full rounded-xl border border-border bg-background py-3 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        <button
          onClick={() => handleCheck()}
          disabled={loading || query.trim().length < 5}
          className={cn(
            'shrink-0 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50',
          )}
        >
          {loading ? '…' : t('status_check_btn')}
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* No results */}
      {results !== null && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">{t('status_no_results')}</p>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <ul className="space-y-4">
          {results.map((r) => {
            const meta = STAGE_META[r.stage] ?? STAGE_META['Applied'];
            const Icon = meta.icon;
            return (
              <li key={r.id} className="glass-card rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-foreground">{r.position}</p>
                    <p className="text-sm text-muted-foreground">{r.company}</p>
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shrink-0', meta.color)}>
                    <Icon size={12} />
                    {meta.label}
                  </span>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span>Applied: {fmtDate(r.appliedAt)}</span>
                  {r.stageUpdatedAt && <span>Updated: {fmtDate(r.stageUpdatedAt)}</span>}
                </div>
                {r.stage === 'Interview' && (
                  <div className="mt-3 border-t border-border/50 pt-3 text-xs">
                    {r.needsConsent ? (
                      <button
                        onClick={() => setConsentTarget(r.id)}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        View Interview Details
                      </button>
                    ) : r.interviewLocation ? (
                      <p className="text-muted-foreground">
                        📍 {r.interviewLocation}{r.interviewerContact ? ` · ${r.interviewerContact}` : ''}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {consentTarget && (
        <AntiBypassConsentModal
          applicationId={consentTarget}
          query={resultsQuery}
          onClose={() => setConsentTarget(null)}
          onAgreed={() => { setConsentTarget(null); handleCheck(resultsQuery); }}
        />
      )}
    </div>
  );
}
