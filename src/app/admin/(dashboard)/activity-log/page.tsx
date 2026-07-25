"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { adminAr } from '@/lib/i18n/admin-ar';
import { ActivityLogService, ActivityLogEntry } from '@/lib/services/activity-log.service';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/formatters';

import { PageHeader, EmptyState, Skeleton } from '@/components/admin/design-system/Layout';
import { Card } from '@/components/admin/design-system/Card';
import { Badge } from '@/components/admin/design-system/Badge';
import { Button } from '@/components/admin/design-system/Button';
import { Modal } from '@/components/admin/design-system/Modal';

import { IconHistory, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

const ACTION_BADGE: Record<string, 'success' | 'info' | 'danger' | 'warning' | 'neutral'> = {
  created: 'success',
  updated: 'info',
  deleted: 'danger',
  login: 'neutral',
  logout: 'neutral',
};

export default function ActivityLogPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityLogEntry | null>(null);

  const load = useCallback(async (targetPage: number, entityType: string) => {
    setLoading(true);
    try {
      const { entries: data, hasMore: more } = await ActivityLogService.getEntries({
        page: targetPage,
        entityType: entityType || undefined,
      });
      setEntries(data);
      setHasMore(more);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ActivityLogService.getEntityTypes().then(setEntityTypes).catch(() => {});
  }, []);

  useEffect(() => {
    load(page, filterEntity);
  }, [page, filterEntity, load]);

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2 mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <PageHeader
        title={adminAr.activityLog.title}
        description={adminAr.activityLog.subtitle}
        actions={
          <select
            value={filterEntity}
            onChange={(e) => { setPage(0); setFilterEntity(e.target.value); }}
            className="text-sm rounded-[var(--admin-radius-sm)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-elevated)] px-3 py-2 text-[var(--admin-text-base)]"
          >
            <option value="">{adminAr.activityLog.filterAll}</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        }
      />

      {entries.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={<IconHistory size={32} />}
            title={adminAr.activityLog.empty}
            description=""
          />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="divide-y divide-[var(--admin-border-light)]">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className="w-full text-right flex items-center gap-4 p-4 hover:bg-[var(--admin-bg-hover)] transition-colors"
                >
                  <Badge variant={ACTION_BADGE[entry.action] ?? 'neutral'}>
                    {adminAr.activityLog.actions[entry.action as keyof typeof adminAr.activityLog.actions] ?? entry.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--admin-text-strong)] truncate">
                      {entry.actorEmail ?? 'مستخدم غير معروف'}
                      <span className="font-normal text-[var(--admin-text-muted)]"> — {entry.entityType}{entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ''}</span>
                    </p>
                  </div>
                  <span className="text-xs text-[var(--admin-text-subtle)] tabular-nums shrink-0">
                    {formatDate(entry.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <IconChevronRight size={16} />
            </Button>
            <span className="text-xs text-[var(--admin-text-muted)]">صفحة {page + 1}</span>
            <Button variant="secondary" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
              <IconChevronLeft size={16} />
            </Button>
          </div>
        </>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={adminAr.activityLog.viewDiff}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs text-[var(--admin-text-muted)]">
              <div><span className="font-semibold">{adminAr.activityLog.actor}:</span> {selected.actorEmail ?? '—'}</div>
              <div><span className="font-semibold">{adminAr.activityLog.time}:</span> {formatDate(selected.createdAt)}</div>
              <div><span className="font-semibold">{adminAr.activityLog.entity}:</span> {selected.entityType} {selected.entityId ?? ''}</div>
              <div><span className="font-semibold">{adminAr.activityLog.action}:</span> {selected.action}</div>
            </div>
            {selected.beforeData ? (
              <div>
                <p className="text-xs font-semibold text-[var(--admin-text-muted)] mb-1">{adminAr.activityLog.before}</p>
                <pre className="text-xs bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-sm)] p-3 overflow-x-auto max-h-48">{JSON.stringify(selected.beforeData, null, 2)}</pre>
              </div>
            ) : null}
            {selected.afterData ? (
              <div>
                <p className="text-xs font-semibold text-[var(--admin-text-muted)] mb-1">{adminAr.activityLog.after}</p>
                <pre className="text-xs bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-sm)] p-3 overflow-x-auto max-h-48">{JSON.stringify(selected.afterData, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
