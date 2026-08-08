import { ReactNode } from "react";
import { getSessionUser } from "@/lib/session";
import { AccountShell } from "./account-shell";

// Gate (deslogado -> /login, onboarding pendente -> /onboarding) e' feito no
// proxy.ts, antes de qualquer render — nao aqui. Ver o comentario em
// proxy.ts pra saber por que fazer isso via redirect() neste componente
// causava render travado (corrida com a hidratacao do cliente sob Cache
// Components). Se por algum motivo o usuario chegar aqui sem sessao valida
// (ex: token expirou entre o proxy e este render), so nao mostra nada — a
// proxima navegacao/refresh passa pelo proxy de novo e redireciona certo.
export async function AccountGate({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  return <AccountShell user={user}>{children}</AccountShell>;
}
