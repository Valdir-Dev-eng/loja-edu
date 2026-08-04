"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export function MobileLogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // mesmo se a chamada falhar, o cookie de sessao expira sozinho.
    } finally {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      disabled={loggingOut}
      onClick={handleLogout}
      className="flex h-11 items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-destructive active:bg-destructive/10 disabled:opacity-50"
    >
      <LogOut className="size-4" /> Sair
    </button>
  );
}
