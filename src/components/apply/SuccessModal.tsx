'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SuccessModalProps {
  open: boolean;
  jobTitle: string;
  onClose: () => void;
}

export function SuccessModal({ open, jobTitle, onClose }: SuccessModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-8 shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Check icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', bounce: 0.5 }}
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            >
              <CheckCircle2 size={32} />
            </motion.div>

            <h2
              id="success-title"
              className="text-center text-xl font-bold text-foreground"
            >
              Application Submitted!
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Your application for <span className="font-medium text-foreground">{jobTitle}</span> has been received. Our team will review it and reach out within 48 hours.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {/* WhatsApp follow-up CTA */}
              <a
                href="https://wa.me/959770000000?text=Hi%20Lion%20Jobs!%20I%20just%20applied%20for%20a%20position%20and%20wanted%20to%20follow%20up."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <MessageCircle size={16} />
                Follow up on WhatsApp
              </a>

              <Link
                href="/"
                onClick={onClose}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center')}
              >
                <ArrowLeft size={14} className="mr-1.5" /> Browse More Jobs
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
