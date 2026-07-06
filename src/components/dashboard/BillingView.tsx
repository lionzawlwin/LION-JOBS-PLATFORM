'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Printer, FileText, AlertTriangle, Banknote, X } from 'lucide-react';
import { RevenueOverviewPanel } from './RevenueOverviewPanel';
import { AccountPlansPanel } from './AccountPlansPanel';
import { PlanUpgradeRequestsInbox } from './PlanUpgradeRequestsInbox';
import { FeaturedPlacementRequestsInbox } from './FeaturedPlacementRequestsInbox';
import { FeaturedPlacementSettingsPanel } from './FeaturedPlacementSettingsPanel';
import { JobBoostRequestsInbox } from './JobBoostRequestsInbox';
import { JobBoostSettingsPanel } from './JobBoostSettingsPanel';
import { StatusStepper } from '@/components/ui/StatusStepper';
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types';

// Stepper sequence for the invoice lifecycle. 'Paid' is shown as the final
// step so staff can see where an invoice is heading, but clicking it is a
// no-op -- it's only ever reachable via "Record Payment" (see migration
// 0026's comment on STATUSES below).
const INVOICE_STEPS: { value: InvoiceStatus; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent',  label: 'Sent' },
  { value: 'Paid',  label: 'Paid' },
];

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft:   'bg-muted text-muted-foreground border-border',
  Sent:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  Paid:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30',
  Overdue: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30',
};

// Full set, used only for the "All statuses" filter dropdown above the
// table -- staff filtering the list can still search for Paid invoices,
// distinct from the per-row editor below (which excludes Paid; see
// INVOICE_STEPS' comment).
const FILTER_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'kbzpay',        label: 'KBZPay' },
  { value: 'wavepay',       label: 'WavePay' },
  { value: 'cash',          label: 'Cash' },
  { value: 'other',         label: 'Other' },
];

function RecordPaymentModal({
  invoice, onClose, onRecorded,
}: {
  invoice: Invoice;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [amountMmk, setAmountMmk] = useState(invoice.commissionFeeMmk);
  const [method, setMethod]       = useState<PaymentMethod>('bank_transfer');
  const [paidAt, setPaidAt]       = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function submit() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amountMmk, method, paidAt, notes: notes || undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Could not record payment.');
        return;
      }
      onRecorded();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-bold text-foreground">Record Payment — {invoice.invoiceNumber}</h4>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">Amount (MMK)</label>
            <input
              type="number" min={1} value={amountMmk}
              onChange={(e) => setAmountMmk(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">Method</label>
            <select
              value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">Date Received</label>
            <input
              type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">Notes (optional)</label>
            <input
              type="text" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
              placeholder="Reference number, bank name, etc."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Cancel
          </button>
          <button
            onClick={submit} disabled={saving || amountMmk <= 0}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
            Confirm Paid
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);

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
      <RevenueOverviewPanel />
      <PlanUpgradeRequestsInbox />
      <FeaturedPlacementSettingsPanel />
      <FeaturedPlacementRequestsInbox />
      <JobBoostSettingsPanel />
      <JobBoostRequestsInbox />
      <AccountPlansPanel />

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
            {FILTER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                    {inv.status === 'Paid' ? (
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES.Paid}`}>Paid</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <StatusStepper
                          steps={INVOICE_STEPS}
                          current={inv.status === 'Overdue' ? 'Sent' : inv.status}
                          offPath={inv.status === 'Overdue' ? { label: 'Overdue', tone: 'danger' } : null}
                          onSelect={(s) => {
                            if (s === 'Paid' || savingId === inv.id) return;
                            changeStatus(inv.id, s);
                          }}
                        />
                        {inv.status === 'Sent' && (
                          <button
                            onClick={() => changeStatus(inv.id, 'Overdue')}
                            disabled={savingId === inv.id}
                            className="shrink-0 text-[10px] font-semibold text-muted-foreground underline decoration-dotted hover:text-red-600"
                          >
                            Mark overdue
                          </button>
                        )}
                        {inv.status === 'Overdue' && (
                          <button
                            onClick={() => changeStatus(inv.id, 'Sent')}
                            disabled={savingId === inv.id}
                            className="shrink-0 text-[10px] font-semibold text-muted-foreground underline decoration-dotted hover:text-foreground"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{fmtDate(inv.issuedAt)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/dashboard/billing/invoice/${inv.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                      >
                        <Printer size={12} /> Print
                      </a>
                      {inv.status !== 'Paid' && (
                        <button
                          onClick={() => setPaymentModalInvoice(inv)}
                          className="flex w-fit items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                        >
                          <Banknote size={12} /> Record Payment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paymentModalInvoice && (
        <RecordPaymentModal
          invoice={paymentModalInvoice}
          onClose={() => setPaymentModalInvoice(null)}
          onRecorded={() => {
            setInvoices((prev) => prev.map((inv) =>
              inv.id === paymentModalInvoice.id ? { ...inv, status: 'Paid' } : inv,
            ));
            setPaymentModalInvoice(null);
          }}
        />
      )}
    </div>
  );
}
