import "server-only";

import { cookies } from "next/headers";
import type { UserOutput } from "./api-types";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:9090";
const SESSION_COOKIE = "tokenUser";

// Nao decodificamos o token aqui — o Express e o unico dono do segredo.
// Validar contra /auth/me garante que revogacao/expiracao no backend
// funcionam de imediato, sem duplicar logica de sessao no Next.
export async function getSessionUser(): Promise<UserOutput | null> {
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
}
