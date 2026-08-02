import { useNotifications } from "../hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import styles from "./NotificationStack.module.css";

export function NotificationStack() {
  const { notifications, dismiss } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={styles.stack} aria-live="polite" aria-atomic="false">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} data={notification} onDismiss={dismiss} />
      ))}
    </div>
  );
}
