import Link from "next/link";
import { HeartPulse } from "lucide-react";

// Portado fiel do storefront/src/components/HeroBanner.tsx: a secao inteira
// e vermelha (gradiente pro fundo so no ultimo 5.5%), e um blob BRANCO
// recortado por cima cria a area onde o texto fica — nao o contrario (onda
// vermelha subindo por cima de um fundo branco).
const WHITE_BLOB_PATH =
  "M0,0 L1200,0 L1200,280 C1120,320 1050,240 950,230 C870,222 820,290 750,290 C660,290 620,200 520,200 C430,200 400,290 320,320 C260,342 200,340 150,320 C100,300 50,270 0,240 Z";

const WHITE_BLOB_PATH_MOBILE = "M0,0 L400,0 L400,290 C300,332 100,332 0,290 Z";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(to_bottom,var(--brand-red)_94.5%,var(--background)_100%)] pt-6 pb-[72px] sm:pt-12 sm:pb-[98px]">
      <svg
        className="absolute inset-0 z-[1] hidden h-full w-full sm:block"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={WHITE_BLOB_PATH} fill="var(--background)" />
      </svg>
      <svg
        className="absolute inset-0 z-[1] h-full w-full sm:hidden"
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={WHITE_BLOB_PATH_MOBILE} fill="var(--background)" />
      </svg>

      <div className="relative z-[2] mx-auto max-w-(--content-max-width) px-6">
        <div className="ml-8 max-w-[420px]">
          <h1 className="text-[26px] leading-[1.15] font-extrabold text-brand-red sm:text-4xl">
            Sorocaba merece esse cuidado
          </h1>
          <p className="mt-4 max-w-[400px] text-[15px] leading-[1.2] font-bold text-muted-foreground">
            Medicamentos, vitaminas e cuidado do dia a dia — a Sorofarma leva
            até você tudo que sua família precisa, com atendimento que faz
            bem.
          </p>
        </div>
      </div>

      <Link
        href="/produtos"
        className="absolute bottom-[5%] left-6 z-[2] inline-flex h-11 items-center rounded-md bg-brand-red px-6 text-sm font-bold text-white sm:bottom-[6%] sm:left-[max(1.5rem,calc((100%-1800px)/2+1.5rem))]"
      >
        Ver produtos
      </Link>

      <div
        className="absolute top-[14%] right-[14%] z-[3] hidden size-[100px] items-center justify-center rounded-full bg-brand-red-dark text-white shadow-md motion-safe:animate-[badge-float_3s_ease-in-out_infinite] sm:flex"
        aria-hidden="true"
      >
        <HeartPulse className="size-9" />
      </div>
    </section>
  );
}
