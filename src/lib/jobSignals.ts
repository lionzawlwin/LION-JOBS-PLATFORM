import { Job } from '@/types';

export interface JobSignal {
  label: string;
  variant: 'urgent' | 'popular' | 'closing' | 'new' | 'featured';
}

const ONE_DAY_MS = 86_400_000;

export function getJobSignals(job: Job): JobSignal[] {
  const signals: JobSignal[] = [];
  const now = Date.now();

  if (job.isUrgent) {
    signals.push({ label: 'Urgent Hire', variant: 'urgent' });
  }

  if (job.isFeatured) {
    signals.push({ label: 'Featured', variant: 'featured' });
  }

  const postedMs = job.postedAt ? new Date(job.postedAt).getTime() : 0;
  if (postedMs && now - postedMs < 3 * ONE_DAY_MS) {
    signals.push({ label: 'New', variant: 'new' });
  }

  if (job.applicationsCount && job.applicationsCount >= 10) {
    signals.push({
      label: `${job.applicationsCount}+ applied`,
      variant: 'popular',
    });
  }

  if (job.deadline) {
    const deadlineMs = new Date(job.deadline).getTime();
    const daysLeft = Math.ceil((deadlineMs - now) / ONE_DAY_MS);
    if (daysLeft > 0 && daysLeft <= 5) {
      signals.push({ label: `Closes in ${daysLeft}d`, variant: 'closing' });
    }
  }

  return signals;
}
