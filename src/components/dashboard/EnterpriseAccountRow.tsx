'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContracts } from '@/hooks/useContracts';
import { useInteractions } from '@/hooks/useInteractions';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import { computeHealthBand } from '@/lib/clientHealth';
import type {
  Company,
  CompanyStatus,
  CseRep,
  ContractType,
  ContractStatus,
  InteractionType,
  HealthBand,
} from '@/types';

const HEALTH_DOT_STYLES: Record<HealthBand, string> = {
  green:  'bg-brand-500',
  yellow: 'bg-gold-500',
  red:    'bg-red-500',
};
const HEALTH_BADGE_KEYS: Record<HealthBand, TranslationKey> = {
  green:  'ent_health_badge_green',
  yellow: 'ent_health_badge_yellow',
  red:    'ent_health_badge_red',
};

const STATUS_STYLES: Record<CompanyStatus, string> = {
  Lead:          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  Active:        'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-200 dark:border-brand-700/40',
  'In-Contract': 'bg-gold-50 text-gold-700 border-gold-200 dark:bg-gold-600/20 dark:text-gold-400 dark:border-gold-600/40',
  Inactive:      'bg-muted text-muted-foreground border-border',
};
const STATUSES: CompanyStatus[] = ['Lead', 'Active', 'In-Contract', 'Inactive'];
const STATUS_KEYS: Record<CompanyStatus, TranslationKey> = {
  Lead: 'status_lead', Active: 'status_active', 'In-Contract': 'status_in_contract', Inactive: 'status_inactive',
};
const CONTRACT_TYPES: ContractType[] = ['Retainer', 'Contingency', 'Exclusive', 'Other'];
const CONTRACT_TYPE_KEYS: Record<ContractType, TranslationKey> = {
  Retainer: 'contract_type_retainer', Contingency: 'contract_type_contingency',
  Exclusive: 'contract_type_exclusive', Other: 'contract_type_other',
};
const CONTRACT_STATUSES: ContractStatus[] = ['Draft', 'Active', 'Completed', 'Terminated'];
const CONTRACT_STATUS_KEYS: Record<ContractStatus, TranslationKey> = {
  Draft: 'contract_status_draft', Active: 'contract_status_active',
  Completed: 'contract_status_completed', Terminated: 'contract_status_terminated',
};
const INTERACTION_TYPES: InteractionType[] = ['Call', 'Email', 'Meeting', 'Demo', 'Contract Sent', 'Other'];
const INTERACTION_TYPE_KEYS: Record<InteractionType, TranslationKey> = {
  Call: 'interaction_type_call', Email: 'interaction_type_email', Meeting: 'interaction_type_meeting',
  Demo: 'interaction_type_demo', 'Contract Sent': 'interaction_type_contract_sent', Other: 'interaction_type_other',
};

