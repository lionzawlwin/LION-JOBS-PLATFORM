'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  url: string;
  title: string;
  company: string;
  className?: string;
}

export function ShareButton({ url, title, company, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareData = {
      title: `${title} at ${company}`,
      text:  `Check out this job: ${title} at ${company}`,
      url,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Clipboard fallback (desktop / browsers without Web Share API)
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort — select text in a temp input
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(); }}
      aria-label={copied ? 'Link copied!' : 'Share this job'}
      title={copied ? 'Link copied!' : 'Share this job'}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border',
        'text-muted-foreground transition-colors',
        'hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600',
        'dark:hover:border-brand-600/40 dark:hover:bg-brand-600/10 dark:hover:text-brand-400',
        copied && 'border-green-400 bg-green-50 text-green-600 dark:border-green-600/40 dark:bg-green-600/10 dark:text-green-400',
        className,
      )}
    >
      {copied ? <Check size={13} /> : <Share2 size={13} />}
    </button>
  );
}
