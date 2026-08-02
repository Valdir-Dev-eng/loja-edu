"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LoginClient() {
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setRedirecting(true);
    try {
      const response = await fetch("/auth/google?origin=loja", { credentials: "include" });
      const body = await response.json();
      if (!body.url) {
        throw new Error("Não foi possível iniciar o login com o Google.");
      }
      window.location.href = body.url;
    } catch {
      setError("Não foi possível iniciar o login com o Google. Tente novamente.");
      setRedirecting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <h1 className="text-xl font-extrabold">Entrar na Sorofarma</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Acesse sua conta para acompanhar pedidos, endereços e finalizar compras.
      </p>

      <Button onClick={handleGoogleLogin} disabled={redirecting} size="lg" className="mt-6 w-full">
        {redirecting ? "Redirecionando..." : "Entrar com Google"}
      </Button>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </div>
  );
}
