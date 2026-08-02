"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { NotificationItemView } from "./notification-item";

export function NotificationStack() {
  const { notifications, dismiss } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-200 flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:items-start"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notification) => (
        <NotificationItemView key={notification.id} data={notification} onDismiss={dismiss} />
      ))}
    </div>
  );
}
