"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(user.onboardingCompleted ? "/" : "/onboarding");
    }
  }, [isLoading, user, router]);

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
    <div className="mx-auto flex max-w-(--content-max-width) justify-center px-4 py-16 sm:px-6">
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
    </div>
  );
}
