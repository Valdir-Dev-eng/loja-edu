import { Link } from "react-router-dom";
import { WaveDivider } from "./WaveDivider";
import styles from "./HeroBanner.module.css";

export function HeroBanner() {
  return (
    <section className={styles.banner}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.panel}>
          <h1 className={styles.headline}>Sorocaba merece esse cuidado</h1>
          <p className={styles.subtext}>
            Medicamentos, vitaminas e cuidado do dia a dia — a Sorofarma leva até você tudo que sua família precisa,
            com atendimento que faz bem.
          </p>
          <Link to="/produtos" className={styles.cta}>
            Ver produtos
          </Link>
        </div>
      </div>

      <WaveDivider position="bottom" className={styles.wave} />

      <div className={styles.iconBadge} aria-hidden="true">
        <svg viewBox="0 0 48 48" width="30" height="30" fill="none">
          <path
            d="M24,42 C24,42 6,30 6,17 C6,10 11,5 17,5 C20.5,5 23,7 24,10 C25,7 27.5,5 31,5 C37,5 42,10 42,17 C42,30 24,42 24,42 Z"
            fill="#fff"
          />
          <path
            d="M8,23 L16,23 L19,16 L23,30 L27,14 L30,23 L40,23"
            stroke="var(--color-brand-red)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    </section>
  );
}
