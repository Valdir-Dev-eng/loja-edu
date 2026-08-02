"use client";

import { useContext } from "react";
import { NotificationContext } from "@/context/notification-context";

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications precisa ser usado dentro de um NotificationProvider.");
  }
  return context;
}
