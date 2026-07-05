-- Layer 6 (Dynamic RBAC), Step 1 of 3: schema + seed only, no behavior
-- change. permissions.ts still reads the hardcoded PERMISSIONS constant
-- after this migration -- these tables exist but nothing reads from them
-- yet. See docs/superpowers/specs/2026-07-06-layer6-dynamic-rbac-design.md.

CREATE TABLE IF NOT EXISTS role_permissions (
  role         TEXT NOT NULL CHECK (role IN ('owner','admin','cse','viewer')),
  tab_domain   TEXT NOT NULL CHECK (tab_domain IN ('overview','candidates','post-job',
                 'manage-jobs','companies','enterprise','b2b-leads','content','campaigns',
                 'legal','billing','team','system-health')),
  access_level TEXT NOT NULL CHECK (access_level IN ('none','view','manage')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT,
  PRIMARY KEY (role, tab_domain)
);

-- Append-only audit trail, scoped to this one table's writes -- not the
-- general Phase 14 audit log (still deferred, too large to build
-- unsupervised). No update/delete grants needed since nothing here ever
-- modifies or removes a row.
CREATE TABLE IF NOT EXISTS permission_changes (
  id               TEXT PRIMARY KEY,
  role             TEXT NOT NULL,
  tab_domain       TEXT NOT NULL,
  old_access_level TEXT NOT NULL,
  new_access_level TEXT NOT NULL,
  changed_by       TEXT NOT NULL,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS permission_changes_changed_at_idx ON permission_changes(changed_at DESC);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_changes ENABLE ROW LEVEL SECURITY;

-- Seed: the exact 52 (role, tab_domain) -> access_level rows encoded in
-- src/lib/permissions.ts's PERMISSIONS constant as of this migration.
-- Day-one behavior must be bit-for-bit identical to today's hardcoded
-- matrix -- verified directly against permissions.ts, not transcribed
-- from memory.
INSERT INTO role_permissions (role, tab_domain, access_level) VALUES
  ('owner', 'overview',     'manage'),
  ('owner', 'candidates',   'manage'),
  ('owner', 'post-job',     'manage'),
  ('owner', 'manage-jobs',  'manage'),
  ('owner', 'companies',    'manage'),
  ('owner', 'enterprise',   'manage'),
  ('owner', 'b2b-leads',    'manage'),
  ('owner', 'content',      'manage'),
  ('owner', 'campaigns',    'manage'),
  ('owner', 'legal',        'manage'),
  ('owner', 'billing',      'manage'),
  ('owner', 'team',         'manage'),
  ('owner', 'system-health','manage'),

  ('admin', 'overview',     'manage'),
  ('admin', 'candidates',   'manage'),
  ('admin', 'post-job',     'manage'),
  ('admin', 'manage-jobs',  'manage'),
  ('admin', 'companies',    'manage'),
  ('admin', 'enterprise',   'manage'),
  ('admin', 'b2b-leads',    'manage'),
  ('admin', 'content',      'manage'),
  ('admin', 'campaigns',    'manage'),
  ('admin', 'legal',        'manage'),
  ('admin', 'billing',      'manage'),
  ('admin', 'team',         'manage'),
  ('admin', 'system-health','manage'),

  ('cse', 'overview',     'view'),
  ('cse', 'candidates',   'none'),
  ('cse', 'post-job',     'none'),
  ('cse', 'manage-jobs',  'none'),
  ('cse', 'companies',    'manage'),
  ('cse', 'enterprise',   'manage'),
  ('cse', 'b2b-leads',    'manage'),
  ('cse', 'content',      'none'),
  ('cse', 'campaigns',    'none'),
  ('cse', 'legal',        'view'),
  ('cse', 'billing',      'view'),
  ('cse', 'team',         'none'),
  ('cse', 'system-health','none'),

  ('viewer', 'overview',     'view'),
  ('viewer', 'candidates',   'view'),
  ('viewer', 'post-job',     'none'),
  ('viewer', 'manage-jobs',  'view'),
  ('viewer', 'companies',    'view'),
  ('viewer', 'enterprise',   'view'),
  ('viewer', 'b2b-leads',    'view'),
  ('viewer', 'content',      'view'),
  ('viewer', 'campaigns',    'view'),
  ('viewer', 'legal',        'view'),
  ('viewer', 'billing',      'view'),
  ('viewer', 'team',         'none'),
  ('viewer', 'system-health','none')
ON CONFLICT (role, tab_domain) DO NOTHING;
