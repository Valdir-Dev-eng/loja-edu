import Link from "next/link";
import { HeartPulse } from "lucide-react";

const WAVE_PATH =
  "M0,40 C150,90 350,90 500,50 C650,10 850,10 1000,50 C1080,70 1150,80 1200,60 L1200,120 L0,120 Z";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden pt-12 pb-28 sm:pt-16 sm:pb-40">
      {/* onda vermelha decorativa, sobe do rodape do banner */}
      <svg
        className="absolute inset-x-0 bottom-0 z-0 h-[55%] w-full sm:h-[65%]"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {/* Horizontal (nao diagonal): assim a cor na borda esquerda, onde
              o botao fica, e sempre --brand-red puro, igual ao botao. */}
          <linearGradient id="hero-wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--brand-red)" />
            <stop offset="100%" stopColor="var(--brand-red-dark)" />
          </linearGradient>
        </defs>
        <path d={WAVE_PATH} fill="url(#hero-wave-gradient)" />
      </svg>

      <div className="relative z-10 mx-auto max-w-(--content-max-width) px-4 sm:px-6">
        <div className="max-w-md">
          <h1 className="font-sans text-3xl leading-tight font-extrabold text-brand-red sm:text-4xl">
            Sorocaba merece esse cuidado
          </h1>
          <p className="mt-4 text-[15px] font-bold text-muted-foreground">
            Medicamentos, vitaminas e cuidado do dia a dia — a Sorofarma leva
            até você tudo que sua família precisa, com atendimento que faz
            bem.
          </p>
        </div>
      </div>

      <div
        className="absolute top-[8%] right-[8%] z-20 flex size-20 items-center justify-center rounded-full bg-brand-red-dark text-white shadow-lg motion-safe:animate-[badge-float_3s_ease-in-out_infinite] sm:size-[100px]"
        aria-hidden="true"
      >
        <HeartPulse className="size-7 sm:size-9" />
      </div>

      <Link
        href="/produtos"
        className="absolute bottom-[10%] left-4 z-20 inline-flex h-11 items-center rounded-md bg-brand-red px-6 text-sm font-bold text-white sm:left-[max(1rem,calc((100%-1800px)/2+1rem))]"
      >
        Ver produtos
      </Link>
    </section>
  );
}
