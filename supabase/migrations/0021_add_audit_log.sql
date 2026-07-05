-- Audit Log / Activity Trail. Records every successful staff mutation
-- (create/update/delete) -- actor, action, domain, entity. Additive,
-- not a replacement for system_events (which records failures). See
-- docs/superpowers/specs/2026-07-05-audit-log-design.md.
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  domain      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- No policies, matching every other table's service-role-only access
-- pattern (see 0006_enable_staff_rls.sql's precedent).

CREATE INDEX IF NOT EXISTS audit_log_domain_created_idx
  ON audit_log (domain, created_at DESC);
