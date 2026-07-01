'use client';

import { useState, useMemo } from 'react';
import { Plus, Building2, Loader2, Users2 } from 'lucide-react';
import { useEnterpriseAccounts } from '@/hooks/useEnterpriseAccounts';
import { useEnterpriseStats } from '@/hooks/useEnterpriseStats';
import { useCseReps } from '@/hooks/useCseReps';
import { useAllContracts } from '@/hooks/useContracts';
import { EnterpriseAccountRow } from './EnterpriseAccountRow';
import { ManageCseModal } from './ManageCseModal';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import type { CompanyStatus } from '@/types';

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

export function EnterpriseView() {
  const { accounts, loading, updateStatus, addAccount, deleteAccount } = useEnterpriseAccounts();
  const { stats } = useEnterpriseStats();
  const { cseReps } = useCseReps();
  const { contracts: allContracts } = useAllContracts();
  const { t } = useLanguage();

  const assignedCseByCompany = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allContracts) {
      if (c.status !== 'Active' || !c.cseId) continue;
      if (!map.has(c.companyId)) {
        map.set(c.companyId, c.cseId);
      }
    }
    return map;
  }, [allContracts]);

  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('');
  const [cseFilter, setCseFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCseModal, setShowCseModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    industry: 'Technology', city: 'Yangon', notes: '',
  });

  const filtered = accounts.filter((a) => {
    const matchStatus = !statusFilter || a.status === statusFilter;
    const matchCse = !cseFilter || assignedCseByCompany.get(a.id) === cseFilter;
    return matchStatus && matchCse;
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const ok = await addAccount(form);
      if (ok) {
        setForm({ name: '', contactPerson: '', email: '', phone: '', industry: 'Technology', city: 'Yangon', notes: '' });
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50 to-transparent p-5 shadow-sm dark:border-gold-600/30 dark:from-gold-500/10">
          <p className="text-xs font-medium text-muted-foreground">{t('ent_kpi_total_value')}</p>
          <p className="mt-1 text-2xl font-bold text-gold-700 dark:text-gold-400">
            {stats.totalActiveContractValue.toLocaleString()} MMK
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t('ent_kpi_active_count')}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.activeContractsCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t('ent_kpi_account_count')}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.enterpriseAccountsCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t('ent_kpi_top_cse')}</p>
          <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-200 truncate">
            {stats.topCse ? stats.topCse.name : '—'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">{t('ent_filter_all_status')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(STATUS_KEYS[s])}</option>
            ))}
          </select>
          <select
            value={cseFilter}
            onChange={(e) => setCseFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">{t('ent_filter_all_cse')}</option>
            {cseReps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCseModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Users2 size={15} /> {t('ent_manage_cses_btn')}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={15} /> {t('ent_add_account_btn')}
          </button>
        </div>
      </div>

      {/* Add Account form */}
      {showForm && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-700/30 dark:bg-brand-600/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{t('ent_form_title')}</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
            <input required placeholder={t('ent_form_name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder={t('ent_form_contact_person')} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input required type="email" placeholder={t('ent_form_email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder={t('ent_form_phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
              {INDUSTRIES.map((i) => <option key={i} value={i}>{t(INDUSTRY_KEYS[i])}</option>)}
            </select>
            <input placeholder={t('ent_form_city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder={t('ent_form_notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">{t('ent_form_cancel')}</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" /> {t('ent_form_saving')}</> : t('ent_form_submit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 size={36} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {(statusFilter || cseFilter) ? t('ent_empty_filtered') : t('ent_empty_no_accounts')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((account) => (
            <EnterpriseAccountRow
              key={account.id}
              company={account}
              cseReps={cseReps}
              onStatusChange={updateStatus}
              onDelete={deleteAccount}
            />
          ))}
        </div>
      )}

      {showCseModal && <ManageCseModal onClose={() => setShowCseModal(false)} />}
    </div>
  );
}
