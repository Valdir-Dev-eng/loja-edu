"use client";

import {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import { X, CheckCircle2, XCircle, TriangleAlert, Info } from "lucide-react";
import type { NotificationItemData, NotificationType } from "@/context/notification-context";
import { cn } from "@/lib/utils";

const DRAG_DISMISS_THRESHOLD_PX = 90;
const TAP_MOVEMENT_TOLERANCE_PX = 8;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const ICONS: Record<NotificationType, ReactElement> = {
  success: <CheckCircle2 className="size-5" />,
  error: <XCircle className="size-5" />,
  warning: <TriangleAlert className="size-5" />,
  info: <Info className="size-5" />,
};

const ACCENT_CLASSES: Record<NotificationType, { border: string; icon: string; iconBg: string; progressBg: string }> = {
  success: {
    border: "border-l-brand-success",
    icon: "text-brand-success",
    iconBg: "bg-brand-success/15",
    progressBg: "bg-brand-success",
  },
  error: {
    border: "border-l-destructive",
    icon: "text-destructive",
    iconBg: "bg-destructive/15",
    progressBg: "bg-destructive",
  },
  warning: {
    border: "border-l-brand-warning",
    icon: "text-brand-warning",
    iconBg: "bg-brand-warning/15",
    progressBg: "bg-brand-warning",
  },
  info: {
    border: "border-l-foreground",
    icon: "text-foreground",
    iconBg: "bg-foreground/10",
    progressBg: "bg-foreground",
  },
};

interface NotificationItemProps {
  data: NotificationItemData;
  onDismiss: (id: string) => void;
}

type FlingDirection = "left" | "right" | "up";

export function NotificationItemView({ data, onDismiss }: NotificationItemProps) {
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
    if (event.pointerType !== "touch") return;
    dragState.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false, isTouch: true };
    const el = elementRef.current;
    if (el) el.style.transition = "none";
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragState.current;
    if (!state.isTouch || state.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - state.startX;
    const deltaY = Math.min(event.clientY - state.startY, 0);
    if (!state.dragging && (Math.abs(deltaX) > TAP_MOVEMENT_TOLERANCE_PX || Math.abs(deltaY) > TAP_MOVEMENT_TOLERANCE_PX)) {
      state.dragging = true;
    }
    if (!state.dragging) return;
    const el = elementRef.current;
    if (!el) return;
    const fade = Math.max(1 - Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 260, 0.15);
    el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    el.style.opacity = String(fade);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragState.current;
    if (!state.isTouch || state.pointerId !== event.pointerId) return;
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
    if ((event.target as HTMLElement).closest("[data-notification-close]")) return;
    if (dragState.current.isTouch) return;
    triggerPulse();
  }

  function triggerPulse() {
    setPulseKey((current) => current + 1);
  }

  function handleFlingTransitionEnd() {
    if (fling) onDismiss(data.id);
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

  const accent = ACCENT_CLASSES[data.type];

  return (
    <div
      ref={elementRef}
      className={cn(
        "animate-in slide-in-from-bottom-2 fade-in relative flex w-[340px] max-w-[calc(100vw-2.5rem)] cursor-pointer items-start gap-3 overflow-hidden rounded-xl border border-border border-l-4 bg-card p-3.5 shadow-lg sm:max-w-[340px]",
        accent.border
      )}
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
      <span
        key={pulseKey}
        className={cn("flex size-8 shrink-0 animate-[pulse-icon_0.45s_ease] items-center justify-center rounded-full", accent.icon, accent.iconBg)}
      >
        {ICONS[data.type]}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="font-sans text-sm font-bold text-foreground">{data.title}</p>
        {data.message && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{data.message}</p>}
      </div>
      <button
        type="button"
        data-notification-close
        onClick={(event) => {
          event.stopPropagation();
          beginDismiss("up");
        }}
        aria-label="Fechar notificação"
        className="-mt-0.5 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
      {data.durationMs > 0 && (
        <span
          className={cn("absolute bottom-0 left-0 h-[3px] w-full origin-left opacity-60", accent.progressBg)}
          style={{
            animation: `notification-progress ${data.durationMs}ms linear forwards`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
