import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { getFeaturedTestimonials, listPendingTestimonials, reviewTestimonial } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// GET /api/testimonials            -- public, approved-only, for the homepage
// GET /api/testimonials?scope=admin -- staff moderation queue (Content tab), pending-only
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('scope') === 'admin') {
    if (!(await requireTabAccess('content', 'manage'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const pending = await listPendingTestimonials();
    return NextResponse.json({ testimonials: pending }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const approved = await getFeaturedTestimonials();
  return NextResponse.json(
    { testimonials: approved },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } },
  );
}

// PATCH /api/testimonials -- approve or reject a pending testimonial
export async function PATCH(req: NextRequest) {
  if (!(await requireTabAccess('content', 'manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || (status !== 'approved' && status !== 'rejected')) {
    return NextResponse.json({ error: 'id and status ("approved" | "rejected") are required.' }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  const reviewedBy = session?.user?.email ?? 'unknown';

  try {
    await reviewTestimonial(id, status, reviewedBy);
    await logAudit({ action: 'update', domain: 'content', entityType: 'testimonial', entityId: id });
    return NextResponse.json({ id, status });
  } catch {
    return NextResponse.json({ error: 'Could not update testimonial.' }, { status: 502 });
  }
}
