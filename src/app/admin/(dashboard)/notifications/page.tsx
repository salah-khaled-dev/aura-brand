"use client";

import React, { useState, useEffect } from 'react';
import { adminAr } from '@/lib/i18n/admin-ar';
import { NotificationService, Notification } from '@/lib/services/notification.service';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/formatters';

// SaaS UI Components
import { PageHeader, EmptyState, Skeleton } from '@/components/admin/design-system/Layout';
import { Card } from '@/components/admin/design-system/Card';
import { Button } from '@/components/admin/design-system/Button';

// Tabler Icons
import {
  IconBell,
  IconShoppingBag,
  IconUsers,
  IconStar,
  IconSettings,
  IconTrash,
  IconCheck,
  IconChecks,
  IconTicket,
  IconAlertTriangle
} from '@tabler/icons-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await NotificationService.getNotifications();
      setNotifications(data);
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      loadNotifications();
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      loadNotifications();
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await NotificationService.deleteNotification(id);
      loadNotifications();
    } catch {
      toast.error(adminAr.toasts.unexpectedError);
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order': return <IconShoppingBag size={20} className="text-[var(--admin-info)]" stroke={1.5} />;
      case 'customer': return <IconUsers size={20} className="text-[var(--admin-success)]" stroke={1.5} />;
      case 'review': return <IconStar size={20} className="text-[var(--admin-warning)]" stroke={1.5} />;
      case 'system': return <IconSettings size={20} className="text-[var(--admin-text-muted)]" stroke={1.5} />;
      case 'promotion': return <IconTicket size={20} className="text-[var(--admin-warning)]" stroke={1.5} />;
      case 'stock': return <IconAlertTriangle size={20} className="text-[var(--admin-danger)]" stroke={1.5} />;
      default: return <IconBell size={20} className="text-[var(--admin-text-muted)]" stroke={1.5} />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4 flex items-start gap-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <PageHeader 
        title={adminAr.notifications.title}
        description={adminAr.notifications.subtitle}
        actions={
          notifications.some(n => !n.isRead) ? (
            <Button 
              variant="secondary"
              onClick={handleMarkAllRead}
              leftIcon={<IconChecks size={18} />}
            >
              {adminAr.notifications.markAllRead}
            </Button>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <Card className="p-12">
          <EmptyState 
            icon={<IconBell size={32} />}
            title={adminAr.notifications.empty}
            description="جميع الإشعارات تمت قراءتها أو لا توجد إشعارات جديدة."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-[var(--admin-border-light)]">
            {notifications.map((notif, idx) => (
              <div 
                key={notif.id} 
                className={`flex items-start gap-4 p-5 transition-colors ${notif.isRead ? 'bg-[var(--admin-bg-base)] hover:bg-[var(--admin-bg-hover)]' : 'bg-[var(--admin-info)]/5 border-r-4 border-r-[var(--admin-info)] hover:bg-[var(--admin-info)]/10'}`}
              >
                <div className={`w-12 h-12 rounded-[var(--admin-radius-md)] flex items-center justify-center shrink-0 border ${notif.isRead ? 'bg-[var(--admin-bg-elevated)] border-[var(--admin-border-base)]' : 'bg-white border-[var(--admin-info)]/20 shadow-sm'}`}>
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm ${notif.isRead ? 'font-semibold text-[var(--admin-text-base)]' : 'font-bold text-[var(--admin-text-strong)]'}`}>{notif.title}</h4>
                  <p className={`text-sm mt-1 leading-relaxed ${notif.isRead ? 'text-[var(--admin-text-muted)]' : 'text-[var(--admin-text-base)]'}`}>{notif.message}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-[var(--admin-text-subtle)] font-medium tabular-nums">{formatDate(notif.date)}</span>
                    {notif.link && (
                      <Link href={notif.link} className="text-xs font-semibold text-[var(--admin-primary)] hover:underline">
                        عرض التفاصيل
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!notif.isRead && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(notif.id)} 
                      title={adminAr.notifications.markRead}
                      className="text-[var(--admin-info)]"
                    >
                      <IconCheck size={16} />
                    </Button>
                  )}
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(notif.id)} 
                    title={adminAr.common.delete}
                    className="text-[var(--admin-text-muted)] hover:text-[var(--admin-danger)]"
                  >
                    <IconTrash size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
