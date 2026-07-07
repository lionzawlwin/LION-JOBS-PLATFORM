import { supabase } from '@/lib/supabase';
import type { PortalSeatRole } from '@/lib/portalPermissions';

// Layer 3 of Module #1 (Enterprise Employer Console). See migration 0039
// and docs/superpowers/specs/2026-07-05-layer9-portal-team-seats-design.md.

export interface CompanyPortalUser {
  id: string;
  companyId: string;
  email: string;
  name: string | null;
  seatRole: PortalSeatRole;
  status: 'invited' | 'active' | 'revoked';
}

function mapRow(row: Record<string, unknown>): CompanyPortalUser {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    email: row.email as string,
    name: (row.name as string) ?? null,
    seatRole: row.seat_role as PortalSeatRole,
    status: row.status as CompanyPortalUser['status'],
  };
}

// Resolves which company an email should log into, for the request-link
// flow -- checked before falling back to the legacy companies.email match
// (getCompanyByEmail), same additive pattern as Layer 1's jobs FK
// fallback. Email is unique per (company, email) but NOT globally unique
// across companies -- a person invited to two different companies' portals
// would have two rows here. Known v1 simplification: takes the
// earliest-created match rather than resolving the ambiguity, since no
// multi-company seat has been created yet and Layer 9's original design
// didn't scope for it either.
export async function getActiveCompanyPortalUserByEmail(email: string): Promise<CompanyPortalUser | null> {
  const { data, error } = await supabase
    .from('company_portal_users')
    .select('*')
    .ilike('email', email.trim())
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return mapRow(data[0]);
}

// Resolves the seat role for a specific (companyId, email) pair, called at
// session-creation time once a login token has already been consumed (so
// both values are already trusted, not re-derived from user input).
// Defaults to 'owner' if no active seat row matches -- the exact
// pre-Layer-3 behavior for every company that hasn't adopted multi-seat.
export async function getSeatRoleForCompanyEmail(companyId: string, email: string): Promise<PortalSeatRole> {
  const { data, error } = await supabase
    .from('company_portal_users')
    .select('seat_role')
    .eq('company_id', companyId)
    .ilike('email', email.trim())
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) return 'owner';
  return data.seat_role as PortalSeatRole;
}

// listCompanyPortalUsers() intentionally not added here yet -- that's
// Layer 5's concern (Team panel), not Layer 3 (session/login only).
