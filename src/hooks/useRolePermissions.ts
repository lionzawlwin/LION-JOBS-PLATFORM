'use client';

import useSWR from 'swr';
import type { StaffRole } from '@/types';
import type { TabDomain, AccessLevel } from '@/lib/permissions';

interface PermissionChange {
  id: string;
  role: string;
  tabDomain: string;
  oldAccessLevel: string;
  newAccessLevel: string;
  changedBy: string;
  changedAt: string;
}

interface RolePermissionsResponse {
  matrix: Record<StaffRole, Record<TabDomain, AccessLevel>>;
  changes: PermissionChange[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRolePermissions() {
  const { data, error, isLoading, mutate } = useSWR<RolePermissionsResponse>(
    '/api/role-permissions',
    fetcher,
    { revalidateOnFocus: false },
  );

  async function setPermission(role: StaffRole, tabDomain: TabDomain, accessLevel: AccessLevel) {
    const res = await fetch('/api/role-permissions', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role, tabDomain, accessLevel }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false as const, error: json?.error ?? 'Could not update permission.' };
    await mutate();
    return { ok: true as const };
  }

  return {
    matrix: data?.matrix ?? null,
    changes: data?.changes ?? [],
    loading: isLoading,
    error: error ? 'Failed to load permissions.' : null,
    setPermission,
    mutate,
  };
}
