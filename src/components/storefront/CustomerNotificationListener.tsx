"use client";

import { useNotification } from "@/context/NotificationContext";
import { useEventSubscribe } from "@/hooks/useEventBus";
import type { CustomerNotification } from "@/lib/services/customer-notification.service";

/**
 * Bridges the order EventBus to the storefront toast system: whenever an order
 * status changes anywhere in the app, the customer sees a live toast — no refresh.
 * Renders nothing; mounted once inside the storefront layout.
 */
export default function CustomerNotificationListener() {
  const { showNotification } = useNotification();

  useEventSubscribe<CustomerNotification>("customer.notification", (n) => {
    if (n?.message) showNotification(n.message, "info");
  });

  return null;
}
