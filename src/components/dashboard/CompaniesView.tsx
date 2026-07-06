'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Building2, Mail, Phone, MapPin, Loader2, X, Send, Trash2, AlertTriangle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { StatusStepper } from '@/components/ui/StatusStepper';
import type { TranslationKey } from '@/lib/i18n';
import type { Company, CompanyStatus } from '@/types';

// Lead -> Active -> In-Contract is the real progression a company moves
// through; Inactive is an exception exit, not a 4th linear step (a company
// can go Inactive from any of the other three), so it's an off-path badge
// instead of forcing it into the sequence.
const COMPANY_STEPS: { value: CompanyStatus; label: TranslationKey }[] = [
  { value: 'Lead',         label: 'status_lead' },
  { value: 'Active',       label: 'status_active' },
  { value: 'In-Contract',  label: 'status_in_contract' },
];

const STATUSES: CompanyStatus[] = ['Lead', 'Active', 'In-Contract', 'Inactive'];
const STATUS_KEYS: Record<CompanyStatus, TranslationKey> = {
  Lead: 'status_lead', Active: 'status_active', 'In-Contract': 'status_in_contract', Inactive: 'status_inactive',
};
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Education', 'Hospitality', 'Construction', 'Media', 'NGO', 'Other'];
const INDUSTRY_KEYS: Record<string, TranslationKey> = {
  Technology: 'industry_technology', Finance: 'industry_finance', Healthcare: 'industry_healthcare',
  Manufacturing: 'industry_manufacturing', Retail: 'industry_retail', Education: 'industry_education',
  Hospitality: 'industry_hospitality', Construction: 'industry_construction', Media: 'industry_media',
  NGO: 'industry_ngo', Other: 'industry_other',
};

