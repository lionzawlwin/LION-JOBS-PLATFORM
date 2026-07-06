import { supabase } from '@/lib/supabase';
import type { Company, CompanyStatus, CompanyTier, Invoice } from '@/types';
import { isFeaturedPlacementInvoicePosition, FEATURED_PLACEMENT_DURATION_DAYS } from '@/lib/companyRules';

function mapToCompany(row: Record<string, unknown>): Company {
  return {
    id:            row.id as string,
    name:          row.name as string,
    contactPerson: (row.contact_person as string) ?? '',
    email:         (row.email as string) ?? '',
    phone:         (row.phone as string) ?? '',
    industry:      (row.industry as string) ?? '',
    city:          (row.city as string) ?? '',
    status:        ((row.status as string) ?? 'Lead') as CompanyStatus,
    tier:          ((row.tier as string) ?? 'smb') as CompanyTier,
    notes:         (row.notes as string) ?? '',
    commissionRatePct: row.commission_rate_pct === null || row.commission_rate_pct === undefined
      ? null
      : Number(row.commission_rate_pct),
    lastContacted: (row.last_contacted as string) ?? '',
    createdAt:     row.created_at as string,
    isInternal:    (row.is_internal as boolean) ?? false,
    parentAccountId: (row.parent_account_id as string) ?? null,
    planId:          (row.plan_id as string) ?? null,
    isFeatured:      (row.is_featured as boolean) ?? false,
    featuredUntil:   (row.featured_until as string) ?? null,
  };
}

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db/companies] getCompanies error:', error.message);
    return [];
  }

  return (data ?? []).map(mapToCompany);
}

export async function appendCompany(data: {
  name:           string;
  contactPerson?: string;
  email?:         string;
  phone?:         string;
  industry?:      string;
  city?:          string;
  status?:        string;
  tier?:          string;
  notes?:         string;
  lastContacted?: string;
  isInternal?:    boolean;
}): Promise<string> {
  const id = `co-${Date.now()}`;

  const { error } = await supabase.from('companies').insert({
    id,
    name:           data.name,
    contact_person: data.contactPerson ?? null,
    email:          data.email ?? null,
    phone:          data.phone ?? null,
    industry:       data.industry ?? null,
    city:           data.city ?? null,
    status:         data.status ?? 'Lead',
    tier:           data.tier ?? 'smb',
    notes:          data.notes ?? null,
    last_contacted: data.lastContacted ?? null,
    is_internal:    data.isInternal ?? false,
  });

  if (error) throw new Error(`Failed to insert company: ${error.message}`);
  return id;
}

export async function updateCompanyStatus(
  id: string,
  status: string,
  notes?: string,
): Promise<void> {
  const update: Record<string, string> = { status };
  if (notes !== undefined) update.notes = notes;

  const { error } = await supabase
    .from('companies')
    .update(update)
    .eq('id', id);
  if (error) throw new Error(`Failed to update company status: ${error.message}`);
}

export async function updateCompanyTier(id: string, tier: string): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ tier })
    .eq('id', id);
  if (error) throw new Error(`Failed to update company tier: ${error.message}`);
}

export async function updateCompanyIsInternal(id: string, isInternal: boolean): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ is_internal: isInternal })
    .eq('id', id);
  if (error) throw new Error(`Failed to update company internal flag: ${error.message}`);
}

// Layer 12 (Multi-Brand Account Grouping). parentAccountId: null clears the
// grouping back to standalone. The self-reference and existence checks are
// enforced by the DB (companies_parent_account_id_not_self CHECK + FK) --
// not duplicated here.
export async function updateCompanyParent(id: string, parentAccountId: string | null): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ parent_account_id: parentAccountId })
    .eq('id', id);
  if (error) throw new Error(`Failed to update company parent account: ${error.message}`);
}

// Layer 13 (Plan Tiers & Usage Metering). planId: null unassigns the plan,
// returning the account to unmetered (today's default) behavior.
export async function updateCompanyPlan(id: string, planId: string | null): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ plan_id: planId })
    .eq('id', id);
  if (error) throw new Error(`Failed to update company plan: ${error.message}`);
}

