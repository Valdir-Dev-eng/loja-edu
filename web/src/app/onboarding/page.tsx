import { OnboardingClient } from "./onboarding-client";

// Gate (deslogado -> /login, ja onboarded -> /) e' feito no proxy.ts, antes
// de qualquer render — nao aqui. Ver o comentario em proxy.ts pra saber por
// que fazer isso via redirect() neste componente causava recarregamento
// repetido (corrida com a hidratacao do cliente sob Cache Components).
export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <OnboardingClient />
    </div>
  );
}
