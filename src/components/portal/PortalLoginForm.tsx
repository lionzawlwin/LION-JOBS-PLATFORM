'use client';

import { useState } from 'react';
import { Loader2, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';

export function PortalLoginForm({
  requestLinkApiPath,
  errorParam,
}: {
  requestLinkApiPath: '/api/company-portal/request-link' | '/api/candidate-portal/request-link';
  errorParam?: string | null;
}) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(requestLinkApiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setError('Too many requests. Please wait a few minutes and try again.');
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center dark:border-emerald-700/30 dark:bg-emerald-900/10">
        <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          If that email is associated with an account, a sign-in link has been sent. Check your inbox — the link expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorParam === 'invalid_or_expired' && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700 dark:border-red-700/30 dark:bg-red-900/10 dark:text-red-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          That sign-in link is invalid or has expired. Request a new one below.
        </div>
      )}
      <div className="relative">
        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
        />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !email}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
        Send sign-in link
      </button>
    </form>
  );
}
