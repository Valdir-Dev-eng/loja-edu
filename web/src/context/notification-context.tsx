"use client";

import { createContext, ReactNode, useCallback, useMemo, useRef, useState } from "react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationItemData {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  durationMs: number;
}

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message?: string;
  /** ms antes de sumir sozinho; 0 mantem na tela ate o usuario fechar */
  durationMs?: number;
}

export interface NotificationContextValue {
  notifications: NotificationItemData[];
  notify: (input: NotifyInput) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION_MS: Record<NotificationType, number> = {
  success: 4000,
  info: 4000,
  warning: 5500,
  error: 6500,
};

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItemData[]>([]);
  const sequence = useRef(0);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((input: NotifyInput) => {
    sequence.current += 1;
    const id = `notification-${sequence.current}-${Date.now()}`;
    const durationMs = input.durationMs ?? DEFAULT_DURATION_MS[input.type];
    setNotifications((current) => [...current, { id, type: input.type, title: input.title, message: input.message, durationMs }]);
    return id;
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({ notifications, notify, dismiss }),
    [notifications, notify, dismiss]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
