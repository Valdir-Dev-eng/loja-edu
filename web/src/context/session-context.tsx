"use client";

import { createContext, ReactNode, Suspense, useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { UserOutput } from "@/lib/api-types";

export type ClientRole = "visitor" | "customer" | "admin";

export interface SessionContextValue {
  user: UserOutput | null;
  role: ClientRole;
  isLoading: boolean;
  /** Zera a sessão localmente, sem chamada a API — usado pelo logout, que já sabe o resultado. */
  clear: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

function roleOf(user: UserOutput | null): ClientRole {
  if (!user) return "visitor";
  return user.isAdmin ? "admin" : "customer";
}

// usePathname() precisa da URL da requisicao pra nao gerar mismatch na
// hidratacao — sob Cache Components isso marca a arvore inteira dali pra
// baixo como dinamica (quebra o prerender estatico de rotas como
// /produto/[id]). Por isso fica isolado neste componente-folha, sem filhos,
// dentro do <Suspense> que SessionProvider declara: so essa fatia invisivel
// vira dinamica, o resto do app continua estatico.
function RevalidateOnNavigate({ onSettled }: { onSettled: (user: UserOutput | null) => void }) {
  const pathname = usePathname();

  useEffect(() => {
    apiClient
      .get<UserOutput>("/auth/me")
      .then(onSettled)
      .catch(() => onSettled(null));
  }, [pathname, onSettled]);

  return null;
}

// Fonte unica da sessao pro front inteiro — nenhum outro componente chama
// /auth/me (ver useSession). apiClient ja resolve 401 sozinho (refresh +
// retry), entao aqui so cuidamos de guardar o resultado.
//
// Revalida a cada troca de rota (RevalidateOnNavigate reage a usePathname,
// que muda em toda navegacao, inclusive client-side via <Link>), cobrindo o
// token expirando no meio da navegacao sem precisar de polling. isLoading
// so fica true na primeira carga: revalidacoes em segundo plano trocam o
// usuario silenciosamente, sem piscar o header a cada clique (a licao do
// bug de recarregamento repetido em /onboarding — ver comentario em proxy.ts).
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSettled = useCallback((result: UserOutput | null) => {
    setUser(result);
    setIsLoading(false);
  }, []);

  const clear = useCallback(() => setUser(null), []);

  return (
    <SessionContext.Provider value={{ user, role: roleOf(user), isLoading, clear }}>
      {children}
      <Suspense fallback={null}>
        <RevalidateOnNavigate onSettled={handleSettled} />
      </Suspense>
    </SessionContext.Provider>
  );
}
