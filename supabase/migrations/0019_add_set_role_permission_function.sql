-- Layer 6 (Dynamic RBAC), Step 3 of 3: atomic write path for
-- role_permissions edits. A plpgsql function body runs as one implicit
-- transaction -- if the audit insert fails, the update rolls back too --
-- so the upsert and the audit row can never land separately. See
-- docs/superpowers/specs/2026-07-06-layer6-dynamic-rbac-design.md.

CREATE OR REPLACE FUNCTION set_role_permission(
  p_role text,
  p_tab_domain text,
  p_access_level text,
  p_changed_by text,
  p_change_id text
) RETURNS text AS $$
DECLARE
  v_old_level text;
BEGIN
  SELECT access_level INTO v_old_level
  FROM role_permissions
  WHERE role = p_role AND tab_domain = p_tab_domain
  FOR UPDATE;

  IF v_old_level IS NULL THEN
    RAISE EXCEPTION 'No existing role_permissions row for %/%', p_role, p_tab_domain;
  END IF;

  UPDATE role_permissions
  SET access_level = p_access_level, updated_at = now(), updated_by = p_changed_by
  WHERE role = p_role AND tab_domain = p_tab_domain;

  INSERT INTO permission_changes (id, role, tab_domain, old_access_level, new_access_level, changed_by)
  VALUES (p_change_id, p_role, p_tab_domain, v_old_level, p_access_level, p_changed_by);

  RETURN v_old_level;
END;
$$ LANGUAGE plpgsql;
