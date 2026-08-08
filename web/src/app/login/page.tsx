import { LoginClient } from "./login-client";

// Gate (redireciona embora se ja tiver sessao) e' feito no proxy.ts, antes
// de qualquer render — nao aqui. Ver o comentario em proxy.ts pra saber por
// que fazer isso via redirect() neste componente causava recarregamento
// repetido (corrida com a hidratacao do cliente sob Cache Components).
export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-(--content-max-width) justify-center px-4 py-16 sm:px-6">
      <LoginClient />
    </div>
  );
}
