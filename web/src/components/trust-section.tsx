const POINTS = [
  {
    title: "Cuidado",
    text: "Farmacêuticos de verdade, prontos para orientar sua compra com atenção.",
  },
  {
    title: "Confiança",
    text: "Produtos originais, com procedência garantida e nota fiscal em toda compra.",
  },
  {
    title: "Compromisso",
    text: "Entrega rápida em Sorocaba e região, com frete calculado na hora.",
  },
];

export function TrustSection() {
  return (
    <section className="mx-auto max-w-(--content-max-width) px-4 pt-8 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {POINTS.map((point) => (
          <div key={point.title} className="rounded-xl bg-secondary p-5">
            <h3 className="text-lg font-bold text-brand-red">{point.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
