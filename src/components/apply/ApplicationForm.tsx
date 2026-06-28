'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileUp } from 'lucide-react';

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CVUpload } from './CVUpload';
import { SuccessModal } from './SuccessModal';
import { cn } from '@/lib/utils';

// ── Zod schemas ──────────────────────────────────────────────────
const baseSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .regex(/^[+\d\s\-()]+$/, 'Phone number contains invalid characters'),
  position: z.string().min(2, 'Position must be at least 2 characters'),
});

const cvSchema = baseSchema.extend({
  mode: z.literal('cv'),
  cvBase64: z.string().min(1, 'Please upload your CV'),
  cvFileName: z.string().min(1),
});

const linkedinSchema = baseSchema.extend({
  mode: z.literal('linkedin'),
  linkedinUrl: z
    .string()
    .url('Enter a valid URL')
    .includes('linkedin.com', { message: 'Must be a LinkedIn profile URL' }),
});

const formSchema = z.discriminatedUnion('mode', [cvSchema, linkedinSchema]);
type FormData = z.infer<typeof formSchema>;

// ── Component ────────────────────────────────────────────────────
interface ApplicationFormProps {
  jobId?: string;
  defaultPosition?: string;
}

export function ApplicationForm({ jobId, defaultPosition = '' }: ApplicationFormProps) {
  const [mode, setMode] = useState<'cv' | 'linkedin'>('cv');
  const [successOpen, setSuccessOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'cv',
      fullName: '',
      email: '',
      phone: '',
      position: defaultPosition,
      cvBase64: '',
      cvFileName: '',
    } as FormData,
  });

  const cvFileName = watch('cvFileName' as keyof FormData) as string | undefined;
  const watchedPosition = watch('position');

  function handleModeSwitch(next: 'cv' | 'linkedin') {
    setMode(next);
    setValue('mode', next);
  }

  function handleCVChange(base64: string, fileName: string) {
    setValue('cvBase64' as keyof FormData, base64 as never, { shouldValidate: true });
    setValue('cvFileName' as keyof FormData, fileName as never, { shouldValidate: true });
  }

  function handleCVClear() {
    setValue('cvBase64' as keyof FormData, '' as never);
    setValue('cvFileName' as keyof FormData, '' as never);
  }

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, jobId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      reset();
      setSuccessOpen(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name <span className="text-danger">*</span></Label>
          <Input
            id="fullName"
            placeholder="e.g. Aung Ko Ko"
            autoComplete="name"
            {...register('fullName')}
            className={cn(errors.fullName && 'border-danger focus-visible:ring-danger/30')}
          />
          {errors.fullName && (
            <p className="text-xs text-danger">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address <span className="text-danger">*</span></Label>
          <Input
            id="email"
            type="email"
            placeholder="e.g. aungkoko@email.com"
            autoComplete="email"
            inputMode="email"
            {...register('email')}
            className={cn(errors.email && 'border-danger focus-visible:ring-danger/30')}
          />
          {errors.email && (
            <p className="text-xs text-danger">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number <span className="text-danger">*</span></Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+959 77 000 0000"
            autoComplete="tel"
            inputMode="tel"
            {...register('phone')}
            className={cn(errors.phone && 'border-danger focus-visible:ring-danger/30')}
          />
          {errors.phone && (
            <p className="text-xs text-danger">{errors.phone.message}</p>
          )}
        </div>

        {/* Position */}
        <div className="space-y-1.5">
          <Label htmlFor="position">Applied Position <span className="text-danger">*</span></Label>
          <Input
            id="position"
            placeholder="e.g. Senior Software Engineer"
            {...register('position')}
            className={cn(errors.position && 'border-danger focus-visible:ring-danger/30')}
          />
          {errors.position && (
            <p className="text-xs text-danger">{errors.position.message}</p>
          )}
        </div>

        {/* CV / LinkedIn toggle */}
        <div className="space-y-3">
          <Label>Portfolio / CV <span className="text-danger">*</span></Label>

          {/* Toggle pills */}
          <div className="inline-flex rounded-lg border border-border p-1 gap-1">
            <button
              type="button"
              onClick={() => handleModeSwitch('cv')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'cv'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <FileUp size={14} /> Upload CV
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('linkedin')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'linkedin'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LinkedInIcon size={14} /> LinkedIn URL
            </button>
          </div>

          {/* CV Upload zone */}
          {mode === 'cv' && (
            <CVUpload
              onChange={handleCVChange}
              onClear={handleCVClear}
              fileName={cvFileName}
              error={
                (errors as Record<string, { message?: string }>)['cvBase64']?.message
              }
            />
          )}

          {/* LinkedIn URL */}
          {mode === 'linkedin' && (
            <div className="space-y-1.5">
              <Input
                placeholder="https://linkedin.com/in/your-profile"
                type="url"
                inputMode="url"
                autoComplete="url"
                {...register('linkedinUrl' as keyof FormData)}
                className={cn(
                  (errors as Record<string, { message?: string }>)['linkedinUrl'] &&
                    'border-danger focus-visible:ring-danger/30',
                )}
              />
              {(errors as Record<string, { message?: string }>)['linkedinUrl']?.message && (
                <p className="text-xs text-danger">
                  {(errors as Record<string, { message?: string }>)['linkedinUrl']?.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
            {serverError}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" /> Submitting…
            </>
          ) : (
            'Submit Application'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By submitting, you agree that Lion Jobs Agency may share your details with the hiring company.
        </p>
      </form>

      <SuccessModal
        open={successOpen}
        jobTitle={watchedPosition || defaultPosition || 'this position'}
        onClose={() => setSuccessOpen(false)}
      />
    </>
  );
}
