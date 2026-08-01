import styles from "./TrustSection.module.css";

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
    <section className={`container ${styles.section}`}>
      <div className={styles.grid}>
        {POINTS.map((point) => (
          <div className={styles.card} key={point.title}>
            <h3 className={styles.title}>{point.title}</h3>
            <p className={styles.text}>{point.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
