import { Link } from "react-router-dom";
import { STORE_CONTACT } from "../lib/storeContact";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div>
            <div className={styles.wordmark}>Sorofarma</div>
            <p className={styles.slogan}>Sorocaba merece esse cuidado.</p>
          </div>

          <div>
            <h4 className={styles.heading}>Atendimento</h4>
            <p className={styles.text}>{STORE_CONTACT.address}</p>
            <p className={styles.text}>{STORE_CONTACT.whatsapp}</p>
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
      </div>

      <div className={styles.bottomBar}>
        <div className="container">
          <span>© {new Date().getFullYear()} Sorofarma. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
