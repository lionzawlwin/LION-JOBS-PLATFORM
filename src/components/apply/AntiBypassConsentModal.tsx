'use client';

import { useEffect, useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import type { AgencySettings } from '@/types';

interface Props {
  applicationId: string;
  query: string;
  onClose: () => void;
  onAgreed: () => void;
}

export function AntiBypassConsentModal({ applicationId, query, onClose, onAgreed }: Props) {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [agreed, setAgreed]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch('/api/legal/settings').then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!agreed) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/candidates/${applicationId}/consent`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      onAgreed();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldAlert size={18} className="text-amber-600" /> Anti-Bypass Agreement
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {!settings ? (
          <p className="text-sm text-muted-foreground">Loading terms…</p>
        ) : (
          <div className="space-y-3 text-sm text-foreground">
            <p>
              Before viewing your interview details, please read and agree to the following terms.
              <br />
              အင်တာဗျူးအချက်အလက်များကို ကြည့်ရှုမီ အောက်ပါစည်းကမ်းချက်များကို ဖတ်ရှု သဘောတူပေးပါ။
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                You agree not to join the introduced company directly, bypassing Lion Jobs Agency, for {settings.antiBypassRestrictionMonths} months from your interview date.
                <br />
                အင်တာဗျူးရက်မှ {settings.antiBypassRestrictionMonths} လအတွင်း Lion Jobs Agency မပါဘဲ ဤကုမ္ပဏီတွင် တိုက်ရိုက်ဝင်ရောက်အလုပ်လုပ်ခြင်း မပြုပါ။
              </li>
              <li>
                If the company contacts you directly, you must notify Lion Jobs Agency within 24 hours.
                <br />
                ကုမ္ပဏီမှ တိုက်ရိုက်ဆက်သွယ်လာပါက ၂၄ နာရီအတွင်း Lion Jobs Agency ကို အသိပေးရမည်။
              </li>
              <li>
                Violating this agreement results in a permanent ban from the Lion Jobs Agency ecosystem and liquidated damages of {settings.antiBypassPenaltyMmk.toLocaleString()} MMK.
                <br />
                စည်းကမ်းချိုးဖောက်ပါက Lion Jobs Agency စနစ်တစ်ခုလုံးမှ အပြီးအပိုင် ပိတ်ပင်ခံရပြီး လျော်ကြေးငွေ {settings.antiBypassPenaltyMmk.toLocaleString()} MMK ပေးဆောင်ရမည်။
              </li>
            </ul>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <label className="flex items-start gap-2 pt-2 text-sm font-medium">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
              I have read and agree to these terms. / ကျွန်ုပ်သည် ဖတ်ရှုပြီး သဘောတူပါသည်။
            </label>

            <button
              onClick={handleSubmit}
              disabled={!agreed || submitting}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'I Agree — View Interview Details'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
