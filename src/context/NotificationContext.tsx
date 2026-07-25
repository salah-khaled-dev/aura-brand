"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconCircleCheck, IconAlertTriangle, IconAlertCircle, IconInfoCircle } from "@tabler/icons-react";

type NotificationType = "success" | "error" | "warning" | "info";

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextProps {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);

  // Auto dismiss timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = useCallback((message: string, type: NotificationType = "success") => {
    // Prevent duplicated concurrent messages
    setNotification((prev) => {
      if (prev && prev.message === message && prev.type === type) {
        return prev;
      }
      return {
        id: crypto.randomUUID(),
        message,
        type,
      };
    });
  }, []);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return <IconCircleCheck className="w-4 h-4 text-accent" />;
      case "warning":
        return <IconAlertTriangle className="w-4 h-4 text-amber-600" />;
      case "error":
        return <IconAlertCircle className="w-4 h-4 text-red-500" />;
      case "info":
      default:
        return <IconInfoCircle className="w-4 h-4 text-accent" />;
    }
  };

  const accentBorderClass: Record<NotificationType, string> = {
    success: "border-r-accent",
    warning: "border-r-amber-600",
    error: "border-r-red-500",
    info: "border-r-accent",
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* Toast Render Area */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[400px] px-6 pointer-events-none">
        <AnimatePresence mode="wait">
          {notification && (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto w-full bg-background-secondary border border-brand-border border-r-4 ${accentBorderClass[notification.type]} p-4 shadow-sm flex items-start gap-3 text-right`}
              dir="rtl"
            >
              {/* Accent Icon */}
              <div className="mt-0.5 shrink-0">
                {getIcon(notification.type)}
              </div>

              {/* Message Content */}
              <div className="flex-grow">
                <p className="font-sans text-xs font-medium text-text-primary leading-normal">
                  {notification.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setNotification(null)}
                className="shrink-0 p-0.5 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="إغلاق الإشعار"
              >
                <IconX className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