export async function updateCompanyFeatured(id: string, isFeatured: boolean): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ is_featured: isFeatured })
    .eq('id', id);
  if (error) throw new Error(`Failed to update featured flag: ${error.message}`);
}

// Self-Serve Featured Placement Upsell: called once an invoice tagged as a
// featured-placement charge (see companyRules.ts) is marked Paid. Sets
// featured_until so expireFeaturedPlacements() below knows when to turn it
// back off -- distinct from updateCompanyFeatured() above, which a staff
// member can still use to feature a company manually with no expiry.
export async function activateFeaturedPlacement(companyId: string, durationDays: number): Promise<void> {
  const featuredUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('companies')
    .update({ is_featured: true, featured_until: featuredUntil })
    .eq('id', companyId);
  if (error) throw new Error(`Failed to activate featured placement: ${error.message}`);
}

// Single choke point both "mark invoice Paid" routes call (the payments
// route's recordInvoicePayment path, and the PATCH status route's manual
// dropdown fallback) so activation happens identically regardless of
// which path actually flipped the invoice to Paid. A no-op for every
// invoice that isn't a featured-placement charge or has no companyId.
export async function activateFeaturedPlacementIfInvoicePaid(invoice: Invoice): Promise<void> {
  if (!invoice.companyId || !isFeaturedPlacementInvoicePosition(invoice.position)) return;
  await activateFeaturedPlacement(invoice.companyId, FEATURED_PLACEMENT_DURATION_DAYS);
}

// Daily sweep (piggybacked on the snapshot-stats cron, same "piggyback,
// don't add a cron slot" pattern as Phase 6/7's health check + CRM digest
// on job-alerts). Only ever matches a row with a real featured_until, so a
// manually-toggled (featured_until IS NULL) company is never touched.
// Returns the count purely for cron-success logging.
export async function expireFeaturedPlacements(): Promise<number> {
  const { data, error } = await supabase
    .from('companies')
    .update({ is_featured: false, featured_until: null })
    .eq('is_featured', true)
    .lt('featured_until', new Date().toISOString())
    .select('id');
  if (error) throw new Error(`Failed to expire featured placements: ${error.message}`);
  return data?.length ?? 0;
}

// Public-safe subset for the job board's "Featured Employers" spotlight —
// only fields already shown on the public /companies/[slug] profile page,
// no CRM/contact detail. Excludes internal (group-brand) companies, same
// boundary CompaniesView.tsx's default filter and Enterprise use.
export interface FeaturedCompany {
  id: string;
  name: string;
  industry: string;
  city: string;
}

export async function getFeaturedCompanies(): Promise<FeaturedCompany[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, industry, city')
    .eq('is_featured', true)
    .eq('is_internal', false)
    .order('name', { ascending: true });

  if (error) {
    console.error('[db/companies] getFeaturedCompanies error:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id:       row.id as string,
    name:     row.name as string,
    industry: (row.industry as string) ?? '',
    city:     (row.city as string) ?? '',
  }));
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete company: ${error.message}`);
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapToCompany(data);
}

// Exact-match lookup for Company Portal magic-link login. Deliberately not
// ilike/partial matching (unlike getCandidatesByEmailOrPhone's public
// search) -- a login lookup must never match more/less than the exact
// account the caller typed.
export async function getCompanyByEmail(email: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .ilike('email', email.trim())
    .maybeSingle();

  if (error || !data) return null;
  return mapToCompany(data);
}

// Exact-match lookup used to auto-resolve jobs.company_id at job-creation
// time from the free-text company name the Post Job form still collects.
// Case-insensitive but not partial (ilike with no wildcards) -- a job
// should only ever link to the one CRM company row with that exact name.
export async function getCompanyByName(name: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', name.trim())
    .maybeSingle();

  if (error || !data) return null;
  return mapToCompany(data);
}

export async function updateCompanyCommissionRate(
  id: string,
  commissionRatePct: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ commission_rate_pct: commissionRatePct })
    .eq('id', id);
  if (error) throw new Error(`Failed to update commission rate: ${error.message}`);
}
