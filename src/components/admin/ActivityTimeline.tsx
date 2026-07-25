import { ActivityLogEntry } from '@/lib/services/activity-log.service';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface ActivityTimelineProps {
  events: ActivityLogEntry[];
}

const ACTION_LABELS_AR: Record<string, string> = {
  created: 'الإنشاء',
  updated: 'التعديل',
  deleted: 'الحذف',
  login: 'تسجيل الدخول',
  logout: 'تسجيل الخروج',
};

/** Field-level diff between two JSON row snapshots — only changed keys are shown. */
function computeDiff(before: unknown, after: unknown): Record<string, { before: unknown; after: unknown }> | null {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return null;
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
      diff[key] = { before: b[key], after: a[key] };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-[var(--admin-text-subtle)]">
        <p>لا توجد نشاطات مسجلة حتى الآن.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const diff = computeDiff(event.beforeData, event.afterData);
        const actorLabel = event.actorEmail ?? 'مستخدم غير معروف';
        return (
          <div key={event.id} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-primary-muted)] text-[var(--admin-primary)] ring-4 ring-[var(--admin-bg-card)]">
                <span className="text-xs font-bold">{actorLabel.charAt(0).toUpperCase()}</span>
              </div>
              {index !== events.length - 1 && (
                <div className="w-px h-full bg-[var(--admin-border-base)] my-2" />
              )}
            </div>

            <div className="flex flex-col pb-6">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--admin-text-base)]">{actorLabel}</span>
                <span className="text-sm text-[var(--admin-text-subtle)]">قام بـ</span>
                <span className="font-medium text-[var(--admin-primary)]">
                  {ACTION_LABELS_AR[event.action] ?? event.action}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--admin-text-subtle)]">
                <time dateTime={event.createdAt}>
                  {format(new Date(event.createdAt), 'PPp', { locale: arSA })}
                </time>
              </div>

              {diff && (
                <div className="mt-3 rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-base)] p-3 text-xs font-mono overflow-x-auto border border-[var(--admin-border-light)]">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="text-[var(--admin-text-subtle)] border-b border-[var(--admin-border-base)]">
                        <th className="pb-2 font-normal">الحقل</th>
                        <th className="pb-2 font-normal">قبل</th>
                        <th className="pb-2 font-normal">بعد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(diff).map(([key, value]) => (
                        <tr key={key} className="border-b border-[var(--admin-border-light)] last:border-0">
                          <td className="py-2 font-medium text-[var(--admin-text-base)]">{key}</td>
                          <td className="py-2 text-[var(--admin-danger)] line-through opacity-70">
                            {JSON.stringify(value.before)}
                          </td>
                          <td className="py-2 text-[var(--admin-success)]">
                            {JSON.stringify(value.after)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
