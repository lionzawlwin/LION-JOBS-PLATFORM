import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getCandidateApplicationsByCandidateId } from '@/lib/db';

export async function GET() {
  const candidateId = await getPortalSubjectId('candidate');
  if (!candidateId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const applications = await getCandidateApplicationsByCandidateId(candidateId);
  if (applications.length === 0) {
    return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
  }

  return NextResponse.json({
    name: applications[0].name,
    applications: applications.map((a) => ({
      id: a.id,
      position: a.position,
      company: a.company ?? null,
      stage: a.stage,
      appliedAt: a.appliedAt,
      interviewDate: a.interviewDate ?? null,
      interviewLocation: a.interviewLocation ?? null,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
