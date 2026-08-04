import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, Menu, Search, ShoppingCart, User, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartBadge } from "@/components/cart-badge";
import { AccountMenu } from "@/components/account-menu";
import { MobileLogoutButton } from "@/components/mobile-logout-button";
import { OnboardingReminder } from "@/components/onboarding-reminder";
import { getSessionUser } from "@/lib/session";
import type { UserOutput } from "@/lib/api-types";

const NAV_LINKS = [
  { href: "/produtos", label: "Todos os produtos" },
  { href: "/pedidos", label: "Meus pedidos" },
  { href: "/enderecos", label: "Meus endereços" },
];

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

// Resolvido no servidor (getSessionUser le o cookie httpOnly direto) — o
// navegador nunca faz uma chamada a /auth/me pra decidir o que mostrar aqui.
// Envolvido em Suspense pra so essa fatia do header ficar "dinamica" (Cache
// Components); o resto da pagina continua estatico/cacheavel normalmente.
async function DesktopAccountSlot() {
  const user = await getSessionUser();
  return user ? <AccountMenu user={user} /> : <GuestLoginButton />;
}

async function MobileAccountLinks() {
  const user = await getSessionUser();
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
      <Link href="/perfil" className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-foreground active:bg-secondary">
        <UserRound className="size-4" /> Meu perfil
      </Link>
      {user.isAdmin && (
        <Link href="/app" className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-foreground active:bg-secondary">
          <LayoutDashboard className="size-4" /> Painel admin
        </Link>
      )}
      <MobileLogoutButton />
    </div>
  );
}

async function OnboardingSlot() {
  const user: UserOutput | null = await getSessionUser();
  return <OnboardingReminder pending={user !== null && !user.onboardingCompleted} />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-(--content-max-width) items-center gap-4 px-4 sm:h-(--spacing-header) sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="Sorofarma — página inicial"
        >
          <Image
            src="/sorofarma.png"
            alt=""
            width={56}
            height={50}
            priority
            className="h-10 w-auto sm:h-14"
          />
          <span className="font-sans text-xl font-extrabold tracking-tight text-brand-red sm:text-2xl">
            Sorofarma
          </span>
        </Link>

        {/* Desktop: busca inline + ações — nunca aparece no mobile */}
        <form
          action="/produtos"
          className="hidden flex-1 items-center gap-2 rounded-full border border-border bg-secondary px-4 lg:flex"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            name="busca"
            type="search"
            placeholder="Buscar remédios, vitaminas, cuidados..."
            aria-label="Buscar produtos"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-2 lg:flex">
          <Suspense fallback={<GuestLoginButton />}>
            <DesktopAccountSlot />
          </Suspense>
          <Button variant="outline" asChild className="relative">
            <Link href="/carrinho">
              <ShoppingCart className="size-4" />
              Carrinho
              <CartBadge />
            </Link>
          </Button>
        </nav>

        {/* Mobile: barra compacta + hambúrguer, composição própria (não é a
            navbar desktop encolhida) */}
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <Button variant="ghost" size="icon" asChild aria-label="Carrinho" className="relative">
            <Link href="/carrinho">
              <ShoppingCart className="size-5" />
              <CartBadge />
            </Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[85vw] max-w-sm flex-col gap-6">
              <SheetHeader>
                <SheetTitle className="text-left font-sans text-brand-red">
                  Sorofarma
                </SheetTitle>
              </SheetHeader>

              <form action="/produtos" className="flex items-center gap-2 rounded-full border border-border bg-secondary px-4">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  name="busca"
                  type="search"
                  placeholder="Buscar produtos..."
                  aria-label="Buscar produtos"
                  className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
              </form>

              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex h-12 items-center rounded-lg px-3 text-base font-medium text-foreground active:bg-secondary"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <Suspense fallback={<GuestLoginButton size="lg" />}>
                <MobileAccountLinks />
              </Suspense>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Suspense fallback={null}>
        <OnboardingSlot />
      </Suspense>
    </header>
  );
}
