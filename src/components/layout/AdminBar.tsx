'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LayoutDashboard, Shield } from 'lucide-react';

const ADMIN_EMAIL = 'lionzawlwin@gmail.com';

export function AdminBar() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated') return null;
  if (session?.user?.email !== ADMIN_EMAIL) return null;

  return (
    <div className="border-t-2 border-dashed border-brand-300/50 dark:border-brand-600/30 bg-brand-50 dark:bg-brand-600/5">
      <div className="mx-auto max-w-7xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-700 dark:text-brand-300">Admin Control Panel</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 transition-all"
        >
          <LayoutDashboard size={16} />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
