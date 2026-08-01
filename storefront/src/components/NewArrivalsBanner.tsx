import { Link } from "react-router-dom";
import { WaveDivider } from "./WaveDivider";
import styles from "./NewArrivalsBanner.module.css";

export function NewArrivalsBanner() {
  return (
    <section className={styles.banner}>
      <WaveDivider position="top" className={styles.wave} />

      <div className={styles.content}>
        <span className={styles.tag}>NOVIDADE</span>
        <h2 className={styles.headline}>Chegou na Sorofarma</h2>
        <p className={styles.subtext}>Os lançamentos mais recentes, direto pra você.</p>
        <Link to="/produtos" className={styles.cta}>
          Ver novidades
        </Link>
      </div>
    </section>
  );
}
