"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { CollectionService, Collection } from '@/lib/services/collection.service';
import { CollectionForm } from '@/components/admin/collections/CollectionForm';

export default function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CollectionService.getCollection(id).then((data) => {
      setCollection(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-[var(--admin-text-muted)]">جاري التحميل...</div>;
  }

  if (!collection) {
    return (
      <div className="text-center py-20 flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-[var(--admin-text-base)]">لم يتم العثور على التشكيلة</h2>
        <button
          onClick={() => router.push('/admin/collections')}
          className="text-sm text-[var(--admin-primary)] hover:underline font-medium"
        >
          العودة للتشكيلات
        </button>
      </div>
    );
  }

  return <CollectionForm initialData={collection} />;
}
