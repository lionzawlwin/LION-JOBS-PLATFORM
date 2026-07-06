'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Zap } from 'lucide-react';
import { CVUpload } from '@/components/apply/CVUpload';
import { useProfile } from '@/hooks/useProfile';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { JobCategory } from '@/types';

const CATEGORIES: JobCategory[] = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'Customer Service',
  'Healthcare',
  'Education',
  'Logistics & Distribution',
  'Other',
];

export function TalentPoolForm() {
  const { t } = useLanguage();
  const { profile, hydrated, saveProfile } = useProfile();

  const [fullName, setFullName]           = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [desiredTitle, setDesiredTitle]   = useState('');
  const [category, setCategory]           = useState<JobCategory | ''>('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [cvBase64, setCvBase64]           = useState('');
  const [cvFileName, setCvFileName]       = useState('');
  const [profileUsed, setProfileUsed]     = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);

  function applyProfile() {
    if (!profile) return;
    setFullName(profile.name  || '');
    setEmail(profile.email    || '');
    setPhone(profile.phone    || '');
    setProfileUsed(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cvBase64 || !cvFileName) {
      setError('Please upload your CV to continue.');
      return;
    }
    if (!category) {
      setError('Please select a desired category.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email:           email || undefined,
          phone,
          position:        desiredTitle,
          jobId:           'GENERAL-POOL',
          mode:            'cv',
          cvBase64,
          cvFileName,
          expectedSalary:  expectedSalary || undefined,
          desiredCategory: category,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);

      saveProfile({ name: fullName, email, phone });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('talent_pool_success_title')}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t('talent_pool_success_sub')}</p>
        </div>
      </div>
    );
  }

  const showQuickApply = hydrated && !!profile && !profileUsed;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Easy Apply banner */}
      {showQuickApply && (
        <button
          type="button"
          onClick={applyProfile}
          className="flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-left transition-colors hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-600/10 dark:hover:bg-brand-600/20"
        >
          <Zap size={18} className="shrink-0 text-brand-600" />
          <div>
            <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Quick Apply — use saved profile</p>
            <p className="text-xs text-muted-foreground">Tap to fill name, email &amp; phone from your last application</p>
          </div>
        </button>
      )}

      {/* Full Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          {t('form_full_name')} <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
          placeholder="Aung Ko Ko"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          {t('form_email')}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="aung@email.com"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          {t('form_phone')} <span className="text-danger">*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          minLength={7}
          placeholder="09 1234 5678"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </div>

      {/* Desired Title + Category row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-foreground">
            {t('talent_pool_desired_title')} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={desiredTitle}
            onChange={(e) => setDesiredTitle(e.target.value)}
            required
            minLength={2}
            placeholder="Software Engineer"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-foreground">
            {t('talent_pool_category')} <span className="text-danger">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as JobCategory | '')}
            required
            className={cn(
              'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600',
              !category && 'text-muted-foreground',
            )}
          >
            <option value="" disabled>Select category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expected Salary */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          {t('talent_pool_expected_salary')}
        </label>
        <input
          type="text"
          value={expectedSalary}
          onChange={(e) => setExpectedSalary(e.target.value)}
          placeholder="e.g. 800,000 MMK/month"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </div>

      {/* CV Upload */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          {t('form_upload_cv')} <span className="text-danger">*</span>
        </label>
        <CVUpload
          fileName={cvFileName}
          onChange={(b64, name) => { setCvBase64(b64); setCvFileName(name); }}
          onClear={() => { setCvBase64(''); setCvFileName(''); }}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors shadow-lg shadow-brand-600/20"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> {t('form_submitting')}
          </span>
        ) : (
          t('talent_pool_submit')
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        {t('form_consent')}
      </p>
    </form>
  );
}
