'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Printer, Save, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { Company, Candidate, AgencySettings } from '@/types';

export function LegalView() {
  const [settings, setSettings]   = useState<AgencySettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [consentedIds, setConsentedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [savingRateId, setSavingRateId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, companiesRes, candidatesRes] = await Promise.all([
        fetch('/api/legal/settings'),
        fetch('/api/companies'),
        fetch('/api/candidates'),
      ]);
      const settingsData:   AgencySettings = await settingsRes.json();
      const companiesData:  Company[]      = companiesRes.ok ? await companiesRes.json() : [];
      const candidatesData: Candidate[]     = candidatesRes.ok ? await candidatesRes.json() : [];

      setSettings(settingsData);
      setCompanies(companiesData);

      const interviewCandidates = candidatesData.filter(
        (c) => c.stage === 'Interview' && Boolean(c.interviewLocation),
      );
      setCandidates(interviewCandidates);

      if (interviewCandidates.length > 0) {
        const statusRes = await fetch('/api/legal/consents-status', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ applicationIds: interviewCandidates.map((c) => c.id) }),
        });
        if (statusRes.ok) {
          const { consented } = await statusRes.json() as { consented: string[] };
          setConsentedIds(new Set(consented));
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    if (!settings) return;
    // The terms-version confirm() already ran in its own onChange handler below —
    // by the time Save is clicked, settings.termsVersion is already confirmed.
    setSavingSettings(true);
    try {
      const res = await fetch('/api/legal/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(settings),
      });
      if (!res.ok) {
        alert('Could not save settings. Please check the values and try again.');
      }
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveCommissionRate(companyId: string, value: string, original: number | null) {
    const parsed = value.trim() === '' ? null : Number(value);
    if (parsed !== null && Number.isNaN(parsed)) return;
    if (parsed === original) return;
    setSavingRateId(companyId);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ commissionRatePct: parsed }),
      });
      if (!res.ok) {
        alert('Could not save commission rate. Please try again.');
        return;
      }
      setCompanies((prev) => prev.map((c) => c.id === companyId ? { ...c, commissionRatePct: parsed } : c));
    } finally {
      setSavingRateId(null);
    }
  }

  if (loading || !settings) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Agency Settings */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Agency Settings</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Default commission rate (%)
            <input
              type="number"
              value={settings.defaultCommissionRatePct}
              onChange={(e) => setSettings({ ...settings, defaultCommissionRatePct: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Guarantee window (days)
            <input
              type="number"
              value={settings.defaultGuaranteeDays}
              onChange={(e) => setSettings({ ...settings, defaultGuaranteeDays: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Replacement cost (MMK)
            <input
              type="number"
              value={settings.defaultReplacementCostMmk}
              onChange={(e) => setSettings({ ...settings, defaultReplacementCostMmk: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Anti-bypass penalty (MMK)
            <input
              type="number"
              value={settings.antiBypassPenaltyMmk}
              onChange={(e) => setSettings({ ...settings, antiBypassPenaltyMmk: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Non-circumvention restriction (months)
            <input
              type="number"
              value={settings.antiBypassRestrictionMonths}
              onChange={(e) => setSettings({ ...settings, antiBypassRestrictionMonths: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Terms version
            <input
              type="text"
              value={settings.termsVersion}
              onChange={(e) => {
                if (e.target.value !== settings.termsVersion) {
                  if (!confirm('Changing the terms version requires future candidates to re-consent. Continue?')) return;
                }
                setSettings({ ...settings, termsVersion: e.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
        </button>
      </div>

      {/* B2B Service Contracts */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">B2B Service Contracts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2">Company</th>
                <th className="pb-2">Commission Override (%)</th>
                <th className="pb-2">Effective Rate</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((co) => (
                <tr key={co.id} className="border-b border-border/50">
                  <td className="py-2 font-medium text-foreground">{co.name}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      defaultValue={co.commissionRatePct ?? ''}
                      placeholder={String(settings.defaultCommissionRatePct)}
                      onBlur={(e) => saveCommissionRate(co.id, e.target.value, co.commissionRatePct ?? null)}
                      disabled={savingRateId === co.id}
                      className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {co.commissionRatePct ?? settings.defaultCommissionRatePct}%
                    {co.commissionRatePct == null && <span className="ml-1 text-[10px]">(default)</span>}
                  </td>
                  <td className="py-2">
                    <a
                      href={`/dashboard/legal/contract/${co.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      <Printer size={12} /> Print Contract
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Consents */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Candidate Consents (Interview stage)</h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates at Interview stage with interview details set yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2">Candidate</th>
                  <th className="pb-2">Position</th>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Consent</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 font-medium text-foreground">{c.name}</td>
                    <td className="py-2 text-muted-foreground">{c.position}</td>
                    <td className="py-2 text-muted-foreground">{c.company}</td>
                    <td className="py-2">
                      {consentedIds.has(c.id) ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck size={12} /> Agreed</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><ShieldAlert size={12} /> Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
