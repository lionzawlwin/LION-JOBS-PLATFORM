import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getCompanyById, appendSystemEvent, getAgencySettings } from '@/lib/db';

// Self-Serve Featured Placement Upsell (employer side). Same shape as
// POST /api/company-portal/plan-upgrade-request -- a company can't already
// be invoiceable-checked here (isInvoiceableCompany) because an internal
// company has no portal login to begin with (no staff/company_portal
// credentials are ever issued for the repo owner's own F&B brands), so
// there's nothing to additionally guard against on this route.
export async function POST() {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
  }

  if (company.isFeatured) {
    return NextResponse.json({ error: 'Your company is already featured.' }, { status: 409 });
  }

  const settings = await getAgencySettings();

  await appendSystemEvent({
    category: 'featured_placement',
    level:    'info',
    route:    '/api/company-portal/featured-placement-request',
    message:  `${company.name} requested a Featured Placement`,
    context: {
      companyId,
      companyName: company.name,
      priceMmk:    settings.featuredPlacementPriceMmk,
      durationDays: settings.featuredPlacementDurationDays,
    },
  });

  return NextResponse.json({ ok: true });
}
