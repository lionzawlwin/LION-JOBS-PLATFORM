'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContracts } from '@/hooks/useContracts';
import { useInteractions } from '@/hooks/useInteractions';
import type {
  Company,
  CompanyStatus,
  CseRep,
  ContractType,
  ContractStatus,
  InteractionType,
} from '@/types';

const STATUS_STYLES: Record<CompanyStatus, string> = {
  Lead:          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  Active:        'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-200 dark:border-brand-700/40',
  'In-Contract': 'bg-gold-50 text-gold-700 border-gold-200 dark:bg-gold-600/20 dark:text-gold-400 dark:border-gold-600/40',
  Inactive:      'bg-muted text-muted-foreground border-border',
};
const STATUSES: CompanyStatus[] = ['Lead', 'Active', 'In-Contract', 'Inactive'];
const CONTRACT_TYPES: ContractType[] = ['Retainer', 'Contingency', 'Exclusive', 'Other'];
const CONTRACT_STATUSES: ContractStatus[] = ['Draft', 'Active', 'Completed', 'Terminated'];
const INTERACTION_TYPES: InteractionType[] = ['Call', 'Email', 'Meeting', 'Demo', 'Contract Sent', 'Other'];

interface Props {
  company: Company;
  cseReps: CseRep[];
  onStatusChange: (id: string, status: CompanyStatus) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function EnterpriseAccountRow({ company, cseReps, onStatusChange, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { contracts, addContract, updateContract } = useContracts(company.id);
  const { interactions, logInteraction } = useInteractions(company.id);

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

  const activeContracts = contracts.filter((c) => c.status === 'Active');
  const activeValue = activeContracts.reduce((sum, c) => sum + c.value, 0);
  const activeCurrency = activeContracts[0]?.currency ?? 'MMK';
  const lastContact = interactions[0]?.occurredAt ?? null;
  const assignedCseId = activeContracts.find((c) => c.cseId)?.cseId ?? null;
  const assignedCseName = cseReps.find((r) => r.id === assignedCseId)?.name ?? '—';

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
            <p className="font-semibold text-foreground text-sm truncate">{company.name}</p>
            <p className="text-xs text-muted-foreground">{assignedCseName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs">
          <span className={cn('rounded-full border px-2.5 py-1 font-semibold', STATUS_STYLES[company.status])}>
            {company.status}
          </span>
          <span className="w-24 text-right font-semibold text-foreground">
            {activeValue > 0 ? `${activeValue.toLocaleString()} ${activeCurrency}` : '—'}
          </span>
          <span className="w-20 text-right text-muted-foreground hidden sm:inline">
            {lastContact ? new Date(lastContact).toLocaleDateString() : 'No contact'}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-5 bg-muted/20">
          {/* Status change */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(company.id, s)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 font-semibold transition-colors',
                    s === company.status ? STATUS_STYLES[s] : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                >
                  {s}
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
                  {deleting ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete account"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Contracts */}
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Contracts</h4>
            <div className="space-y-1.5">
              {contracts.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No contracts yet.</p>
              )}
              {contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                >
                  <span className="font-medium">
                    {c.contractType} · {c.value.toLocaleString()} {c.currency}
                  </span>
                  <select
                    value={c.status}
                    onChange={(e) => updateContract(c.id, { status: e.target.value as ContractStatus })}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                  >
                    {CONTRACT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddContract} className="mt-2 flex flex-wrap gap-2">
              <input
                type="number"
                min="0"
                placeholder="Value"
                value={contractForm.value}
                onChange={(e) => setContractForm({ ...contractForm, value: e.target.value })}
                className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              />
              <select
                value={contractForm.contractType}
                onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value as ContractType })}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={contractForm.cseId}
                onChange={(e) => setContractForm({ ...contractForm, cseId: e.target.value })}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                <option value="">Unassigned CSE</option>
                {cseReps.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={savingContract}
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {savingContract ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add Contract
              </button>
            </form>
          </div>

          {/* Interactions */}
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Interaction Log</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {interactions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No interactions logged yet.</p>
              )}
              {interactions.map((i) => (
                <div key={i.id} className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{i.type}</span>
                    <span className="text-muted-foreground">
                      {new Date(i.occurredAt).toLocaleDateString()}
                    </span>
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
                {INTERACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Note…"
                value={interactionForm.note}
                onChange={(e) => setInteractionForm({ ...interactionForm, note: e.target.value })}
                className="flex-1 min-w-[140px] rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={savingInteraction}
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {savingInteraction ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Log
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
