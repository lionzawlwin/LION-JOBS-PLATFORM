'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, ClipboardList, Check, X } from 'lucide-react';
import { useJobRequests } from '@/hooks/useJobRequests';
import { useSelection } from '@/hooks/useSelection';
import { useLanguage } from '@/contexts/LanguageContext';
import { BulkActionBar } from './BulkActionBar';

// Mirrors JobsPanel.tsx's existing pattern: no client-side role gating on
// the approve/reject buttons -- the tab itself is only visible to roles
// with at least 'view' on manage-jobs, and the PATCH route already
// enforces 'manage' server-side (a 'view'-only role's attempt just surfaces
// the existing jr_toast_approve_failed/jr_toast_reject_failed toast).
export function JobRequestsPanel() {
  const { requests, loading, error, approve, reject } = useJobRequests();
  const { t } = useLanguage();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [bulkRejectNote, setBulkRejectNote] = useState('');
  const selection = useSelection<string>();

  async function handleApprove(id: string) {
    setBusyId(id);
    await approve(id);
    setBusyId(null);
  }

  async function handleRejectConfirm(id: string) {
    if (!rejectNote.trim()) return;
    setBusyId(id);
    const ok = await reject(id, rejectNote.trim());
    setBusyId(null);
    if (ok) {
      setRejectingId(null);
      setRejectNote('');
    }
  }

  // approve()/reject() already toast per item (jr_toast_approved/
  // jr_toast_approve_failed etc.) -- no extra summary toast needed here,
  // sonner stacks the individual ones.
  async function handleBulkApprove() {
    setBulkBusy(true);
    await Promise.allSettled(Array.from(selection.selected).map((id) => approve(id)));
    setBulkBusy(false);
    selection.clear();
  }

  async function handleBulkRejectConfirm() {
    if (!bulkRejectNote.trim()) return;
    setBulkBusy(true);
    await Promise.allSettled(Array.from(selection.selected).map((id) => reject(id, bulkRejectNote.trim())));
    setBulkBusy(false);
    setBulkRejecting(false);
    setBulkRejectNote('');
    selection.clear();
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ClipboardList size={15} /> {t('jr_panel_title')}
        </h3>
        {requests.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={requests.length > 0 && requests.every((r) => selection.isSelected(r.id))}
              onChange={() => selection.toggleAll(requests.map((r) => r.id))}
            />
            Select all
          </label>
        )}
      </div>

      {selection.count > 0 && (
        <div className="mb-4">
          <BulkActionBar count={selection.count} onClear={selection.clear}>
            <button
              onClick={handleBulkApprove}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
            >
              {bulkBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {t('jr_approve')} Selected
            </button>
            <button
              onClick={() => setBulkRejecting(true)}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
            >
              <X size={12} /> {t('jr_reject')} Selected
            </button>
          </BulkActionBar>
          {bulkRejecting && (
            <div className="mt-2 flex flex-col gap-2 rounded-xl border border-border p-3">
              <textarea
                value={bulkRejectNote}
                onChange={(e) => setBulkRejectNote(e.target.value)}
                placeholder={t('jr_reject_note_placeholder')}
                rows={2}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleBulkRejectConfirm}
                  disabled={!bulkRejectNote.trim() || bulkBusy}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
                >
                  {t('jr_reject_confirm')}
                </button>
                <button
                  onClick={() => { setBulkRejecting(false); setBulkRejectNote(''); }}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  {t('jr_cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <AlertTriangle size={24} className="text-red-500/60" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('jr_no_requests')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(r.id)}
                    onChange={() => selection.toggle(r.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.companyName} · {r.location} · {r.type}</p>
                    <p className="text-xs text-muted-foreground">{r.currency} {r.salaryMin.toLocaleString()}–{r.salaryMax.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(r.id)}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                  >
                    {busyId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {t('jr_approve')}
                  </button>
                  <button
                    onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
                  >
                    <X size={12} /> {t('jr_reject')}
                  </button>
                </div>
              </div>

              {rejectingId === r.id && (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder={t('jr_reject_note_placeholder')}
                    rows={2}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRejectConfirm(r.id)}
                      disabled={!rejectNote.trim() || busyId === r.id}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
                    >
                      {t('jr_reject_confirm')}
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectNote(''); }}
                      className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      {t('jr_cancel')}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
