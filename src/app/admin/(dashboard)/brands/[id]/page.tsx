"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { BrandService, Brand } from '@/lib/services/brand.service';
import { BrandForm } from '@/components/admin/brands/BrandForm';

export default function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    BrandService.getBrand(id).then((data) => {
      setBrand(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-[var(--admin-text-muted)]">جاري التحميل...</div>;
  }

  if (!brand) {
    return (
      <div className="text-center py-20 flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-[var(--admin-text-base)]">لم يتم العثور على العلامة التجارية</h2>
        <button
          onClick={() => router.push('/admin/brands')}
          className="text-sm text-[var(--admin-primary)] hover:underline font-medium"
        >
          العودة للعلامات التجارية
        </button>
      </div>
    );
  }

  return <BrandForm initialData={brand} />;
}
