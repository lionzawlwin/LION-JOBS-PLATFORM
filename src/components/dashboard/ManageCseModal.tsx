'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useCseReps } from '@/hooks/useCseReps';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  onClose: () => void;
}

export function ManageCseModal({ onClose }: Props) {
  const { cseReps, addCse, deleteCse, loading } = useCseReps();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      const ok = await addCse(form);
      if (ok) setForm({ name: '', phone: '', email: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{t('ent_cse_modal_title')}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="mb-4 flex flex-wrap gap-2">
          <input
            required
            placeholder={t('ent_cse_name_placeholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="flex-1 min-w-[100px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder={t('ent_cse_phone_placeholder')}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </form>

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {loading && <p className="text-xs text-muted-foreground">{t('ent_cse_loading')}</p>}
          {!loading && cseReps.length === 0 && (
            <p className="text-xs text-muted-foreground italic">{t('ent_cse_empty')}</p>
          )}
          {cseReps.map((rep) => (
            <div
              key={rep.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <span>{rep.name}{rep.phone ? ` · ${rep.phone}` : ''}</span>
              <button onClick={() => deleteCse(rep.id)} className="text-red-400 hover:text-red-600">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
