"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";

const EXEMPT_PATH_PREFIXES = ["/onboarding", "/login"];

// O status de onboarding vem pronto do servidor (getSessionUser, resolvido no
// SiteHeader) — este componente nao busca nada sozinho, so decide se mostra
// o aviso. Isso elimina a chamada repetida a /auth/me que existia antes.
export function OnboardingReminder({ pending }: { pending: boolean }) {
  const pathname = usePathname();
  const { notify } = useNotifications();
  const alreadyNotifiedRef = useRef(false);

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
