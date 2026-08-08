"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, MapPin, Package, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";
import type { UserOutput } from "@/lib/api-types";

function initialsOf(user: UserOutput): string {
  const source = user.fullName?.trim() || user.username;
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

function Avatar({ user, isAdmin }: { user: UserOutput; isAdmin: boolean }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        isAdmin ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-brand-red/10 text-brand-red"
      }`}
      aria-hidden="true"
    >
      {initialsOf(user)}
    </span>
  );
}

export function AccountMenu({ user }: { user: UserOutput }) {
  const { clear } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = user.isAdmin;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // mesmo se a chamada falhar, o cookie de sessao expira sozinho —
      // o importante e o header parar de mostrar o usuario como logado.
    } finally {
      clear();
      setLoggingOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Avatar user={user} isAdmin={isAdmin} />
          {user.fullName?.split(" ")[0] ?? "Minha conta"}
          {isAdmin && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
              Admin
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{user.fullName ?? user.username}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserRound /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/pedidos">
            <Package /> Meus pedidos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/enderecos">
            <MapPin /> Meus endereços
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app" className="text-amber-700 focus:text-amber-700 dark:text-amber-400 dark:focus:text-amber-400">
                <ShieldCheck /> Painel admin
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={loggingOut} onSelect={handleLogout}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
