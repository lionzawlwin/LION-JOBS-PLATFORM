'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, User, Briefcase, ChevronRight, ChevronLeft, CheckCircle2, Loader2, FileText, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { FormStepProgress } from '@/components/ui/FormStepProgress';
import { trackEvent } from '@/lib/analytics';

const schema = z.object({
  // Company
  companyName:   z.string().min(2, 'Company name required'),
  industry:      z.string().min(1, 'Select an industry'),
  location:      z.string().min(2, 'Location required'),
  website:       z.string().optional(),
  // Contact
  contactName:   z.string().min(2, 'Contact name required'),
  contactTitle:  z.string().optional(),
  workEmail:     z.string().email('Valid email required'),
  phone:         z.string().min(7, 'Phone required'),
  // Requisition
  jobTitle:      z.string().min(2, 'Job title required'),
  headcount:     z.string().min(1),
  workSetup:     z.string().min(1),
  salaryBudget:  z.string().optional(),
  urgency:       z.string().min(1),
  requirements:    z.string().optional(),
  jobDescription:  z.string().optional(),
  benefits:        z.string().optional(),
  agencyMessage:   z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type StepId = 'company' | 'contact' | 'requisition';
const STEPS: { id: StepId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'company',     label: 'Company Info',       icon: Building2 },
  { id: 'contact',     label: 'Contact Person',     icon: User      },
  { id: 'requisition', label: 'Hiring Requisition', icon: Briefcase },
];

const INDUSTRIES = [
  'Technology & IT', 'Finance & Banking', 'Manufacturing', 'Retail & FMCG',
  'Healthcare & Pharma', 'Education & Training', 'Construction & Engineering',
  'Logistics & Supply Chain', 'Hospitality & Tourism', 'Media & Marketing',
  'Telecoms', 'NGO / Non-profit', 'Government', 'Other',
];

const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 ' +
  'focus:border-brand-600 transition-colors';

const errorCls = 'mt-1 text-xs text-red-500';

const STEP_FIELDS: Record<StepId, (keyof FormData)[]> = {
  company:     ['companyName', 'industry', 'location'],
  contact:     ['contactName', 'workEmail', 'phone'],
  requisition: ['jobTitle', 'headcount', 'workSetup', 'urgency'],
};

export function HireForm() {
  const { t } = useLanguage();
  const [submitted,   setSubmitted]  = useState(false);
  const [serverError, setServerError] = useState('');
  const [reqTab,      setReqTab]     = useState<'requirements' | 'jobDescription' | 'benefits'>('requirements');
  const [activeStep,  setActiveStep] = useState<StepId>('company');

  const { register, handleSubmit, trigger, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      headcount: '1',
      workSetup: 'On-site',
      urgency:   'Within 1 month',
    },
  });

  const stepIndex = STEPS.findIndex((s) => s.id === activeStep);

  async function handleNext() {
    const ok = await trigger(STEP_FIELDS[activeStep]);
    if (!ok) return;
    if (activeStep === 'company') setActiveStep('contact');
    if (activeStep === 'contact') setActiveStep('requisition');
  }

  function handleBack() {
    if (activeStep === 'requisition') setActiveStep('contact');
    if (activeStep === 'contact') setActiveStep('company');
  }

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      const res = await fetch('/api/employers/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setServerError(j.error ?? 'Something went wrong. Please try again.');
        return;
      }
      trackEvent('hire_request_submitted', { industry: data.industry });
      setSubmitted(true);
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    }
  }

  const header = (
    <div className="mb-7">
      <h2 className="text-xl font-extrabold text-foreground">{t('hire_form_title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('hire_form_sub')}
      </p>
    </div>
  );

  if (submitted) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 size={36} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-2xl font-extrabold text-foreground">Request Received!</h3>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
            Our recruitment team will contact you within <strong>1 business day</strong>. Check your email for confirmation.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-700/30 dark:bg-emerald-900/10 px-5 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Saved to CRM
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 dark:border-brand-700/30 dark:bg-brand-600/10 px-5 py-3 text-sm font-semibold text-brand-700 dark:text-brand-300">
            ✓ Team Notified via Telegram
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      {/* Progress bar */}
      <FormStepProgress
        currentIndex={stepIndex}
        totalSteps={STEPS.length}
        stepLabel={STEPS[stepIndex].label}
      />

      {/* Step navigation */}
      <div className="mb-6 flex items-center gap-1 rounded-2xl border border-border bg-muted/30 p-1.5">
        {STEPS.map((step, idx) => {
          const Icon     = step.icon;
          const isActive = activeStep === step.id;
          const isDone   = idx < stepIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200',
                isActive
                  ? 'bg-background shadow-sm text-foreground border border-border'
                  : isDone
                    ? 'text-brand-600 hover:bg-background/60 dark:text-brand-400'
                    : 'text-muted-foreground hover:bg-background/60',
              )}
            >
              {isDone ? (
                <CheckCircle2 size={13} className="text-brand-600 dark:text-brand-400" />
              ) : (
                <Icon size={13} />
              )}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{idx + 1}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── Step 1: Company Info ────────────────────────────────── */}
      {activeStep === 'company' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{t('hire_form_company_info_title')}</h3>
              <p className="text-xs text-muted-foreground">{t('hire_form_company_info_sub')}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_company_name')} <span className="text-red-500">*</span></label>
              <input {...register('companyName')} placeholder="e.g. Acme Corp Ltd" className={inputCls} />
              {errors.companyName && <p className={errorCls}>{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_industry')} <span className="text-red-500">*</span></label>
              <select {...register('industry')} className={inputCls}>
                <option value="">Select industry…</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              {errors.industry && <p className={errorCls}>{errors.industry.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_location')} <span className="text-red-500">*</span></label>
              <input {...register('location')} placeholder="e.g. Yangon, Myanmar" className={inputCls} />
              {errors.location && <p className={errorCls}>{errors.location.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_website')}</label>
              <input {...register('website')} placeholder="https://yourcompany.com" className={inputCls} />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Contact Person ──────────────────────────────── */}
      {activeStep === 'contact' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <User size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{t('hire_form_contact_title')}</h3>
              <p className="text-xs text-muted-foreground">{t('hire_form_contact_sub')}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_full_name')} <span className="text-red-500">*</span></label>
              <input {...register('contactName')} placeholder="e.g. Daw Aye Myat" className={inputCls} />
              {errors.contactName && <p className={errorCls}>{errors.contactName.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_job_title')}</label>
              <input {...register('contactTitle')} placeholder="e.g. HR Manager" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_work_email')} <span className="text-red-500">*</span></label>
              <input {...register('workEmail')} type="email" placeholder="hr@company.com" className={inputCls} />
              {errors.workEmail && <p className={errorCls}>{errors.workEmail.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_phone')} <span className="text-red-500">*</span></label>
              <input {...register('phone')} placeholder="09428954289" className={inputCls} />
              {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Hiring Requisition ───────────────────────────── */}
      {activeStep === 'requisition' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
              <Briefcase size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Hiring Requisition</h3>
              <p className="text-xs text-muted-foreground">Tell us what you need — we&apos;ll handle the rest</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Job Title / Role <span className="text-red-500">*</span></label>
              <input {...register('jobTitle')} placeholder="e.g. Senior Software Engineer" className={inputCls} />
              {errors.jobTitle && <p className={errorCls}>{errors.jobTitle.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Headcount Needed</label>
              <select {...register('headcount')} className={inputCls}>
                {['1', '2', '3', '4-5', '6-10', '10+'].map((n) => <option key={n} value={n}>{n} person{n === '1' ? '' : 's'}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Work Setup</label>
              <select {...register('workSetup')} className={inputCls}>
                {['On-site', 'Hybrid', 'Remote'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Salary Budget (MMK / month)</label>
              <input {...register('salaryBudget')} placeholder="e.g. 500,000 – 800,000 MMK" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Urgency</label>
              <select {...register('urgency')} className={inputCls}>
                {['ASAP (within 2 weeks)', 'Within 1 month', 'Within 3 months', 'Planning ahead (3+ months)'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            {/* Tabbed: Requirements / Job Description / Benefits */}
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
                {([
                  { key: 'requirements',   label: 'Key Requirements', icon: <FileText size={13} /> },
                  { key: 'jobDescription', label: 'Job Description',  icon: <Briefcase size={13} /> },
                  { key: 'benefits',       label: 'Benefits & Perks', icon: <Gift size={13} /> },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setReqTab(tab.key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap',
                      reqTab === tab.key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {reqTab === 'requirements' && (
                <textarea
                  {...register('requirements')}
                  rows={5}
                  placeholder="e.g. 3+ years experience in React, fluent English, immediate joiner preferred..."
                  className={cn(inputCls, 'resize-none')}
                />
              )}
              {reqTab === 'jobDescription' && (
                <textarea
                  {...register('jobDescription')}
                  rows={5}
                  placeholder="Describe the role scope, day-to-day responsibilities, team structure, and reporting line…"
                  className={cn(inputCls, 'resize-none')}
                />
              )}
              {reqTab === 'benefits' && (
                <textarea
                  {...register('benefits')}
                  rows={5}
                  placeholder="e.g. Medical insurance, annual leave 14 days, performance bonus, flexible hours, remote work options…"
                  className={cn(inputCls, 'resize-none')}
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Message to Agency</label>
              <textarea
                {...register('agencyMessage')}
                rows={3}
                placeholder="Any specific notes or requests for our team — e.g. confidential search, preferred start date, or interview preferences…"
                className={cn(inputCls, 'resize-none')}
              />
              <p className="mt-1 text-xs text-muted-foreground">This message goes directly to our recruitment team and is not shown publicly.</p>
            </div>
          </div>
        </div>
      )}

      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400">
          {serverError}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3">
        {activeStep !== 'company' && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 rounded-2xl border border-border px-5 py-4 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}

        {activeStep !== 'requisition' ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-base font-bold text-white hover:bg-brand-700 shadow-xl shadow-brand-600/25 hover:shadow-brand-600/40 transition-all"
          >
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-60 transition-all shadow-xl shadow-brand-600/25 hover:shadow-brand-600/40"
          >
            {isSubmitting
              ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
              : <>Submit Hiring Request <ChevronRight size={18} /></>
            }
          </button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        🔒 Your information is secure and will only be used to match you with suitable candidates.
        Our team will contact you within 1 business day.
      </p>
      </form>
    </>
  );
}
