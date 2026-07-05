'use client';

import { useState } from 'react';
import { Loader2, UserPlus, AlertTriangle, Info } from 'lucide-react';
import { useStaff } from '@/hooks/useStaff';
import { useCseReps } from '@/hooks/useCseReps';
import { PermissionsGrid } from './PermissionsGrid';
import { ActivityLog } from './ActivityLog';
import type { StaffRole } from '@/types';

const ROLES: StaffRole[] = ['owner', 'admin', 'cse', 'viewer'];

const ROLE_STYLES: Record<StaffRole, string> = {
  owner:  'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-600/10 dark:text-brand-300 dark:border-brand-700/30',
  admin:  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  cse:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30',
  viewer: 'bg-muted text-muted-foreground border-border',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TeamView({ role }: { role?: StaffRole }) {
  const { staff, loading, error, addStaff, updateStaffMember } = useStaff();
  const [form, setForm] = useState<{ email: string; name: string; role: StaffRole }>({ email: '', name: '', role: 'viewer' });
  const [adding, setAdding]   = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.name) return;
    setAdding(true);
    try {
      const ok = await addStaff(form);
      if (ok) setForm({ email: '', name: '', role: 'viewer' });
      else alert('Could not add staff member. Please check the details and try again.');
    } finally {
      setAdding(false);
    }
  }

  async function changeRole(id: string, role: StaffRole) {
    setSavingId(id);
    try {
      const ok = await updateStaffMember(id, { role });
      if (!ok) alert('Could not update role. Please try again.');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setSavingId(id);
    try {
      const ok = await updateStaffMember(id, { active });
      if (!ok) alert('Could not update status. Please try again.');
    } finally {
      setSavingId(null);
    }
  }

  const { cseReps } = useCseReps();

  async function changeCseRep(id: string, cseRepId: string) {
    setSavingId(id);
    try {
      const ok = await updateStaffMember(id, { cseRepId: cseRepId || null });
      if (!ok) alert('Could not update linked CSE rep. Please try again.');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Adding an active staff member here lets them sign in to the full dashboard with their
          Google account. Each role&apos;s access to individual tabs is controlled by the
          permissions grid below — editable by Owner only.
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-foreground">Add Team Member</h3>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[180px] text-xs text-muted-foreground">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="flex-1 min-w-[160px] text-xs text-muted-foreground">
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Role
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
              className="mt-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Add
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-foreground">Team Roster</h3>
        {error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle size={32} className="text-red-500/60" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">CSE Rep</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Added</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id} className="border-b border-border/50">
                    <td className="py-2 font-medium text-foreground">{member.name}</td>
                    <td className="py-2 text-muted-foreground">{member.email}</td>
                    <td className="py-2">
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member.id, e.target.value as StaffRole)}
                        disabled={savingId === member.id}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[member.role]}`}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-2">
                      {member.role === 'cse' ? (
                        <select
                          value={member.cseRepId ?? ''}
                          onChange={(e) => changeCseRep(member.id, e.target.value)}
                          disabled={savingId === member.id}
                          className="rounded-xl border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          <option value="">Unlinked</option>
                          {cseReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => toggleActive(member.id, !member.active)}
                        disabled={savingId === member.id}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          member.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : 'border-border bg-muted text-muted-foreground'
                        }`}
                      >
                        {member.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-2 text-muted-foreground">{fmtDate(member.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-foreground">Tab Permissions</h3>
        <PermissionsGrid role={role} />
      </div>

      <ActivityLog />
    </div>
  );
}
