import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { CompanyPortalClientImpl as CompanyPortalClient } from '@/components/portal/CompanyPortalClientImpl';

export const metadata: Metadata = {
  title: 'Company Portal | Lion Jobs Agency',
  robots: { index: false },
};

export default async function CompanyPortalPage() {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) redirect('/company/portal/login');

  return <CompanyPortalClient />;
}
