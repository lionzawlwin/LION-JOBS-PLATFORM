import type { Invoice } from '@/types';

interface Props {
  invoice: Invoice;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function InvoiceDocument({ invoice }: Props) {
  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-black print:p-0">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lion Jobs Agency</h1>
          <p className="text-sm text-gray-600">Recruitment Services Invoice</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{invoice.invoiceNumber}</p>
          <p className="text-gray-600">Issued: {fmtDate(invoice.issuedAt)}</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs uppercase text-gray-500">Bill To</p>
        <p className="font-semibold">{invoice.companyName}</p>
      </div>

      <table className="mb-8 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="pb-2">Description</th>
            <th className="pb-2 text-right">Amount (MMK)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="py-3">
              Recruitment commission &mdash; {invoice.candidateName} ({invoice.position})
              <br />
              <span className="text-xs text-gray-500">
                Agreed salary: {invoice.agreedSalary.toLocaleString()} MMK &middot; Commission rate: {invoice.commissionRatePct}%
              </span>
            </td>
            <td className="py-3 text-right">{invoice.commissionFeeMmk.toLocaleString()}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-4 text-right font-semibold">Total Due</td>
            <td className="pt-4 text-right font-semibold">{invoice.commissionFeeMmk.toLocaleString()} MMK</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-xs text-gray-500">Status: {invoice.status}</p>
    </div>
  );
}
