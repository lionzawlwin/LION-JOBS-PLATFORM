'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2, FileUp, User, Briefcase, FileText,
  ChevronRight, ChevronLeft, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CVUpload } from './CVUpload';
import { SuccessModal } from './SuccessModal';
import { ScreeningQuestions } from './ScreeningQuestions';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProfile } from '@/hooks/useProfile';
import type { ScreeningQuestion } from '@/types';

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

// ── Schema ────────────────────────────────────────────────────────
const baseSchema = z.object({
  // Tab 1 — Personal
  fullName:     z.string().min(2, 'Full name must be at least 2 characters'),
  email:        z.string().email('Enter a valid email address'),
  phone:        z.string().min(7, 'Enter a valid phone number').regex(/^[+\d\s\-()]+$/, 'Invalid phone number'),
  cityLocation: z.string().optional(),
  // Tab 2 — Experience
  education:       z.string().optional(),
  experienceYears: z.string().optional(),
  currentCompany:  z.string().optional(),
  currentSalary:   z.string().optional(),
  noticePeriod:    z.string().optional(),
  languages:       z.string().optional(),
  skills:          z.string().optional(),
  // Tab 3 — Documents
  position:        z.string().min(2, 'Position must be at least 2 characters'),
  expectedSalary:  z.string().optional(),
  portfolioUrl:    z.string().optional(),
});

const cvSchema = baseSchema.extend({
  mode:       z.literal('cv'),
  cvBase64:   z.string().min(1, 'Please upload your CV'),
  cvFileName: z.string().min(1),
});
const linkedinSchema = baseSchema.extend({
  mode:        z.literal('linkedin'),
  linkedinUrl: z.string().url('Enter a valid URL').includes('linkedin.com', { message: 'Must be a LinkedIn profile URL' }),
});

const formSchema = z.discriminatedUnion('mode', [cvSchema, linkedinSchema]);
type FormData = z.infer<typeof formSchema>;

type TabId = 'personal' | 'experience' | 'documents';
const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'personal',   label: 'Personal',   icon: User      },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'documents',  label: 'Documents',  icon: FileText  },
];

const EDUCATION_OPTIONS = [
  'High School / GED',
  'Diploma / Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'MBA',
  'PhD / Doctorate',
  'Professional Certification',
  'Other',
];

const NOTICE_OPTIONS = [
  'Immediately available',
  '1 week',
  '2 weeks',
  '1 month',
  '2 months',
  '3 months',
  'More than 3 months',
];

const EXPERIENCE_OPTIONS = [
  'Less than 1 year',
  '1 year',
  '2 years',
  '3 years',
  '4 years',
  '5 years',
  '6–8 years',
  '9–12 years',
  '13–15 years',
  '15+ years',
];

interface ApplicationFormProps {
  jobId?: string;
  defaultPosition?: string;
  screeningQuestions?: ScreeningQuestion[];
}

