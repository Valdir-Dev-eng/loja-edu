"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { UserOutput } from "@/lib/api-types";

export function useAuth() {
  const [user, setUser] = useState<UserOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await apiClient.get<UserOutput>("/auth/me");
      setUser(me);
    } catch {
      // 401/403 = sem sessao valida, o esperado pra visitante nao logado.
      // Qualquer outro erro tambem cai pra "nao logado" — nunca trava a UI.
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function logout() {
    await apiClient.post("/auth/logout");
    setUser(null);
  }

  return { user, isLoading, logout, refresh };
}
