import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { CartItemOutput, UserOutput } from "./api-types";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:9090";
const SESSION_COOKIE = "tokenUser";

// Nao decodificamos o token aqui — o Express e o unico dono do segredo.
// Validar contra /auth/me garante que revogacao/expiracao no backend
// funcionam de imediato, sem duplicar logica de sessao no Next.
// cache() dedupe: layout + page podem chamar isso na mesma renderizacao
// sem disparar duas idas ao backend.
export const getSessionUser = cache(async (): Promise<UserOutput | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${API_ORIGIN}/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as UserOutput;
  } catch {
    return null;
  }
});

// null = visitante (sem sessao) — diferente de [] (logado, carrinho vazio).
// O CartHydrator no cliente usa essa distincao pra decidir se fica no modo
// localStorage (visitante) ou passa a sincronizar com o backend (logado).
export const getCartItems = cache(async (): Promise<CartItemOutput[] | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${API_ORIGIN}/cart/my`, {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as CartItemOutput[];
  } catch {
    return null;
  }
});
