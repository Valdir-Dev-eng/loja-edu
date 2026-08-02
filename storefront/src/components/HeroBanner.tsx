import { Link } from "react-router-dom";
import styles from "./HeroBanner.module.css";

const WHITE_BLOB_PATH =
  "M0,0 L1200,0 L1200,280 C1120,320 1050,240 950,230 C870,222 820,290 750,290 C660,290 620,200 520,200 C430,200 400,290 320,320 C260,342 200,340 150,320 C100,300 50,270 0,240 Z";

const WHITE_BLOB_PATH_MOBILE = "M0,0 L400,0 L400,290 C300,332 100,332 0,290 Z";

export function HeroBanner() {
  return (
    <section className={styles.banner}>
      <svg
        className={`${styles.waveShape} ${styles.waveShapeDesktop}`}
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={WHITE_BLOB_PATH} fill="var(--color-background)" />
      </svg>
      <svg
        className={`${styles.waveShape} ${styles.waveShapeMobile}`}
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={WHITE_BLOB_PATH_MOBILE} fill="var(--color-background)" />
      </svg>

      <div className={`container ${styles.inner}`}>
        <div className={styles.textBlock}>
          <h1 className={styles.headline}>Sorocaba merece esse cuidado</h1>
          <p className={styles.subtext}>
            Medicamentos, vitaminas e cuidado do dia a dia — a Sorofarma leva até você tudo que sua família precisa,
            com atendimento que faz bem.
          </p>
        </div>
      </div>

      <Link to="/produtos" className={styles.cta}>
        Ver produtos
      </Link>

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
