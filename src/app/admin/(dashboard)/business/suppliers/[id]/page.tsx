import { SupplierEditor } from '@/components/admin/business/SupplierEditor';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierEditor id={id} />;
}
