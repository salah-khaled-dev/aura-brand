"use client";

import React from "react";
import { IconInfoCircle, IconExternalLink } from "@tabler/icons-react";
import { FadeIn } from "@/components/admin/ui/motion";

export default function RedirectsManager() {
  return (
    <FadeIn className="max-w-2xl mx-auto py-10 space-y-6">
      <div className="bg-[var(--admin-bg-surface)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-xl)] p-8 text-right" dir="rtl">
        <div className="flex items-start gap-4">
          <IconInfoCircle size={28} className="text-[var(--admin-primary)] shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[var(--admin-text-base)]">إعادة التوجيه (Redirects)</h2>
            <p className="text-sm text-[var(--admin-text-muted)] leading-relaxed">
              إعادة التوجيه في Next.js تُدار على مستوى الخادم عبر ملف
              {" "}<code className="bg-[var(--admin-bg-elevated)] px-1.5 py-0.5 rounded text-xs font-mono text-[var(--admin-primary)]">next.config.ts</code>{" "}
              ولا يمكن تطبيقها من localStorage. قواعد التوجيه المضافة هنا لن تُؤثر على السلوك الفعلي إلا بعد إضافة طبقة API تقرأ منها وتُحوّل الطلبات عبر Middleware.
            </p>
            <div className="pt-2 space-y-2 text-sm font-medium text-[var(--admin-text-base)]">
              <p className="font-bold">لإضافة توجيه فوري:</p>
              <ol className="list-decimal list-inside space-y-1 text-[var(--admin-text-muted)] text-sm">
                <li>افتح الملف <code className="bg-[var(--admin-bg-elevated)] px-1 py-0.5 rounded text-xs font-mono">next.config.ts</code> في جذر المشروع</li>
                <li>
                  أضف قاعدة ضمن <code className="bg-[var(--admin-bg-elevated)] px-1 py-0.5 rounded text-xs font-mono">async redirects()</code>:
                  <pre className="mt-2 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-light)] rounded-[var(--admin-radius-md)] p-3 text-xs font-mono text-left overflow-x-auto" dir="ltr">
{`{ source: '/old-path', destination: '/new-path', permanent: true }`}
                  </pre>
                </li>
                <li>أعد تشغيل السيرفر لتطبيق التغيير</li>
              </ol>
            </div>
            <p className="text-xs text-[var(--admin-text-subtle)] pt-2">
              عند الترقية إلى Supabase، سيمكن تطبيق Middleware يقرأ قواعد التوجيه من قاعدة البيانات ديناميكياً.
            </p>
            <a
              href="https://nextjs.org/docs/app/api-reference/next-config-js/redirects"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--admin-primary)] hover:underline mt-2"
            >
              <IconExternalLink size={14} />
              توثيق Next.js Redirects
            </a>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
