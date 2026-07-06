import { describe, it, expect } from 'vitest';
import { parseAuditLogQuery } from './auditLogQuery';

function paramsFrom(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

describe('parseAuditLogQuery', () => {
  it('parses a full valid param set', () => {
    const result = parseAuditLogQuery(paramsFrom({
      domain: 'candidates', action: 'update', actor: 'owner@example.com',
      q: 'app-1', from: '2026-07-01', to: '2026-07-06', limit: '25', offset: '10',
    }));
    expect(result).toEqual({
      ok: true,
      filters: {
        domain: 'candidates', action: 'update', actorEmail: 'owner@example.com',
        q: 'app-1', from: '2026-07-01', to: '2026-07-06', limit: 25, offset: 10,
        format: 'json', redact: false,
      },
    });
  });

  it('applies defaults when nothing is set', () => {
    const result = parseAuditLogQuery(paramsFrom({}));
    expect(result).toEqual({
      ok: true,
      filters: {
        domain: undefined, action: undefined, actorEmail: undefined, q: undefined,
        from: undefined, to: undefined, limit: 50, offset: 0, format: 'json',
        redact: false,
      },
    });
  });

  it('rejects an invalid action', () => {
    const result = parseAuditLogQuery(paramsFrom({ action: 'delete-all' }));
    expect(result).toEqual({ ok: false, error: expect.stringContaining('action must be one of') });
  });

  it('rejects an unparseable from date', () => {
    const result = parseAuditLogQuery(paramsFrom({ from: 'not-a-date' }));
    expect(result.ok).toBe(false);
  });

  it('rejects an unparseable to date', () => {
    const result = parseAuditLogQuery(paramsFrom({ to: 'not-a-date' }));
    expect(result.ok).toBe(false);
  });

  it('rejects to before from', () => {
    const result = parseAuditLogQuery(paramsFrom({ from: '2026-07-10', to: '2026-07-01' }));
    expect(result).toEqual({ ok: false, error: expect.stringContaining('to must not be before from') });
  });

  it('rejects an invalid format', () => {
    const result = parseAuditLogQuery(paramsFrom({ format: 'xml' }));
    expect(result.ok).toBe(false);
  });

  it('clamps limit to the 500 ceiling', () => {
    const result = parseAuditLogQuery(paramsFrom({ limit: '10000' }));
    expect(result).toMatchObject({ ok: true, filters: { limit: 500 } });
  });

  it('rejects a non-positive limit', () => {
    const result = parseAuditLogQuery(paramsFrom({ limit: '0' }));
    expect(result.ok).toBe(false);
  });

  it('rejects a negative offset', () => {
    const result = parseAuditLogQuery(paramsFrom({ offset: '-5' }));
    expect(result.ok).toBe(false);
  });

  it('accepts format=csv', () => {
    const result = parseAuditLogQuery(paramsFrom({ format: 'csv' }));
    expect(result).toMatchObject({ ok: true, filters: { format: 'csv' } });
  });

  it('parses redact=true', () => {
    const result = parseAuditLogQuery(paramsFrom({ redact: 'true' }));
    expect(result).toMatchObject({ ok: true, filters: { redact: true } });
  });

  it('defaults redact to false for any other value', () => {
    const result = parseAuditLogQuery(paramsFrom({ redact: 'yes' }));
    expect(result).toMatchObject({ ok: true, filters: { redact: false } });
  });
});
