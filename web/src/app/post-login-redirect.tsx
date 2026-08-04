"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";

// O backend ja decide o destino final (redireciona direto pra /onboarding
// quando pendente) — este componente so cuida do caso de sucesso normal,
// mostrando o aviso de boas-vindas e limpando a query string.
function PostLoginRedirectInner() {
  const searchParams = useSearchParams();
  const { notify } = useNotifications();
  const alreadyHandledRef = useRef(false);

  useEffect(() => {
    if (!searchParams.has("loginSuccess") || alreadyHandledRef.current) {
      return;
    }
    alreadyHandledRef.current = true;
    notify({ type: "success", title: "Login realizado", message: "Bem-vindo(a) de volta à Sorofarma!" });
    // history.replaceState em vez de router.replace: so troca o que aparece
    // na barra de URL, sem pedir pro Next re-renderizar a rota. router.replace
    // dispara uma nova passada pelos Suspense dinamicos do header (a mesma
    // sessao e' buscada de novo), o que e' exatamente o "pisca" que gerou
    // esse componente — os slots ja renderizaram certo na carga inicial.
    window.history.replaceState(null, "", "/");
  }, [searchParams, notify]);

  return null;
}

export function PostLoginRedirect() {
  return (
    <Suspense fallback={null}>
      <PostLoginRedirectInner />
    </Suspense>
  );
}
