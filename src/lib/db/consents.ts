import { supabase } from '@/lib/supabase';
import type { ConsentRecord } from '@/types';

function mapToConsent(row: Record<string, unknown>): ConsentRecord {
  return {
    id:            row.id as string,
    applicationId: row.application_id as string,
    termsVersion:  row.terms_version as string,
    agreedAt:      row.agreed_at as string,
  };
}

export async function recordConsent(data: {
  applicationId: string;
  termsVersion:  string;
  ipAddress?:    string;
  userAgent?:    string;
  // Direct-Contact-Info Upsell Tier (2026-07-07) reuses this same
  // legal-evidentiary table for its own, separate opt-in rather than a
  // new consent table -- default preserves every existing caller's
  // behavior unchanged.
  consentType?:  string;
}): Promise<void> {
  const id = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from('candidate_consents').insert({
    id,
    application_id: data.applicationId,
    consent_type:   data.consentType ?? 'anti_bypass',
    terms_version:  data.termsVersion,
    ip_address:     data.ipAddress ?? null,
    user_agent:     data.userAgent ?? null,
  });
  if (error) throw new Error(`Failed to record consent: ${error.message}`);
}

// Direct-Contact-Info Upsell Tier: a candidate's opt-in isn't versioned
// like the anti-bypass legal terms are, so this checks for the type's
// mere presence rather than matching a termsVersion (unlike
// getConsentedApplicationIds below, which anti-bypass callers use).
export async function getDirectContactConsentedApplicationIds(
  applicationIds: string[],
): Promise<Set<string>> {
  if (applicationIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('candidate_consents')
    .select('application_id')
    .in('application_id', applicationIds)
    .eq('consent_type', 'direct_contact_unlock');

  if (error || !data) return new Set();
  return new Set(data.map((r) => r.application_id as string));
}

export async function getConsentForApplication(applicationId: string): Promise<ConsentRecord | null> {
  const { data, error } = await supabase
    .from('candidate_consents')
    .select('*')
    .eq('application_id', applicationId)
    .order('agreed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapToConsent(data);
}

export async function getConsentedApplicationIds(
  applicationIds: string[],
  termsVersion:   string,
): Promise<Set<string>> {
  if (applicationIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('candidate_consents')
    .select('application_id')
    .in('application_id', applicationIds)
    .eq('terms_version', termsVersion);

  if (error || !data) return new Set();
  return new Set(data.map((r) => r.application_id as string));
}
