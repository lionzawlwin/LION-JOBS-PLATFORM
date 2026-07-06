import { supabase } from '@/lib/supabase';

export interface FeedbackRecord {
  id:              string;
  candidateId?:    string;
  company:         string;
  jobTitle?:       string;
  rating:          number;
  experience:      string;
  wouldRecommend:  boolean;
  submittedAt:     string;
}

export interface TestimonialRecord {
  id:             string;
  quote:          string;
  rating:         number;
  company:        string;
  submittedAt:    string;
  featuredStatus: 'pending' | 'approved' | 'rejected';
}

function mapToFeedback(row: Record<string, unknown>): FeedbackRecord {
  return {
    id:             row.id as string,
    candidateId:    (row.candidate_id as string) ?? undefined,
    company:        row.company as string,
    jobTitle:       (row.job_title as string) ?? undefined,
    rating:         row.rating as number,
    experience:     row.experience as string,
    wouldRecommend: (row.would_recommend as boolean) ?? false,
    submittedAt:    row.submitted_at as string,
  };
}

function mapToTestimonial(row: Record<string, unknown>): TestimonialRecord {
  return {
    id:             row.id as string,
    quote:          row.experience as string,
    rating:         row.rating as number,
    company:        row.company as string,
    submittedAt:    row.submitted_at as string,
    featuredStatus: row.featured_status as TestimonialRecord['featuredStatus'],
  };
}

export async function appendFeedback(data: {
  candidateId?:      string;
  company:           string;
  jobTitle?:         string;
  rating:            number;
  experience:        string;
  wouldRecommend?:   boolean;
  consentToFeature?: boolean;
}): Promise<string> {
  const id = `fb-${Date.now()}`;
  const consentToFeature = data.consentToFeature ?? false;

  const { error } = await supabase.from('feedback').insert({
    id,
    candidate_id:       data.candidateId ?? null,
    company:            data.company,
    job_title:          data.jobTitle ?? null,
    rating:             data.rating,
    experience:         data.experience,
    would_recommend:    data.wouldRecommend ?? false,
    consent_to_feature: consentToFeature,
    // Only enters the moderation queue if the candidate opted in --
    // rows that don't consent stay 'not_requested' and are never shown
    // to staff as something awaiting a decision.
    featured_status:    consentToFeature ? 'pending' : 'not_requested',
  });

  if (error) throw new Error(`Failed to insert feedback: ${error.message}`);
  return id;
}

// Layer 18: real testimonials sourced from consented, staff-approved
// interview feedback -- replaces the hardcoded fake names/quotes that were
// live on the homepage. Swallows errors to an empty list rather than
// throwing: migration 0025 (consent_to_feature/featured_status columns)
// may not be applied to the live DB yet (see supabase/MIGRATIONS.md's
// "Pending" section) -- until it is, the homepage should just render its
// empty state, not 500.
export async function getFeaturedTestimonials(limit = 6): Promise<TestimonialRecord[]> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('id, experience, rating, company, submitted_at, featured_status')
      .eq('featured_status', 'approved')
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(mapToTestimonial);
  } catch {
    return [];
  }
}

// Admin moderation queue (Content tab) -- feedback a candidate consented
// to feature, awaiting an approve/reject decision.
export async function listPendingTestimonials(): Promise<TestimonialRecord[]> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('id, experience, rating, company, submitted_at, featured_status')
      .eq('featured_status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error || !data) return [];
    return data.map(mapToTestimonial);
  } catch {
    return [];
  }
}

export async function reviewTestimonial(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('feedback')
    .update({ featured_status: status, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
    .eq('id', id);

  if (error) throw new Error(`Failed to review testimonial: ${error.message}`);
}

export async function getCompanyFeedback(
  company: string,
): Promise<{ totalReviews: number; averageRating: number }> {
  const { data, error } = await supabase
    .from('feedback')
    .select('rating')
    .ilike('company', company);

  if (error || !data || data.length === 0) {
    return { totalReviews: 0, averageRating: 0 };
  }

  const totalReviews = data.length;
  const averageRating =
    data.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews;
  return { totalReviews, averageRating };
}
