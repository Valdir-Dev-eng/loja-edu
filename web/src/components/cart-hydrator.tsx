"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/hooks/use-cart";
import type { CartItemOutput } from "@/lib/api-types";

// serverItems === null significa visitante (SiteHeader ja resolveu isso no
// servidor) — nesse caso o carrinho fica no localStorage, sem chamada nenhuma
// ao backend. Quando logado, hidrata o CartProvider com o carrinho do banco
// (fazendo merge com o que tiver no localStorage) uma unica vez por carga de
// pagina, nunca em loop.
export function CartHydrator({ serverItems }: { serverItems: CartItemOutput[] | null }) {
  const { hydrateFromServer } = useCart();
  const alreadyHydratedRef = useRef(false);

  useEffect(() => {
    if (serverItems === null || alreadyHydratedRef.current) return;
    alreadyHydratedRef.current = true;
    hydrateFromServer(serverItems);
  }, [serverItems, hydrateFromServer]);

  return null;
}
