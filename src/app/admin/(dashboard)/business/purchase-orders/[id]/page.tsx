import { PurchaseOrderEditor } from '@/components/admin/business/PurchaseOrderEditor';

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseOrderEditor id={id} />;
}
