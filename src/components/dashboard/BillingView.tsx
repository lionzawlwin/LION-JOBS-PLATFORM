'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Printer, FileText, AlertTriangle } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '@/types';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft:   'bg-muted text-muted-foreground border-border',
  Sent:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  Paid:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30',
  Overdue: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30',
};

const STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function BillingView() {
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [statusFilter, setStatusFilter]   = useState<InvoiceStatus | ''>('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [savingId, setSavingId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) {
        setError(true);
        return;
      }
      setInvoices(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(id: string, status: InvoiceStatus) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      });
      if (!res.ok) {
        alert('Could not update invoice status. Please try again.');
        return;
      }
      setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status } : inv));
    } finally {
      setSavingId(null);
    }
  }

  const companyNames = Array.from(new Set(invoices.map((inv) => inv.companyName))).sort();
  const filtered = invoices.filter((inv) =>
    (!statusFilter || inv.status === statusFilter) &&
    (!companyFilter || inv.companyName === companyFilter),
  );

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">Invoices</h3>
        <div className="flex gap-2">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">All companies</option>
            {companyNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertTriangle size={36} className="text-red-500/60" />
          <p className="text-sm text-muted-foreground">Couldn&apos;t load invoices. Please try again.</p>
          <button
            onClick={() => load()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText size={36} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No invoices yet. Generate one from a Hired candidate&apos;s drawer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3">Invoice #</th>
                <th className="p-3">Company</th>
                <th className="p-3">Candidate / Position</th>
                <th className="p-3">Fee (MMK)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Issued</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50">
                  <td className="p-3 font-medium text-foreground">{inv.invoiceNumber}</td>
                  <td className="p-3 text-muted-foreground">{inv.companyName}</td>
                  <td className="p-3 text-muted-foreground">{inv.candidateName} · {inv.position}</td>
                  <td className="p-3 text-muted-foreground">{inv.commissionFeeMmk.toLocaleString()}</td>
                  <td className="p-3">
                    <select
                      value={inv.status}
                      onChange={(e) => changeStatus(inv.id, e.target.value as InvoiceStatus)}
                      disabled={savingId === inv.id}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[inv.status]}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-muted-foreground">{fmtDate(inv.issuedAt)}</td>
                  <td className="p-3">
                    <a
                      href={`/dashboard/billing/invoice/${inv.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      <Printer size={12} /> Print
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
