import { requireStaff } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getInvoiceById } from '@/lib/db';
import { InvoiceDocument } from '@/components/billing/InvoiceDocument';
import { AutoPrint } from '@/components/legal/AutoPrint';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  if (!(await requireStaff())) {
    redirect('/login');
  }

  const { invoiceId } = await params;
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden p-4">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-sm text-gray-600 hover:text-black">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </div>
      <InvoiceDocument invoice={invoice} />
      <AutoPrint />
    </div>
  );
}
