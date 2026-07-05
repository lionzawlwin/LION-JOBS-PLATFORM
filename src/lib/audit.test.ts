import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock() calls are hoisted above top-level const declarations, so the
// mocks referenced inside the factories must themselves be created via
// vi.hoisted() -- a plain `const x = vi.fn()` above would throw
// "Cannot access '...' before initialization" at import time.
const { getServerSessionMock, appendAuditLogMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  appendAuditLogMock: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ appendAuditLog: appendAuditLogMock }));

import { logAudit } from './audit';

describe('logAudit', () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    appendAuditLogMock.mockReset();
  });

  it('no-ops without throwing when there is no session', async () => {
    getServerSessionMock.mockResolvedValue(null);
    await expect(logAudit({
      action: 'update', domain: 'candidates', entityType: 'candidate', entityId: 'app-1',
    })).resolves.toBeUndefined();
    expect(appendAuditLogMock).not.toHaveBeenCalled();
  });

  it('writes an entry with the session actor email when a session exists', async () => {
    getServerSessionMock.mockResolvedValue({ user: { email: 'owner@example.com' } });
    await logAudit({ action: 'create', domain: 'companies', entityType: 'company', entityId: 'co-1' });
    expect(appendAuditLogMock).toHaveBeenCalledWith({
      actorEmail: 'owner@example.com',
      action: 'create',
      domain: 'companies',
      entityType: 'company',
      entityId: 'co-1',
    });
  });

  it('never throws even if the DB write rejects', async () => {
    getServerSessionMock.mockResolvedValue({ user: { email: 'owner@example.com' } });
    appendAuditLogMock.mockRejectedValue(new Error('db down'));
    await expect(logAudit({
      action: 'delete', domain: 'companies', entityType: 'company', entityId: 'co-1',
    })).resolves.toBeUndefined();
  });
});
