'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building2, Briefcase, FileText, FileSignature, LogOut, MapPin, ArrowUpCircle, Check, Eye } from 'lucide-react';

interface JobSummary {
  id: string;
  title: string;
  location: string;
  category: string;
  type: string;
  postedAt: string;
  viewCount: number;
  applicantCounts: { Applied: number; Shortlisted: number; Interview: number; Hired: number };
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  position: string;
  agreedSalary: number;
  commissionFeeMmk: number;
  status: string;
  issuedAt: string;
}

interface ContractSummary {
  id: string;
  contractType: string;
  status: string;
  value: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
}

interface InsightsSummary {
  totalJobsPosted: number;
  totalViews: number;
  totalApplicants: number;
  viewToApplyRate: number | null;
  hiredCount: number;
  fillRate: number | null;
  avgMatchScore: number | null;
  avgDaysToFirstApplicantHired: number | null;
}

interface MeResponse {
  company: { id: string; name: string; industry: string; city: string; tier: string };
  insights: InsightsSummary;
  jobs: JobSummary[];
  invoices: InvoiceSummary[];
  contracts: ContractSummary[];
}

export function CompanyPortalClientImpl() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestingSlots, setRequestingSlots] = useState(false);
  const [slotRequestSent, setSlotRequestSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/company-portal/me');
        if (res.status === 401) { router.replace('/company/portal/login'); return; }
        if (!res.ok) { if (!cancelled) setError(true); return; }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleRequestMoreSlots() {
    setRequestingSlots(true);
    try {
      const res = await fetch('/api/company-portal/plan-upgrade-request', { method: 'POST' });
      if (res.ok) setSlotRequestSent(true);
    } finally {
      setRequestingSlots(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/company-portal/logout', { method: 'POST' });
    router.replace('/company/portal/login');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your portal. Please try signing in again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Building2 size={18} /></span>
            <div>
              <h1 className="text-sm font-bold text-foreground">{data.company.name}</h1>
              <p className="text-xs text-muted-foreground">{data.company.industry} · {data.company.city}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">Your Hiring Insights</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Jobs Posted</p>
              <p className="mt-1 text-xl font-bold text-foreground">{data.insights.totalJobsPosted}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Job Views</p>
              <p className="mt-1 text-xl font-bold text-foreground">{data.insights.totalViews}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Applicants</p>
              <p className="mt-1 text-xl font-bold text-foreground">{data.insights.totalApplicants}</p>
              {data.insights.viewToApplyRate !== null && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{Math.round(data.insights.viewToApplyRate * 100)}% of viewers applied</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Fill Rate</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {data.insights.fillRate !== null ? `${Math.round(data.insights.fillRate * 100)}%` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Avg. Days to First Hire Applying</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {data.insights.avgDaysToFirstApplicantHired !== null ? `${data.insights.avgDaysToFirstApplicantHired}d` : '—'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            {slotRequestSent ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Request sent — your CSE will follow up.
              </span>
            ) : (
              <button
                onClick={handleRequestMoreSlots}
                disabled={requestingSlots}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60"
              >
                {requestingSlots
                  ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                  : <><ArrowUpCircle size={13} /> Request more job slots</>
                }
              </button>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <Briefcase size={16} /> Your Open Positions ({data.jobs.length})
          </h2>
          {data.jobs.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No positions found under this account yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{job.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> {job.location} · {job.type}</p>
                    </div>
                    <div className="flex gap-3 text-center text-xs">
                      <div><p className="flex items-center justify-center gap-1 font-bold text-foreground"><Eye size={11} className="text-muted-foreground" />{job.viewCount}</p><p className="text-muted-foreground">Views</p></div>
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Applied}</p><p className="text-muted-foreground">Applied</p></div>
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Shortlisted}</p><p className="text-muted-foreground">Shortlisted</p></div>
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Interview}</p><p className="text-muted-foreground">Interview</p></div>
                      <div><p className="font-bold text-emerald-600">{job.applicantCounts.Hired}</p><p className="text-muted-foreground">Hired</p></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText size={16} /> Invoices ({data.invoices.length})
          </h2>
          {data.invoices.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No invoices issued yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Position</th>
                    <th className="p-3">Fee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50">
                      <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.position}</td>
                      <td className="p-3">{inv.commissionFeeMmk.toLocaleString()} MMK</td>
                      <td className="p-3">{inv.status}</td>
                      <td className="p-3 text-muted-foreground">{new Date(inv.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileSignature size={16} /> Contracts ({data.contracts.length})
          </h2>
          {data.contracts.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No contracts on file yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.contracts.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.contractType}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {' – '}
                      {c.endDate ? new Date(c.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'ongoing'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{c.value.toLocaleString()} {c.currency}</p>
                    <p className="text-xs text-muted-foreground">{c.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