export function CompaniesView() {
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('');
  const [showInternal, setShowInternal]       = useState(false);
  const [familyFilter, setFamilyFilter]       = useState('');
  const [emailSending, setEmailSending]       = useState<string | null>(null);
  const [emailType, setEmailType]             = useState<'welcome' | 'outreach'>('welcome');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    industry: 'Technology', city: 'Yangon', status: 'Lead' as CompanyStatus, notes: '',
    isInternal: false,
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
        if (form.isInternal) setShowInternal(true);
        setForm({ name: '', contactPerson: '', email: '', phone: '', industry: 'Technology', city: 'Yangon', status: 'Lead', notes: '', isInternal: false });
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

  async function toggleInternal(id: string, isInternal: boolean) {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isInternal }),
    });
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, isInternal } : c));
  }

  async function toggleFeatured(id: string, isFeatured: boolean) {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFeatured }),
    });
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, isFeatured } : c));
  }

  async function setParent(id: string, parentAccountId: string | null) {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentAccountId }),
    });
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, parentAccountId } : c));
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
      alert(`${t('cv_alert_email_sent_prefix')}${emailType === 'welcome' ? t('cv_welcome_email') : t('cv_outreach_email')}${t('cv_alert_email_sent_suffix')}${company.email}`);
    } catch {
      alert(t('cv_alert_email_failed'));
    } finally {
      setEmailSending(null);
    }
  }

  const companyById = new Map(companies.map((c) => [c.id, c]));
  const childIds = new Set(companies.filter((c) => c.parentAccountId).map((c) => c.parentAccountId as string));
  // Layer 12: only companies with at least one child are offered as a
  // "family" to filter/group by -- a company nobody has joined isn't a
  // family yet.
  const familyOptions = companies.filter((c) => childIds.has(c.id));

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchInternal = showInternal || !c.isInternal;
    const matchFamily = familyFilter === ''
      ? true
      : familyFilter === '__standalone__'
        ? !c.parentAccountId && !childIds.has(c.id)
        : c.id === familyFilter || c.parentAccountId === familyFilter;
    return matchSearch && matchStatus && matchInternal && matchFamily;
  });

  const stats = { total: companies.length, leads: companies.filter((c) => c.status === 'Lead').length, clients: companies.filter((c) => c.status === 'Active' || c.status === 'In-Contract').length };

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('cv_total_companies'), value: stats.total, color: 'text-foreground' },
          { label: t('ov_pipeline_leads'),  value: stats.leads,   color: 'text-blue-600' },
          { label: t('cv_active_clients'),  value: stats.clients, color: 'text-emerald-600' },
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
            placeholder={t('cv_search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 w-56"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">{t('ent_filter_all_status')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEYS[s])}</option>)}
          </select>
          <label className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showInternal}
              onChange={(e) => setShowInternal(e.target.checked)}
              className="rounded border-border"
            />
            Show internal
          </label>
          {familyOptions.length > 0 && (
            <select
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="">All accounts</option>
              <option value="__standalone__">Standalone only</option>
              {familyOptions.map((f) => (
                <option key={f.id} value={f.id}>Family: {f.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as 'welcome' | 'outreach')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none"
          >
            <option value="welcome">{t('cv_welcome_email')}</option>
            <option value="outreach">{t('cv_outreach_email')}</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={15} /> {t('cv_add_company_btn')}
          </button>
        </div>
      </div>

      {/* Add Company Form */}
      {showForm && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-700/30 dark:bg-brand-600/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{t('cv_add_new_company_title')}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t('ent_form_name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder={t('ent_form_contact_person')} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input required type="email" placeholder={t('ent_form_email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder={t('ent_form_phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
              {INDUSTRIES.map((i) => <option key={i} value={i}>{t(INDUSTRY_KEYS[i])}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CompanyStatus })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
              {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEYS[s])}</option>)}
            </select>
            <input placeholder={t('ent_form_city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder={t('ent_form_notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isInternal}
                onChange={(e) => setForm({ ...form, isInternal: e.target.checked })}
                className="rounded border-border"
              />
              Internal (group brand) — no invoicing, hidden from the pipeline view by default
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">{t('ent_form_cancel')}</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" /> {t('cv_saving')}</> : t('cv_add_company_btn')}
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
          <p className="text-sm text-muted-foreground">{companies.length > 0 ? t('cv_no_match') : t('cv_no_companies')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((co) => (
            <div key={co.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              {/* Header row: identity (left) + status (right) -- kept to just
                  these two so neither competes for space with the action
                  buttons below. */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-sm">
                    {co.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground text-sm leading-tight">{co.name}</p>
                    {co.contactPerson && <p className="truncate text-xs text-muted-foreground">{co.contactPerson}</p>}
                    {co.parentAccountId && companyById.get(co.parentAccountId) && (
                      <p className="truncate text-[11px] text-brand-600 dark:text-brand-300">
                        Part of {companyById.get(co.parentAccountId)!.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status stepper -- its own full-width row so the connected
                  dots have room, rather than crammed into the header corner. */}
              <div className="mt-3 flex items-center gap-2">
                <StatusStepper
                  steps={COMPANY_STEPS.map((s) => ({ value: s.value, label: t(s.label) }))}
                  current={co.status === 'Inactive' ? 'Lead' : co.status}
                  offPath={co.status === 'Inactive' ? { label: t(STATUS_KEYS.Inactive), tone: 'neutral' } : null}
                  onSelect={(s) => changeStatus(co.id, s)}
                />
                {co.status === 'Inactive' ? (
                  <button
                    onClick={() => changeStatus(co.id, 'Lead')}
                    className="shrink-0 text-[10px] font-semibold text-muted-foreground underline decoration-dotted hover:text-foreground"
                  >
                    Reactivate
                  </button>
                ) : (
                  <button
                    onClick={() => changeStatus(co.id, 'Inactive')}
                    className="shrink-0 text-[10px] font-semibold text-muted-foreground underline decoration-dotted hover:text-red-600"
                  >
                    Mark inactive
                  </button>
                )}
              </div>

              {/* Action bar: its own row with breathing room, separated from
                  the header by a divider -- toggles grouped on the left,
                  destructive action pinned to the right so it's never
                  mistaken for a peer of the other two. */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFeatured(co.id, !co.isFeatured)}
                    title={co.isFeatured ? 'Remove from Featured Employers' : 'Mark as Featured Employer'}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                      co.isFeatured
                        ? 'border-gold-300 bg-gold-50 text-gold-600 dark:border-gold-600/40 dark:bg-gold-600/10 dark:text-gold-400'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    <Star size={12} fill={co.isFeatured ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => toggleInternal(co.id, !co.isInternal)}
                    title={co.isInternal ? 'Mark as external client' : 'Mark as internal (group brand)'}
                    className={cn(
                      'whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                      co.isInternal
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {co.isInternal ? 'Internal' : 'Mark internal'}
                  </button>
                </div>

                {confirmDeleteId === co.id ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-2 py-1">
                    <AlertTriangle size={11} className="text-red-600 dark:text-red-400 shrink-0" />
                    <button
                      onClick={() => handleDelete(co.id)}
                      disabled={deletingId === co.id}
                      className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === co.id ? <Loader2 size={10} className="animate-spin" /> : t('ent_row_confirm_yes')}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                    >
                      {t('ent_row_confirm_no')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(co.id)}
                    title={t('cv_delete_company_title')}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {co.email   && <p className="flex items-center gap-1.5"><Mail   size={11} /> {co.email}</p>}
                {co.phone   && <p className="flex items-center gap-1.5"><Phone  size={11} /> {co.phone}</p>}
                {co.city    && <p className="flex items-center gap-1.5"><MapPin size={11} /> {co.city} · {co.industry}</p>}
                {co.notes   && <p className="mt-2 text-xs italic text-muted-foreground/70 line-clamp-2">{co.notes}</p>}
              </div>

              <label className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Group under
                <select
                  value={co.parentAccountId ?? ''}
                  onChange={(e) => setParent(co.id, e.target.value || null)}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value="">— standalone —</option>
                  {companies
                    .filter((other) => other.id !== co.id && other.parentAccountId !== co.id)
                    .map((other) => (
                      <option key={other.id} value={other.id}>{other.name}</option>
                    ))}
                </select>
              </label>

              {co.email && (
                <button
                  onClick={() => sendEmail(co)}
                  disabled={emailSending === co.id}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {emailSending === co.id
                    ? <><Loader2 size={12} className="animate-spin" /> {t('cv_sending')}</>
                    : <><Send size={12} /> {t('cv_send_prefix')}{emailType === 'welcome' ? t('cv_welcome_email') : t('cv_outreach_email')}</>
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
