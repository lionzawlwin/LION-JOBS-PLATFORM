import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { appendAuditLog } from '@/lib/db';
import type { AuditAction } from '@/types';
import type { TabDomain } from '@/lib/permissions';

// The single call site every mutating route uses to record a successful
// create/update/delete. Never throws (matches logFailure()'s own
// documented "never throws" contract) — an audit-log write failure must
// not break the mutation it's recording. See
// docs/superpowers/specs/2026-07-05-audit-log-design.md.
export async function logAudit(data: {
  action: AuditAction;
  domain: TabDomain | 'staff' | 'role-permissions';
  entityType: string;
  entityId: string;
}): Promise<void> {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email;
  if (!actorEmail) return; // no session, nothing to attribute -- fail silent, not throw
  try {
    await appendAuditLog({ actorEmail, ...data });
  } catch (err) {
    console.error('[audit] logAudit could not persist audit_log row:', err);
  }
}
