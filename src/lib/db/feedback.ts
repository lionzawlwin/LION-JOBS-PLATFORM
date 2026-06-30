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

export async function appendFeedback(data: {
  candidateId?:   string;
  company:        string;
  jobTitle?:      string;
  rating:         number;
  experience:     string;
  wouldRecommend?: boolean;
}): Promise<string> {
  const id = `fb-${Date.now()}`;

  const { error } = await supabase.from('feedback').insert({
    id,
    candidate_id:    data.candidateId ?? null,
    company:         data.company,
    job_title:       data.jobTitle ?? null,
    rating:          data.rating,
    experience:      data.experience,
    would_recommend: data.wouldRecommend ?? false,
  });

  if (error) throw new Error(`Failed to insert feedback: ${error.message}`);
  return id;
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
