import { requireStaff } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getCompanyById, getAgencySettings } from '@/lib/db';
import { ContractDocument } from '@/components/legal/ContractDocument';
import { AutoPrint } from '@/components/legal/AutoPrint';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ContractPrintPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  if (!(await requireStaff())) {
    redirect('/login');
  }

  const { companyId } = await params;
  const [company, settings] = await Promise.all([
    getCompanyById(companyId),
    getAgencySettings(),
  ]);

  if (!company) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden p-4">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-sm text-gray-600 hover:text-black">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </div>
      <ContractDocument company={company} settings={settings} />
      <AutoPrint />
    </div>
  );
}
