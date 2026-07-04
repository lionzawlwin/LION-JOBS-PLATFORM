'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { ALL_TAB_DOMAINS, type TabDomain, type AccessLevel } from '@/lib/permissions';
import type { StaffRole } from '@/types';

const ROLES: StaffRole[] = ['owner', 'admin', 'cse', 'viewer'];
const LEVELS: AccessLevel[] = ['none', 'view', 'manage'];

const DOMAIN_LABELS: Record<TabDomain, string> = {
  overview: 'Overview', candidates: 'Candidates', 'post-job': 'Post Job',
  'manage-jobs': 'Manage Jobs', companies: 'Companies', enterprise: 'Enterprise',
  'b2b-leads': 'B2B Leads', content: 'Content', campaigns: 'Campaigns',
  legal: 'Legal', billing: 'Billing', team: 'Team & Access', 'system-health': 'System Health',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// RBAC Step 3 of 3 (Layer 6, Dynamic RBAC). See
// docs/superpowers/specs/2026-07-06-layer6-dynamic-rbac-design.md.
//
// Editable only for owner -- the real enforcement is PATCH
// /api/role-permissions's requireRole(['owner']), this prop just decides
// whether to render <select>s or plain read-only pills so admin isn't
// shown controls that would 403 on use.
export function PermissionsGrid({ role }: { role?: StaffRole }) {
  const { matrix, changes, loading, error, setPermission } = useRolePermissions();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const canEdit = role === 'owner';

  async function handleChange(targetRole: StaffRole, domain: TabDomain, level: AccessLevel) {
    const key = `${targetRole}:${domain}`;
    setSavingKey(key);
    setRejection(null);
    const result = await setPermission(targetRole, domain, level);
    if (!result.ok) setRejection(result.error);
    setSavingKey(null);
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  if (error || !matrix) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle size={28} className="text-red-500/60" />
        <p className="text-sm text-muted-foreground">{error ?? 'Could not load permissions.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rejection && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{rejection}</span>
        </div>
      )}

      {!canEdit && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>Read-only — only Owner can change tab access levels.</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="p-3">Tab</th>
              {ROLES.map((r) => <th key={r} className="p-3 capitalize">{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {ALL_TAB_DOMAINS.map((domain) => (
              <tr key={domain} className="border-b border-border/50">
                <td className="p-3 font-medium text-foreground">{DOMAIN_LABELS[domain]}</td>
                {ROLES.map((r) => {
                  const key = `${r}:${domain}`;
                  return (
                    <td key={r} className="p-3">
                      {canEdit ? (
                        <select
                          value={matrix[r][domain]}
                          disabled={savingKey === key}
                          onChange={(e) => handleChange(r, domain, e.target.value as AccessLevel)}
                          className="rounded-xl border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">{matrix[r][domain]}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h4 className="mb-3 text-sm font-bold text-foreground">Recent Permission Changes</h4>
        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes yet.</p>
        ) : (
          <ul className="space-y-2 text-xs text-muted-foreground">
            {changes.map((c) => (
              <li key={c.id}>
                <span className="font-medium text-foreground">{c.changedBy}</span> set{' '}
                <span className="font-medium text-foreground capitalize">{c.role}</span>&apos;s access to{' '}
                <span className="font-medium text-foreground">{DOMAIN_LABELS[c.tabDomain as TabDomain] ?? c.tabDomain}</span>{' '}
                from <span className="font-mono">{c.oldAccessLevel}</span> to{' '}
                <span className="font-mono">{c.newAccessLevel}</span> · {fmtDateTime(c.changedAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
