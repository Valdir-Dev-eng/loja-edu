"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";

// O backend ja decide o destino final (redireciona direto pra /onboarding
// quando pendente) — este componente so cuida do caso de sucesso normal,
// mostrando o aviso de boas-vindas e limpando a query string.
function PostLoginRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotifications();
  const alreadyHandledRef = useRef(false);

  useEffect(() => {
    if (!searchParams.has("loginSuccess") || alreadyHandledRef.current) {
      return;
    }
    alreadyHandledRef.current = true;
    notify({ type: "success", title: "Login realizado", message: "Bem-vindo(a) de volta à Sorofarma!" });
    router.replace("/");
  }, [router, searchParams, notify]);

  return null;
}

export function PostLoginRedirect() {
  return (
    <Suspense fallback={null}>
      <PostLoginRedirectInner />
    </Suspense>
  );
}
