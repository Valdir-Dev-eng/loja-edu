import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import styles from "./Header.module.css";

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [search, setSearch] = useState("");

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = search.trim();
    navigate(trimmed ? `/produtos?busca=${encodeURIComponent(trimmed)}` : "/produtos");
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.logo} aria-label="Sorofarma — página inicial">
          <span className={styles.logoIcon} aria-hidden="true">
            <span className={styles.logoIconRed}>S</span>
            <span className={styles.logoIconGray}>F</span>
          </span>
          <span className={styles.logoWordmark}>Sorofarma</span>
        </Link>

        <form className={styles.search} onSubmit={handleSearch} role="search">
          <input
            type="search"
            placeholder="Buscar remédios, vitaminas, cuidados..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar produtos"
          />
          <button type="submit" aria-label="Buscar">
            Buscar
          </button>
        </form>

        <nav className={styles.actions}>
          {user ? (
            <details className={styles.accountMenu}>
              <summary className={styles.actionButton}>
                Olá, {user.fullName?.split(" ")[0] ?? user.username}
              </summary>
              <div className={styles.accountDropdown}>
                <Link to="/pedidos">Meus pedidos</Link>
                <Link to="/enderecos">Meus endereços</Link>
                <button type="button" onClick={logout}>
                  Sair
                </button>
              </div>
            </details>
          ) : (
            <Link to="/login" className={styles.actionButton}>
              Entrar
            </Link>
          )}
          <Link to="/carrinho" className={styles.cartButton}>
            Carrinho
            {itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