export function ApplicationForm({ jobId, defaultPosition = '', screeningQuestions = [] }: ApplicationFormProps) {
  const { t } = useLanguage();
  const { profile, hydrated, saveProfile } = useProfile();
  const [mode, setMode] = useState<'cv' | 'linkedin'>('cv');
  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [successOpen, setSuccessOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | undefined>(undefined);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [profileUsed, setProfileUsed] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode:       'cv',
      fullName:   '',
      email:      '',
      phone:      '',
      position:   defaultPosition,
      cvBase64:   '',
      cvFileName: '',
    } as FormData,
  });

  const cvFileName       = watch('cvFileName' as keyof FormData) as string | undefined;
  const watchedPosition  = watch('position');
  const errs = errors as Record<string, { message?: string }>;

  function applyProfile() {
    if (!profile) return;
    setValue('fullName', profile.name, { shouldValidate: true });
    setValue('email',    profile.email, { shouldValidate: true });
    setValue('phone',    profile.phone, { shouldValidate: true });
    setProfileUsed(true);
  }

  function handleModeSwitch(next: 'cv' | 'linkedin') {
    setMode(next);
    setValue('mode', next);
  }

  function handleCVChange(base64: string, fileName: string) {
    setValue('cvBase64'   as keyof FormData, base64    as never, { shouldValidate: true });
    setValue('cvFileName' as keyof FormData, fileName  as never, { shouldValidate: true });
  }

  function handleCVClear() {
    setValue('cvBase64'   as keyof FormData, '' as never);
    setValue('cvFileName' as keyof FormData, '' as never);
  }

  // Validate the current tab's fields before advancing
  async function handleNext() {
    let fieldsToValidate: (keyof FormData)[] = [];
    if (activeTab === 'personal')   fieldsToValidate = ['fullName', 'email', 'phone'];
    if (activeTab === 'experience') fieldsToValidate = [];
    const ok = await trigger(fieldsToValidate);
    if (!ok) return;
    if (activeTab === 'personal')   setActiveTab('experience');
    if (activeTab === 'experience') setActiveTab('documents');
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const res = await fetch('/api/apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...data,
          jobId,
          screeningAnswers: Object.keys(screeningAnswers).length ? screeningAnswers : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      saveProfile({ name: data.fullName, email: data.email ?? '', phone: data.phone });
      setSubmittedEmail(data.email ?? undefined);
      reset();
      setActiveTab('personal');
      setSuccessOpen(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  const tabIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* Quick Apply banner */}
        {hydrated && profile && !profileUsed && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 dark:border-brand-700/40 dark:bg-brand-600/10">
            <div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">⚡ Quick Apply</p>
              <p className="text-xs text-muted-foreground">Welcome back, {profile.name || 'returning applicant'}!</p>
            </div>
            <button type="button" onClick={applyProfile} className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors">
              Use Saved Profile
            </button>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-muted/30 p-1.5">
          {TABS.map((tab, idx) => {
            const Icon     = tab.icon;
            const isActive = activeTab === tab.id;
            const isDone   = idx < tabIndex;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: Personal ─────────────────────────────────────── */}
        {activeTab === 'personal' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{t('form_full_name')} <span className="text-danger">*</span></Label>
              <Input
                id="fullName"
                placeholder="e.g. Aung Ko Ko"
                autoComplete="name"
                {...register('fullName')}
                className={cn(errors.fullName && 'border-danger focus-visible:ring-danger/30')}
              />
              {errors.fullName && <p className="text-xs text-danger">{errors.fullName.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('form_email')} <span className="text-danger">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                  inputMode="email"
                  {...register('email')}
                  className={cn(errors.email && 'border-danger focus-visible:ring-danger/30')}
                />
                {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">{t('form_phone')} <span className="text-danger">*</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+959 77 000 0000"
                  autoComplete="tel"
                  inputMode="tel"
                  {...register('phone')}
                  className={cn(errors.phone && 'border-danger focus-visible:ring-danger/30')}
                />
                {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cityLocation">City / Township</Label>
              <Input
                id="cityLocation"
                placeholder="e.g. Yangon, Mandalay, Naypyidaw…"
                {...register('cityLocation' as keyof FormData)}
              />
            </div>
          </div>
        )}

        {/* ── Tab 2: Experience ───────────────────────────────────── */}
        {activeTab === 'experience' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="education">Highest Education</Label>
                <select
                  id="education"
                  {...register('education' as keyof FormData)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
                >
                  <option value="">Select education level…</option>
                  {EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <select
                  id="experienceYears"
                  {...register('experienceYears' as keyof FormData)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
                >
                  <option value="">Select experience…</option>
                  {EXPERIENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="currentCompany">Current / Last Employer</Label>
                <Input
                  id="currentCompany"
                  placeholder="e.g. Acme Corp"
                  {...register('currentCompany' as keyof FormData)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currentSalary">Current Salary (MMK/month)</Label>
                <Input
                  id="currentSalary"
                  placeholder="e.g. 800,000"
                  {...register('currentSalary' as keyof FormData)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="noticePeriod">Notice Period</Label>
              <select
                id="noticePeriod"
                {...register('noticePeriod' as keyof FormData)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
              >
                <option value="">Select notice period…</option>
                {NOTICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="languages">Languages Spoken</Label>
              <Input
                id="languages"
                placeholder="e.g. Burmese (Native), English (Fluent), Thai (Basic)"
                {...register('languages' as keyof FormData)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skills">Key Skills</Label>
              <Input
                id="skills"
                placeholder="e.g. Python, Project Management, Photoshop, SQL…"
                {...register('skills' as keyof FormData)}
              />
              <p className="text-xs text-muted-foreground">Separate skills with commas</p>
            </div>
          </div>
        )}

        {/* ── Tab 3: Documents ────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="position">{t('form_position')} <span className="text-danger">*</span></Label>
              <Input
                id="position"
                placeholder="e.g. Senior Software Engineer"
                {...register('position')}
                className={cn(errors.position && 'border-danger focus-visible:ring-danger/30')}
              />
              {errors.position && <p className="text-xs text-danger">{errors.position.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedSalary">Expected Salary (MMK/month)</Label>
              <Input
                id="expectedSalary"
                placeholder="e.g. 1,200,000"
                {...register('expectedSalary' as keyof FormData)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="portfolioUrl">Portfolio / Website URL</Label>
              <Input
                id="portfolioUrl"
                type="url"
                placeholder="https://yourportfolio.com"
                inputMode="url"
                {...register('portfolioUrl' as keyof FormData)}
              />
            </div>

            {/* Screening questions */}
            {screeningQuestions.length > 0 && (
              <ScreeningQuestions
                questions={screeningQuestions}
                answers={screeningAnswers}
                onChange={(id, value) => setScreeningAnswers((prev) => ({ ...prev, [id]: value }))}
              />
            )}

            {/* CV / LinkedIn toggle */}
            <div className="space-y-3">
              <Label>{t('form_portfolio')} <span className="text-danger">*</span></Label>
              <div className="inline-flex rounded-lg border border-border p-1 gap-1">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('cv')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    mode === 'cv' ? 'bg-brand-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <FileUp size={14} /> {t('form_upload_cv')}
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('linkedin')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    mode === 'linkedin' ? 'bg-brand-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <LinkedInIcon size={14} /> LinkedIn URL
                </button>
              </div>

              {mode === 'cv' && (
                <CVUpload
                  onChange={handleCVChange}
                  onClear={handleCVClear}
                  fileName={cvFileName}
                  error={errs['cvBase64']?.message}
                />
              )}

              {mode === 'linkedin' && (
                <div className="space-y-1.5">
                  <Input
                    placeholder="https://linkedin.com/in/your-profile"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    {...register('linkedinUrl' as keyof FormData)}
                    className={cn(errs['linkedinUrl'] && 'border-danger focus-visible:ring-danger/30')}
                  />
                  {errs['linkedinUrl']?.message && (
                    <p className="text-xs text-danger">{errs['linkedinUrl'].message}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Server error */}
        {serverError && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
            {serverError}
          </p>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          {activeTab !== 'personal' && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'documents' ? 'experience' : 'personal')}
              className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft size={15} /> Back
            </button>
          )}

          {activeTab !== 'documents' ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 shadow-lg shadow-brand-600/20 transition-colors"
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20"
              size="lg"
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> {t('form_submitting')}</>
              ) : (
                t('form_submit')
              )}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">{t('form_consent')}</p>
      </form>

      <SuccessModal
        open={successOpen}
        jobTitle={watchedPosition || defaultPosition || 'this position'}
        onClose={() => setSuccessOpen(false)}
        candidateEmail={submittedEmail}
      />
    </>
  );
}