interface Props {
  company: Company;
  cseReps: CseRep[];
  onStatusChange: (id: string, status: CompanyStatus) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function EnterpriseAccountRow({ company, cseReps, onStatusChange, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { contracts, addContract, updateContract, deleteContract } = useContracts(company.id);
  const { interactions, logInteraction, deleteInteraction } = useInteractions(company.id);
  const { t } = useLanguage();

  const [contractForm, setContractForm] = useState({
    value: '', contractType: 'Retainer' as ContractType, cseId: '',
  });
  const [savingContract, setSavingContract] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: 'Call' as InteractionType, note: '',
  });
  const [savingInteraction, setSavingInteraction] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteContractId, setConfirmDeleteContractId] = useState<string | null>(null);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);
  const [confirmDeleteInteractionId, setConfirmDeleteInteractionId] = useState<string | null>(null);
  const [deletingInteractionId, setDeletingInteractionId] = useState<string | null>(null);

  const activeContracts = contracts.filter((c) => c.status === 'Active');
  const activeValue = activeContracts.reduce((sum, c) => sum + c.value, 0);
  const activeCurrency = activeContracts[0]?.currency ?? 'MMK';
  const lastContact = interactions[0]?.occurredAt ?? null;
  const assignedCseId = activeContracts.find((c) => c.cseId)?.cseId ?? null;
  const assignedCseName = cseReps.find((r) => r.id === assignedCseId)?.name ?? '—';
  const healthBand = computeHealthBand({
    status: company.status,
    lastContactedAt: lastContact,
    hasActiveContract: activeContracts.length > 0,
  });

  async function handleAddContract(e: React.FormEvent) {
    e.preventDefault();
    if (!contractForm.value) return;
    setSavingContract(true);
    try {
      const ok = await addContract({
        companyId: company.id,
        value: Number(contractForm.value),
        contractType: contractForm.contractType,
        cseId: contractForm.cseId || undefined,
        status: 'Active',
      });
      if (ok) setContractForm({ value: '', contractType: 'Retainer', cseId: '' });
    } finally {
      setSavingContract(false);
    }
  }

  async function handleLogInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!interactionForm.note) return;
    setSavingInteraction(true);
    try {
      const ok = await logInteraction({
        companyId: company.id,
        type: interactionForm.type,
        note: interactionForm.note,
      });
      if (ok) setInteractionForm({ type: 'Call', note: '' });
    } finally {
      setSavingInteraction(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(company.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleDeleteContract(id: string) {
    setDeletingContractId(id);
    try {
      await deleteContract(id);
    } finally {
      setDeletingContractId(null);
      setConfirmDeleteContractId(null);
    }
  }

  async function handleDeleteInteraction(id: string) {
    setDeletingInteractionId(id);
    try {
      await deleteInteraction(id);
    } finally {
      setDeletingInteractionId(null);
      setConfirmDeleteInteractionId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-sm">
            {company.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-foreground text-sm truncate">{company.name}</p>
              {healthBand && (
                <span
                  title={t(HEALTH_BADGE_KEYS[healthBand])}
                  className={cn('h-2 w-2 shrink-0 rounded-full', HEALTH_DOT_STYLES[healthBand])}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{assignedCseName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs">
          <span className={cn('rounded-full border px-2.5 py-1 font-semibold', STATUS_STYLES[company.status])}>
            {t(STATUS_KEYS[company.status])}
          </span>
          <span className="w-24 text-right font-semibold text-foreground">
            {activeValue > 0 ? `${activeValue.toLocaleString()} ${activeCurrency}` : '—'}
          </span>
          <span className="w-20 text-right text-muted-foreground hidden sm:inline">
            {lastContact ? new Date(lastContact).toLocaleDateString() : t('ent_row_no_contact')}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-5 bg-muted/20">
          {/* Status change */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{t('ent_row_status_label')}</span>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(company.id, s)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 font-semibold transition-colors',
                    s === company.status ? STATUS_STYLES[s] : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                >
                  {t(STATUS_KEYS[s])}
                </button>
              ))}
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-2 py-1">
                <AlertTriangle size={11} className="text-red-600 dark:text-red-400 shrink-0" />
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 size={10} className="animate-spin" /> : t('ent_row_confirm_yes')}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                >
                  {t('ent_row_confirm_no')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title={t('ent_row_delete_title')}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Contracts */}
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">{t('ent_row_contracts_title')}</h4>
            <div className="space-y-1.5">
              {contracts.length === 0 && (
                <p className="text-xs text-muted-foreground italic">{t('ent_row_no_contracts')}</p>
              )}
              {contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                >
                  <span className="font-medium">
                    {t(CONTRACT_TYPE_KEYS[c.contractType])} · {c.value.toLocaleString()} {c.currency}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={c.status}
                      onChange={(e) => updateContract(c.id, { status: e.target.value as ContractStatus })}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    >
                      {CONTRACT_STATUSES.map((s) => (
                        <option key={s} value={s}>{t(CONTRACT_STATUS_KEYS[s])}</option>
                      ))}
                    </select>
                    {confirmDeleteContractId === c.id ? (
                      <div className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-1.5 py-0.5">
                        <button
                          onClick={() => handleDeleteContract(c.id)}
                          disabled={deletingContractId === c.id}
                          className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deletingContractId === c.id ? <Loader2 size={9} className="animate-spin" /> : t('ent_row_confirm_yes')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteContractId(null)}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                        >
                          {t('ent_row_confirm_no')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteContractId(c.id)}
                        title={t('ent_row_delete_contract_title')}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddContract} className="mt-2 flex flex-wrap gap-2">
              <input
                type="number"
                min="0"
                placeholder={t('ent_row_value_placeholder')}
                value={contractForm.value}
                onChange={(e) => setContractForm({ ...contractForm, value: e.target.value })}
                className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              />
              <select
                value={contractForm.contractType}
                onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value as ContractType })}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                {CONTRACT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{t(CONTRACT_TYPE_KEYS[ct])}</option>
                ))}
              </select>
              <select
                value={contractForm.cseId}
                onChange={(e) => setContractForm({ ...contractForm, cseId: e.target.value })}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                <option value="">{t('ent_row_unassigned_cse')}</option>
                {cseReps.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={savingContract}
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {savingContract ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} {t('ent_row_add_contract_btn')}
              </button>
            </form>
          </div>

          {/* Interactions */}
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">{t('ent_row_interactions_title')}</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {interactions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">{t('ent_row_no_interactions')}</p>
              )}
              {interactions.map((i) => (
                <div key={i.id} className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{t(INTERACTION_TYPE_KEYS[i.type])}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-muted-foreground">
                        {new Date(i.occurredAt).toLocaleDateString()}
                      </span>
                      {confirmDeleteInteractionId === i.id ? (
                        <div className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-1.5 py-0.5">
                          <button
                            onClick={() => handleDeleteInteraction(i.id)}
                            disabled={deletingInteractionId === i.id}
                            className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {deletingInteractionId === i.id ? <Loader2 size={9} className="animate-spin" /> : t('ent_row_confirm_yes')}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteInteractionId(null)}
                            className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                          >
                            {t('ent_row_confirm_no')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteInteractionId(i.id)}
                          title={t('ent_row_delete_interaction_title')}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{i.note}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleLogInteraction} className="mt-2 flex flex-wrap gap-2">
              <select
                value={interactionForm.type}
                onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value as InteractionType })}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                {INTERACTION_TYPES.map((it) => (
                  <option key={it} value={it}>{t(INTERACTION_TYPE_KEYS[it])}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t('ent_row_note_placeholder')}
                value={interactionForm.note}
                onChange={(e) => setInteractionForm({ ...interactionForm, note: e.target.value })}
                className="flex-1 min-w-[140px] rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={savingInteraction}
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {savingInteraction ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} {t('ent_row_log_btn')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
