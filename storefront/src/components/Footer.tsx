import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div>
          <div className={styles.wordmark}>Sorofarma</div>
          <p className={styles.slogan}>Sorocaba merece esse cuidado.</p>
        </div>

        <div>
          <h4 className={styles.heading}>Atendimento</h4>
          <p className={styles.text}>Rua Sorocaba, 100 — Centro, Sorocaba/SP</p>
          <p className={styles.text}>(15) 3232-0000</p>
          <p className={styles.text}>contato@sorofarma.com.br</p>
        </div>

        <div>
          <h4 className={styles.heading}>Institucional</h4>
          <nav className={styles.links}>
            <Link to="/produtos">Todos os produtos</Link>
            <Link to="/pedidos">Meus pedidos</Link>
            <Link to="/enderecos">Meus endereços</Link>
          </nav>
        </div>
      </div>

      <div className={`container ${styles.bottomBar}`}>
        <span>© {new Date().getFullYear()} Sorofarma. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}
