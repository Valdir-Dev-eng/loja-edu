"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";
import { useSession } from "@/hooks/use-session";

const EXEMPT_PATH_PREFIXES = ["/onboarding", "/login"];

// Le do SessionProvider (useSession) em vez de buscar sozinho — reaproveita
// a unica chamada a /auth/me compartilhada pelo header inteiro.
export function OnboardingReminder() {
  const pathname = usePathname();
  const { user } = useSession();
  const { notify } = useNotifications();
  const alreadyNotifiedRef = useRef(false);
  const pending = user !== null && !user.onboardingCompleted;

  useEffect(() => {
    if (!pending || alreadyNotifiedRef.current) return;
    if (EXEMPT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    alreadyNotifiedRef.current = true;
    notify({
      type: "warning",
      title: "Complete seu cadastro",
      message: "Termine seu cadastro para poder comprar na Sorofarma.",
      durationMs: 0,
    });
  }, [pending, pathname, notify]);

  return null;
}
