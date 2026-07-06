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
import { FormStepProgress } from '@/components/ui/FormStepProgress';
import { trackEvent } from '@/lib/analytics';
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
const TABS: { id: TabId; labelKey: 'form_tab_personal' | 'form_tab_experience' | 'form_tab_documents'; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'personal',   labelKey: 'form_tab_personal',   icon: User      },
  { id: 'experience', labelKey: 'form_tab_experience', icon: Briefcase },
  { id: 'documents',  labelKey: 'form_tab_documents',  icon: FileText  },
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

const EDUCATION_OPTIONS_MY: Record<string, string> = {
  'High School / GED':          'အထက်တန်းပညာ',
  'Diploma / Associate Degree': 'ဒီပလိုမာ / ဒုတိယဘွဲ့',
  'Bachelor\'s Degree':         'ဘွဲ့ (တက်သိုလ်)',
  'Master\'s Degree':           'မဟာဘွဲ့',
  'MBA':                        'စီးပွားရေးပညာ မဟာဘွဲ့ (MBA)',
  'PhD / Doctorate':            'ပါရဂူဘွဲ့',
  'Professional Certification': 'ပညာရပ်ဆိုင်ရာ လက်မှတ်',
  'Other':                      'အခြား',
};

const NOTICE_OPTIONS = [
  'Immediately available',
  '1 week',
  '2 weeks',
  '1 month',
  '2 months',
  '3 months',
  'More than 3 months',
];

const NOTICE_OPTIONS_MY: Record<string, string> = {
  'Immediately available':  'ချက်ချင်းစတင်နိုင်',
  '1 week':                 '၁ ပတ်',
  '2 weeks':                '၂ ပတ်',
  '1 month':                '၁ လ',
  '2 months':               '၂ လ',
  '3 months':               '၃ လ',
  'More than 3 months':     '၃ လ ကျော်',
};

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

const EXPERIENCE_OPTIONS_MY: Record<string, string> = {
  'Less than 1 year': '၁ နှစ်အောက်',
  '1 year':           '၁ နှစ်',
  '2 years':          '၂ နှစ်',
  '3 years':          '၃ နှစ်',
  '4 years':          '၄ နှစ်',
  '5 years':          '၅ နှစ်',
  '6–8 years':        '၆–၈ နှစ်',
  '9–12 years':       '၉–၁၂ နှစ်',
  '13–15 years':      '၁၃–၁၅ နှစ်',
  '15+ years':        '၁၅ နှစ်ကျော်',
};

interface ApplicationFormProps {
  jobId?: string;
  defaultPosition?: string;
  screeningQuestions?: ScreeningQuestion[];
}

const VALIDATION_MY: Record<string, string> = {
  'Full name must be at least 2 characters': 'အမည် အနည်းဆုံး ၂ လုံး ဖြည့်ပါ',
  'Enter a valid email address':             'မှန်ကန်သော အီးမေးလ်လိပ်စာ ထည့်ပါ',
  'Enter a valid phone number':              'မှန်ကန်သော ဖုန်းနံပါတ် ထည့်ပါ',
  'Invalid phone number':                    'ဖုန်းနံပါတ် မမှန်ကန်ပါ',
  'Position must be at least 2 characters': 'ရာထူး အနည်းဆုံး ၂ လုံး ဖြည့်ပါ',
  'Please upload your CV':                   'CV တင်ပြပါ',
  'Enter a valid URL':                       'မှန်ကန်သော URL ထည့်ပါ',
  'Must be a LinkedIn profile URL':          'LinkedIn ပရိုဖိုင် URL ဖြည့်ပါ',
};

function xlateErr(msg: string | undefined, lang: string): string | undefined {
  if (!msg || lang === 'en') return msg;
  return VALIDATION_MY[msg] ?? msg;
}

