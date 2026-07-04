import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { CandidatePortalClientImpl as CandidatePortalClient } from '@/components/portal/CandidatePortalClientImpl';

export const metadata: Metadata = {
  title: 'Candidate Portal | Lion Jobs Agency',
  robots: { index: false },
};

export default async function CandidatePortalPage() {
  const candidateId = await getPortalSubjectId('candidate');
  if (!candidateId) redirect('/candidate/portal/login');

  return <CandidatePortalClient />;
}
