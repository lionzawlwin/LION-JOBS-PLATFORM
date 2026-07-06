'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PlusCircle, ChevronDown, ChevronUp, Send,
  CheckCircle2, AlertCircle, Loader2, KeyRound, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Constants ────────────────────────────────────────────────────
const CATEGORIES = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'Finance',
  'Operations', 'Customer Service', 'Healthcare', 'Education',
  'Logistics & Distribution', 'Other',
] as const;

const TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'] as const;

const CURRENCIES = [
  { value: 'MMK', label: 'MMK — Myanmar Kyat' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'THB', label: 'THB — Thai Baht' },
];

// ── Validation schema ────────────────────────────────────────────
// .default() splits zod input/output types and breaks zodResolver generics.
// Use plain types here and set all defaults in useForm({ defaultValues }).
const schema = z.object({
  adminKey:     z.string().min(1, 'Admin key is required'),
  title:        z.string().min(2, 'Title is required'),
  company:      z.string().min(2, 'Company is required'),
  location:     z.string().min(2, 'Location is required'),
  category:     z.enum(CATEGORIES, { message: 'Pick a category' }),
  type:         z.enum(TYPES, { message: 'Pick a job type' }),
  salaryMin:    z.number().min(0),
  salaryMax:    z.number().min(0),
  currency:     z.string(),
  description:  z.string().min(20, 'Description must be at least 20 characters'),
  requirements: z.string(),
  benefits:     z.string(),
  isUrgent:     z.boolean(),
  isFeatured:   z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ── Shared field classes ─────────────────────────────────────────
const inputCls = cn(
  'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm',
  'text-foreground placeholder:text-muted-foreground',
  'focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600',
  'transition-colors',
);

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

// ── Component ────────────────────────────────────────────────────
export function PostJobForm() {
  const [open,               setOpen]               = useState(false);
  const [status,             setStatus]             = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message,            setMessage]            = useState('');
  const [newJobId,           setNewJobId]           = useState('');
  const [socialPostingQueued, setSocialPostingQueued] = useState(false);
  const { t } = useLanguage();

  const [aiStatus,  setAiStatus]  = useState<'idle' | 'loading' | 'error'>('idle');
  const [aiMessage, setAiMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'MMK',
      type: 'Full-time',
      category: 'Engineering',
      isUrgent: false,
      isFeatured: false,
      salaryMin: 0,
      salaryMax: 0,
      benefits: '',
      requirements: '',
    },
  });

  // Restore saved admin key from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('lion_admin_key');
    if (saved) setValue('adminKey', saved);
  }, [setValue]);

  async function onSubmit(data: FormValues) {
    setStatus('loading');
    setMessage('');

    // Persist admin key for this session
    sessionStorage.setItem('lion_admin_key', data.adminKey);

    // Parse requirements and benefits: one per line, filter blanks
    const requirements = data.requirements
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const benefits = data.benefits
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': data.adminKey,
        },
        body: JSON.stringify({ ...data, requirements, benefits }),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(json.error ?? 'Unknown error');
        return;
      }

      setStatus('success');
      setNewJobId(json.jobId ?? '');
      setSocialPostingQueued(Boolean(json.socialPostingQueued));
      setMessage(
        json.socialPostingQueued
          ? t('pj_msg_social_queued')
          : t('pj_msg_saved_no_webhook'),
      );
    } catch {
      setStatus('error');
      setMessage(t('pj_msg_network_error'));
    }
  }

  async function handleGenerateWithAi() {
    const { title, company, location, category, type } = getValues();
    if (!title || !company || !location) {
      setAiStatus('error');
      setAiMessage(t('pj_ai_needs_fields'));
      return;
    }

    setAiStatus('loading');
    setAiMessage('');

    try {
      const res = await fetch('/api/jobs/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, type, location, companyName: company }),
      });
      const json = await res.json();

      if (!res.ok) {
        setAiStatus('error');
        setAiMessage(json.error ?? t('pj_ai_error'));
        return;
      }

      setValue('description', json.draft.description);
      setValue('requirements', json.draft.requirements.join('\n'));
      setValue('benefits', json.draft.benefits.join('\n'));
      setAiStatus('idle');
    } catch {
      setAiStatus('error');
      setAiMessage(t('pj_ai_error'));
    }
  }

  function handlePostAnother() {
    reset();
    const saved = sessionStorage.getItem('lion_admin_key');
    if (saved) setValue('adminKey', saved);
    setStatus('idle');
    setMessage('');
    setNewJobId('');
    setSocialPostingQueued(false);
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">

      {/* ── Toggle header ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <PlusCircle size={15} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{t('pj_header_title')}</p>
            <p className="text-xs text-muted-foreground">{t('pj_header_sub')}</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {/* ── Form panel ── */}
      {open && (
        <div className="border-t border-border px-5 py-6">

          {/* Success state */}
          {status === 'success' && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-700/30 dark:bg-green-900/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{message}</p>
                  {newJobId && (
                    <p className="mt-1 font-mono text-xs text-green-600 dark:text-green-500">{t('pj_success_job_id')}{newJobId}</p>
                  )}
                </div>
              </div>
              {socialPostingQueued && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-100 px-3 py-2 dark:bg-green-800/30">
                  <span className="text-base">📲</span>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    {t('pj_success_social_posting')} <strong>Telegram</strong> {t('pj_success_social_posting_and')} <strong>Facebook</strong> {t('pj_success_social_posting_suffix')}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={handlePostAnother}
                className="mt-3 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
              >
                {t('pj_success_post_another')}
              </button>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-700/30 dark:bg-red-900/20">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
              <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
            </div>
          )}

          {status !== 'success' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Admin key */}
              <div className="rounded-xl border border-gold-200 bg-gold-50 p-4 dark:border-gold-700/20 dark:bg-gold-600/5">
                <Label required>{t('pj_admin_key_label')}</Label>
                <div className="relative">
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder={t('pj_admin_key_placeholder')}
                    {...register('adminKey')}
                    className={cn(inputCls, 'pl-9')}
                  />
                </div>
                <FieldError msg={errors.adminKey?.message} />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t('pj_admin_key_hint_prefix')} <code className="font-mono">ADMIN_KEY</code> {t('pj_admin_key_hint_suffix')}
                </p>
              </div>

              {/* Row 1: Title / Company */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label required>{t('pj_job_title_label')}</Label>
                  <input placeholder={t('pj_job_title_placeholder')} {...register('title')} className={inputCls} />
                  <FieldError msg={errors.title?.message} />
                </div>
                <div>
                  <Label required>{t('pj_company_label')}</Label>
                  <input placeholder={t('pj_company_placeholder')} {...register('company')} className={inputCls} />
                  <FieldError msg={errors.company?.message} />
                </div>
              </div>

              {/* Row 2: Location / Category / Type */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label required>{t('pj_location_label')}</Label>
                  <input placeholder={t('pj_location_placeholder')} {...register('location')} className={inputCls} />
                  <FieldError msg={errors.location?.message} />
                </div>
                <div>
                  <Label required>{t('pj_category_label')}</Label>
                  <select {...register('category')} className={inputCls}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <FieldError msg={errors.category?.message} />
                </div>
                <div>
                  <Label required>{t('pj_job_type_label')}</Label>
                  <select {...register('type')} className={inputCls}>
                    {TYPES.map((ty) => (
                      <option key={ty} value={ty}>{ty}</option>
                    ))}
                  </select>
                  <FieldError msg={errors.type?.message} />
                </div>
              </div>

              {/* Row 3: Salary min / max / currency */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>{t('pj_salary_min_label')}</Label>
                  <input type="number" placeholder="0" min={0} {...register('salaryMin', { valueAsNumber: true })} className={inputCls} />
                </div>
                <div>
                  <Label>{t('pj_salary_max_label')}</Label>
                  <input type="number" placeholder="0" min={0} {...register('salaryMax', { valueAsNumber: true })} className={inputCls} />
                </div>
                <div>
                  <Label>{t('pj_currency_label')}</Label>
                  <select {...register('currency')} className={inputCls}>
                    {CURRENCIES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label required>{t('pj_description_label')}</Label>
                  <button
                    type="button"
                    onClick={handleGenerateWithAi}
                    disabled={aiStatus === 'loading'}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border border-brand-600/30 bg-brand-600/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400',
                      'hover:bg-brand-600/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                  >
                    {aiStatus === 'loading' ? (
                      <><Loader2 size={12} className="animate-spin" /> {t('pj_ai_generating')}</>
                    ) : (
                      <><Sparkles size={12} /> {t('pj_ai_generate')}</>
                    )}
                  </button>
                </div>
                {aiStatus === 'error' && (
                  <p className="mb-1.5 text-xs text-red-500">{aiMessage}</p>
                )}
                <textarea
                  rows={5}
                  placeholder={t('pj_description_placeholder')}
                  {...register('description')}
                  className={cn(inputCls, 'resize-y')}
                />
                <FieldError msg={errors.description?.message} />
              </div>

              {/* Requirements */}
              <div>
                <Label>{t('pj_requirements_label')}</Label>
                <textarea
                  rows={4}
                  placeholder={t('pj_requirements_placeholder')}
                  {...register('requirements')}
                  className={cn(inputCls, 'resize-y font-mono text-xs leading-relaxed')}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('pj_requirements_hint')}</p>
              </div>

              {/* Benefits */}
              <div>
                <Label>{t('pj_benefits_label')}</Label>
                <textarea
                  rows={3}
                  placeholder={t('pj_benefits_placeholder')}
                  {...register('benefits')}
                  className={cn(inputCls, 'resize-y font-mono text-xs leading-relaxed')}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('pj_benefits_hint')}</p>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" {...register('isUrgent')} className="h-4 w-4 rounded border-border accent-ruby-600" />
                  🔥{t('pj_mark_urgent')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" {...register('isFeatured')} className="h-4 w-4 rounded border-border accent-gold-600" />
                  ⭐{t('pj_mark_featured')}
                </label>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-colors',
                    'bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/20',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  {status === 'loading' ? (
                    <><Loader2 size={15} className="animate-spin" /> {t('pj_posting')}</>
                  ) : (
                    <><Send size={15} /> {t('pj_submit_btn')}</>
                  )}
                </button>
                <p className="text-xs text-muted-foreground">
                  {t('pj_submit_hint')}
                </p>
              </div>

            </form>
          )}
        </div>
      )}
    </div>
  );
}
