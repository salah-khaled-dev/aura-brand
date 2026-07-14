'use client';

import { useState } from 'react';
import {
  IconBell,
  IconPackage,
  IconShoppingCart,
  IconUsers,
  IconTag,
  IconStar,
  IconSettings2,
  IconCircleCheck,
  IconX,
} from '@tabler/icons-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type NotificationCategory = 'Orders' | 'Inventory' | 'CRM' | 'Coupons' | 'Reviews' | 'System';

interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  isRead: boolean;
  time: string;
}

const mockNotifications: Notification[] = [];

const categoryIcons: Record<NotificationCategory, React.ReactNode> = {
  Orders: <IconShoppingCart size={16} />,
  Inventory: <IconPackage size={16} />,
  CRM: <IconUsers size={16} />,
  Coupons: <IconTag size={16} />,
  Reviews: <IconStar size={16} />,
  System: <IconSettings2 size={16} />,
};

const categoryLabels: Record<NotificationCategory, string> = {
  Orders: 'الطلبات',
  Inventory: 'المخزون',
  CRM: 'العملاء',
  Coupons: 'الكوبونات',
  Reviews: 'التقييمات',
  System: 'النظام'
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategory | 'All'>('All');
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = activeTab === 'All'
    ? notifications
    : notifications.filter(n => n.category === activeTab);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const markRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const removeNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="relative" dir="rtl">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-bg-elevated)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-base)] transition-colors border border-[var(--admin-border-light)]"
      >
        <IconBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--admin-danger)] text-[10px] font-bold text-white ring-2 ring-[var(--admin-bg-surface)]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-[400px] z-50 rounded-[var(--admin-radius-xl)] bg-[var(--admin-bg-surface)] shadow-[var(--admin-shadow-float)] border border-[var(--admin-border-base)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border-base)] bg-[var(--admin-bg-card)]">
              <h3 className="font-bold text-[var(--admin-text-base)]">الإشعارات</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-[var(--admin-primary)] hover:underline flex items-center gap-1"
                >
                  <IconCircleCheck size={14} />
                  تحديد الكل كمقروء
                </button>
              </div>
            </div>

            {/* Categories Scroll */}
            <div className="flex overflow-x-auto p-2 gap-1 border-b border-[var(--admin-border-light)] scrollbar-hide">
              <button
                onClick={() => setActiveTab('All')}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  activeTab === 'All'
                    ? "bg-[var(--admin-text-base)] text-[var(--admin-text-inverse)]"
                    : "text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)]"
                )}
              >
                الكل
              </button>
              {(Object.keys(categoryLabels) as NotificationCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={cn(
                    "whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    activeTab === cat
                      ? "bg-[var(--admin-primary-muted)] text-[var(--admin-primary)]"
                      : "text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)]"
                  )}
                >
                  {categoryIcons[cat]}
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filtered.length > 0 ? (
                <div className="flex flex-col">
                  {filtered.map(notif => (
                    <div
                      key={notif.id}
                      className={cn(
                        "group flex gap-3 p-4 border-b border-[var(--admin-border-light)] last:border-0 hover:bg-[var(--admin-bg-hover)] transition-colors relative",
                        !notif.isRead && "bg-[var(--admin-primary-muted)]"
                      )}
                    >
                      {!notif.isRead && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-[var(--admin-primary)]" />
                      )}

                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        !notif.isRead
                          ? "bg-[var(--admin-primary-muted)] text-[var(--admin-primary)]"
                          : "bg-[var(--admin-bg-elevated)] text-[var(--admin-text-subtle)]"
                      )}>
                        {categoryIcons[notif.category]}
                      </div>

                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between">
                          <span className={cn(
                            "text-sm font-medium",
                            !notif.isRead ? "text-[var(--admin-text-base)]" : "text-[var(--admin-text-muted)]"
                          )}>
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-[var(--admin-text-subtle)] whitespace-nowrap mr-2">
                            {notif.time}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs mt-1 leading-relaxed",
                          !notif.isRead ? "text-[var(--admin-text-muted)]" : "text-[var(--admin-text-subtle)]"
                        )}>
                          {notif.message}
                        </p>
                      </div>

                      {/* Actions hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 shrink-0 absolute left-2 top-2">
                        {!notif.isRead && (
                          <button
                            onClick={() => markRead(notif.id)}
                            className="p-1 text-[var(--admin-text-subtle)] hover:text-[var(--admin-primary)] hover:bg-[var(--admin-primary-muted)] rounded transition-colors"
                            title="تحديد كمقروء"
                          >
                            <IconCircleCheck size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(notif.id)}
                          className="p-1 text-[var(--admin-text-subtle)] hover:text-[var(--admin-danger)] hover:bg-[var(--admin-danger-muted)] rounded transition-colors"
                          title="أرشفة/حذف"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-[var(--admin-text-subtle)]">
                  <IconBell size={32} className="mb-2 opacity-20" />
                  <p className="text-sm">لا توجد إشعارات حالياً</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-[var(--admin-border-light)] bg-[var(--admin-bg-base)]">
              <button className="w-full text-center text-sm font-medium text-[var(--admin-primary)] hover:underline py-2">
                عرض كل الإشعارات
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
