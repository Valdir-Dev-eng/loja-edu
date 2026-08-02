import { useContext } from "react";
import { NotificationContext } from "../context/NotificationContext";

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications precisa ser usado dentro de um NotificationProvider.");
  }
  return context;
}
