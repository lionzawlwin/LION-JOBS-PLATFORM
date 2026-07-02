import { requireTabAccess } from '@/lib/auth';
import { getInvoiceByApplicationId } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceByApplicationId(id);
  return Response.json({ invoice });
}
