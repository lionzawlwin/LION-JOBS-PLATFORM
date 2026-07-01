'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Building2, Mail, Phone, MapPin, Loader2, ChevronDown, X, Send, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Company, CompanyStatus } from '@/types';

const STATUS_STYLES: Record<CompanyStatus, string> = {
  Lead:          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  Active:        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30',
  'In-Contract': 'bg-gold-50 text-gold-700 border-gold-200 dark:bg-gold-600/20 dark:text-gold-400 dark:border-gold-600/40',
  Inactive:      'bg-muted text-muted-foreground border-border',
};

const STATUSES: CompanyStatus[] = ['Lead', 'Active', 'In-Contract', 'Inactive'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Education', 'Hospitality', 'Construction', 'Media', 'NGO', 'Other'];

export function CompaniesView() {
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('');
  const [emailSending, setEmailSending]       = useState<string | null>(null);
  const [emailType, setEmailType]             = useState<'welcome' | 'outreach'>('welcome');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    industry: 'Technology', city: 'Yangon', status: 'Lead' as CompanyStatus, notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) setCompanies(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: '', contactPerson: '', email: '', phone: '', industry: 'Technology', city: 'Yangon', status: 'Lead', notes: '' });
        setShowForm(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: CompanyStatus) {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== id));
        window.dispatchEvent(new CustomEvent('companies:revalidate'));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function sendEmail(company: Company) {
    setEmailSending(company.id);
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          to:   company.email,
          data: { contactPerson: company.contactPerson || company.name, companyName: company.name },
        }),
      });
      alert(`✅ ${emailType === 'welcome' ? 'Welcome' : 'Outreach'} email sent to ${company.email}`);
    } catch {
      alert('❌ Failed to send email. Check RESEND_API_KEY.');
    } finally {
      setEmailSending(null);
    }
  }

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = { total: companies.length, leads: companies.filter((c) => c.status === 'Lead').length, clients: companies.filter((c) => c.status === 'Active' || c.status === 'In-Contract').length };

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Companies', value: stats.total, color: 'text-foreground' },
          { label: 'Leads',           value: stats.leads,   color: 'text-blue-600' },
          { label: 'Active Clients',  value: stats.clients, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-3xl font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 w-56"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as 'welcome' | 'outreach')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
          >
            <option value="welcome">Welcome Email</option>
            <option value="outreach">Outreach Email</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={15} /> Add Company
          </button>
        </div>
      </div>

      {/* Add Company Form */}
      {showForm && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-700/30 dark:bg-brand-600/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Add New Company</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Company Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input required type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CompanyStatus })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Add Company'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Companies List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 size={36} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{search || statusFilter ? 'No companies match your filter.' : 'No companies yet. Add your first B2B client.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((co) => (
            <div key={co.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-sm">
                    {co.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm leading-tight">{co.name}</p>
                    {co.contactPerson && <p className="text-xs text-muted-foreground">{co.contactPerson}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Status dropdown */}
                  <div className="relative group">
                    <button className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[co.status])}>
                      {co.status} <ChevronDown size={10} />
                    </button>
                    <div className="absolute right-0 top-full z-10 mt-1 hidden group-hover:block rounded-xl border border-border bg-card shadow-lg">
                      {STATUSES.map((s) => (
                        <button key={s} onClick={() => changeStatus(co.id, s)} className={cn('block w-full px-4 py-2 text-xs text-left hover:bg-accent first:rounded-t-xl last:rounded-b-xl', s === co.status && 'font-semibold')}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Delete button */}
                  {confirmDeleteId === co.id ? (
                    <div className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-2 py-1">
                      <AlertTriangle size={11} className="text-red-600 dark:text-red-400 shrink-0" />
                      <button
                        onClick={() => handleDelete(co.id)}
                        disabled={deletingId === co.id}
                        className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === co.id ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(co.id)}
                      title="Delete company"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {co.email   && <p className="flex items-center gap-1.5"><Mail   size={11} /> {co.email}</p>}
                {co.phone   && <p className="flex items-center gap-1.5"><Phone  size={11} /> {co.phone}</p>}
                {co.city    && <p className="flex items-center gap-1.5"><MapPin size={11} /> {co.city} · {co.industry}</p>}
                {co.notes   && <p className="mt-2 text-xs italic text-muted-foreground/70 line-clamp-2">{co.notes}</p>}
              </div>

              {co.email && (
                <button
                  onClick={() => sendEmail(co)}
                  disabled={emailSending === co.id}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {emailSending === co.id
                    ? <><Loader2 size={12} className="animate-spin" /> Sending…</>
                    : <><Send size={12} /> Send {emailType === 'welcome' ? 'Welcome' : 'Outreach'} Email</>
                  }
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
