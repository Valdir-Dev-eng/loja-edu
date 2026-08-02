import {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import type { NotificationItemData } from "../context/NotificationContext";
import styles from "./NotificationItem.module.css";

const DRAG_DISMISS_THRESHOLD_PX = 90;
const TAP_MOVEMENT_TOLERANCE_PX = 8;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const ICONS: Record<NotificationItemData["type"], ReactElement> = {
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.5L10.5 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9L15 15M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4.5L21 19.5H3L12 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 10V14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="1" fill="currentColor" />
    </svg>
  ),
};

interface NotificationItemProps {
  data: NotificationItemData;
  onDismiss: (id: string) => void;
}

type FlingDirection = "left" | "right" | "up";

export function NotificationItem({ data, onDismiss }: NotificationItemProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({ pointerId: -1, startX: 0, startY: 0, dragging: false, isTouch: false });
  const [pulseKey, setPulseKey] = useState(0);
  const [fling, setFling] = useState<FlingDirection | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingMsRef = useRef(data.durationMs);
  const timerStartedAtRef = useRef(0);

  function beginDismiss(direction: FlingDirection) {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setFling(direction);
  }

  useEffect(() => {
    if (data.durationMs <= 0) {
      return;
    }
    timerStartedAtRef.current = Date.now();
    dismissTimerRef.current = setTimeout(() => beginDismiss("up"), remainingMsRef.current);
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pauseAutoDismiss() {
    if (!dismissTimerRef.current) return;
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = null;
    remainingMsRef.current = Math.max(remainingMsRef.current - (Date.now() - timerStartedAtRef.current), 800);
  }

  function resumeAutoDismiss() {
    if (data.durationMs <= 0 || fling) return;
    timerStartedAtRef.current = Date.now();
    dismissTimerRef.current = setTimeout(() => beginDismiss("up"), remainingMsRef.current);
  }

  function resetTransform() {
    const el = elementRef.current;
    if (!el) return;
    el.style.transition = "transform 0.25s ease, opacity 0.25s ease";
    el.style.transform = "translate(0, 0)";
    el.style.opacity = "1";
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") {
      return;
    }
    dragState.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false, isTouch: true };
    const el = elementRef.current;
    if (el) el.style.transition = "none";
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragState.current;
    if (!state.isTouch || state.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - state.startX;
    const deltaY = Math.min(event.clientY - state.startY, 0); // only allow upward movement
    if (!state.dragging && (Math.abs(deltaX) > TAP_MOVEMENT_TOLERANCE_PX || Math.abs(deltaY) > TAP_MOVEMENT_TOLERANCE_PX)) {
      state.dragging = true;
    }
    if (!state.dragging) {
      return;
    }
    const el = elementRef.current;
    if (!el) return;
    const fade = Math.max(1 - Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 260, 0.15);
    el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    el.style.opacity = String(fade);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragState.current;
    if (!state.isTouch || state.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - state.startX;
    const deltaY = Math.min(event.clientY - state.startY, 0);
    const wasDragging = state.dragging;
    dragState.current.isTouch = false;
    dragState.current.dragging = false;

    if (!wasDragging) {
      triggerPulse();
      return;
    }

    const passedHorizontal = Math.abs(deltaX) >= DRAG_DISMISS_THRESHOLD_PX;
    const passedVertical = Math.abs(deltaY) >= DRAG_DISMISS_THRESHOLD_PX;

    if (passedHorizontal && Math.abs(deltaX) >= Math.abs(deltaY)) {
      beginDismiss(deltaX > 0 ? "right" : "left");
      return;
    }
    if (passedVertical) {
      beginDismiss("up");
      return;
    }
    resetTransform();
  }

  function handleClick(event: ReactMouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-notification-close]")) {
      return;
    }
    if (dragState.current.isTouch) {
      return;
    }
    triggerPulse();
  }

  function triggerPulse() {
    setPulseKey((current) => current + 1);
  }

  function handleFlingTransitionEnd() {
    if (fling) {
      onDismiss(data.id);
    }
  }

  const reduced = prefersReducedMotion();
  const flingStyle: CSSProperties | undefined = fling
    ? {
        transition: reduced ? "opacity 0.12s linear" : "transform 0.28s ease-in, opacity 0.28s ease-in",
        transform: reduced
          ? undefined
          : fling === "left"
            ? "translate(-140%, 0)"
            : fling === "right"
              ? "translate(140%, 0)"
              : "translate(0, -140%)",
        opacity: 0,
      }
    : undefined;

  return (
    <div
      ref={elementRef}
      className={`${styles.item} ${styles[data.type]}`}
      style={flingStyle}
      onTransitionEnd={handleFlingTransitionEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => resetTransform()}
      onMouseEnter={pauseAutoDismiss}
      onMouseLeave={resumeAutoDismiss}
      onClick={handleClick}
      role="status"
    >
      <span key={pulseKey} className={styles.icon} aria-hidden="true">
        {ICONS[data.type]}
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{data.title}</p>
        {data.message && <p className={styles.message}>{data.message}</p>}
      </div>
      <button
        type="button"
        className={styles.closeButton}
        data-notification-close
        onClick={(event) => {
          event.stopPropagation();
          beginDismiss("up");
        }}
        aria-label="Fechar notificação"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      {data.durationMs > 0 && (
        <span className={styles.progress} style={{ animationDuration: `${data.durationMs}ms` }} aria-hidden="true" />
      )}
    </div>
  );
}