export function ApplicationForm({ jobId, defaultPosition = '', screeningQuestions = [] }: ApplicationFormProps) {
  const { t, lang } = useLanguage();
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

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() returns a fresh function on every call by design; nothing in this file can change that, it's the library's own public API surface.
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
      trackEvent('apply_submitted', jobId ? { job_id: jobId } : undefined);
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
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{t('form_quick_apply')}</p>
              <p className="text-xs text-muted-foreground">{t('form_welcome_back')}{profile.name ? `, ${profile.name}` : ''}!</p>
            </div>
            <button type="button" onClick={applyProfile} className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors">
              {t('form_use_saved')}
            </button>
          </div>
        )}

        {/* Progress bar */}
        <FormStepProgress
          currentIndex={tabIndex}
          totalSteps={TABS.length}
          stepLabel={t(TABS[tabIndex].labelKey)}
        />

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
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
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
              {errors.fullName && <p className="text-xs text-danger">{xlateErr(errors.fullName.message, lang)}</p>}
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
                {errors.email && <p className="text-xs text-danger">{xlateErr(errors.email.message, lang)}</p>}
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
                {errors.phone && <p className="text-xs text-danger">{xlateErr(errors.phone.message, lang)}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cityLocation">{t('form_city')}</Label>
              <Input
                id="cityLocation"
                placeholder={lang === 'my' ? 'ဥပမာ၊ ရန်ကုန်၊ မန္တလေး၊ နေပြည်တော်…' : 'e.g. Yangon, Mandalay, Naypyidaw…'}
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
                <Label htmlFor="education">{t('form_education')}</Label>
                <select
                  id="education"
                  {...register('education' as keyof FormData)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
                >
                  <option value="">{t('form_select_education')}</option>
                  {EDUCATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>{lang === 'my' ? (EDUCATION_OPTIONS_MY[o] ?? o) : o}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="experienceYears">{t('form_experience')}</Label>
                <select
                  id="experienceYears"
                  {...register('experienceYears' as keyof FormData)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
                >
                  <option value="">{t('form_select_experience')}</option>
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{lang === 'my' ? (EXPERIENCE_OPTIONS_MY[o] ?? o) : o}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="currentCompany">{t('form_current_company')}</Label>
                <Input
                  id="currentCompany"
                  placeholder={lang === 'my' ? 'ဥပမာ၊ ABC Company' : 'e.g. Acme Corp'}
                  {...register('currentCompany' as keyof FormData)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currentSalary">{t('form_current_salary')}</Label>
                <Input
                  id="currentSalary"
                  placeholder={lang === 'my' ? 'ဥပမာ၊ ၈၀၀,၀၀၀' : 'e.g. 800,000'}
                  {...register('currentSalary' as keyof FormData)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="noticePeriod">{t('form_notice_period')}</Label>
              <select
                id="noticePeriod"
                {...register('noticePeriod' as keyof FormData)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
              >
                <option value="">{t('form_select_notice')}</option>
                {NOTICE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{lang === 'my' ? (NOTICE_OPTIONS_MY[o] ?? o) : o}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="languages">{t('form_languages')}</Label>
              <Input
                id="languages"
                placeholder={lang === 'my' ? 'ဥပမာ၊ မြန်မာ (မိခင်ဘာသာ)၊ အင်္ဂလိပ် (ကျွမ်းကျင်)' : 'e.g. Burmese (Native), English (Fluent), Thai (Basic)'}
                {...register('languages' as keyof FormData)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skills">{t('form_skills')}</Label>
              <Input
                id="skills"
                placeholder={lang === 'my' ? 'ဥပမာ၊ Python၊ စီမံကိန်းစီမံခန့်ခွဲမှု၊ Photoshop…' : 'e.g. Python, Project Management, Photoshop, SQL…'}
                {...register('skills' as keyof FormData)}
              />
              <p className="text-xs text-muted-foreground">{t('form_skills_hint')}</p>
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
              {errors.position && <p className="text-xs text-danger">{xlateErr(errors.position.message, lang)}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedSalary">{t('form_expected_salary')}</Label>
              <Input
                id="expectedSalary"
                placeholder={lang === 'my' ? 'ဥပမာ၊ ၁,၂၀၀,၀၀၀' : 'e.g. 1,200,000'}
                {...register('expectedSalary' as keyof FormData)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="portfolioUrl">{t('form_portfolio_url')}</Label>
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
                  error={xlateErr(errs['cvBase64']?.message, lang)}
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
                    <p className="text-xs text-danger">{xlateErr(errs['linkedinUrl'].message, lang)}</p>
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
              <ChevronLeft size={15} /> {t('form_back')}
            </button>
          )}

          {activeTab !== 'documents' ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 shadow-lg shadow-brand-600/20 transition-colors"
            >
              {t('form_next')} <ChevronRight size={15} />
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
