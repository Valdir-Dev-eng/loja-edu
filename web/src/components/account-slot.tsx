"use client";

import Link from "next/link";
import { LayoutDashboard, ShieldCheck, User, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountMenu } from "@/components/account-menu";
import { MobileLogoutButton } from "@/components/mobile-logout-button";
import { useSession } from "@/hooks/use-session";

function GuestLoginButton({ size }: { size?: "lg" }) {
  return (
    <Button variant="outline" size={size} asChild>
      <Link href="/login">
        <User className="size-4" />
        Entrar
      </Link>
    </Button>
  );
}

function AccountSlotSkeleton({ size }: { size?: "lg" }) {
  return <div className={`animate-pulse rounded-md bg-secondary ${size === "lg" ? "h-9 w-full" : "h-8 w-24"}`} />;
}

// Admin fica com um atalho proprio na toolbar, nao so escondido dentro do
// dropdown de conta — e uma acao frequente pra quem administra a loja.
function AdminShortcut() {
  return (
    <Button variant="ghost" asChild className="text-amber-700 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-400">
      <Link href="/app">
        <LayoutDashboard className="size-4" />
        Painel admin
      </Link>
    </Button>
  );
}

export function DesktopAccountSlot() {
  const { user, role, isLoading } = useSession();
  if (isLoading) return <AccountSlotSkeleton />;
  if (!user) return <GuestLoginButton />;
  return (
    <>
      {role === "admin" && <AdminShortcut />}
      <AccountMenu user={user} />
    </>
  );
}

export function MobileAccountLinks() {
  const { user, role, isLoading } = useSession();
  if (isLoading) return <AccountSlotSkeleton size="lg" />;
  if (!user) {
    return (
      <Button asChild size="lg" className="mt-auto">
        <Link href="/login">
          <User className="size-4" />
          Entrar
        </Link>
      </Button>
    );
  }
  return (
    <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
      <div className="flex items-center justify-between px-3 pb-1">
        <span className="text-sm font-semibold text-foreground">{user.fullName?.split(" ")[0] ?? user.username}</span>
        {role === "admin" && (
          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
            Admin
          </Badge>
        )}
      </div>
      <Link href="/perfil" prefetch={false} className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-foreground active:bg-secondary">
        <UserRound className="size-4" /> Meu perfil
      </Link>
      {role === "admin" && (
        <Link href="/app" className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-amber-700 active:bg-amber-500/10 dark:text-amber-400">
          <ShieldCheck className="size-4" /> Painel admin
        </Link>
      )}
      <MobileLogoutButton />
    </div>
  );
}
