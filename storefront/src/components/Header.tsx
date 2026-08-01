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
          <img src="/sorofarma.png" alt="" className={styles.logoIcon} aria-hidden="true" />
          <span className={styles.logoWordmark}>Sorofarma</span>
        </Link>

        <form className={styles.search} onSubmit={handleSearch} role="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Buscar remédios, vitaminas, cuidados..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar produtos"
          />
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M4 20C4 16 7.5 14 12 14C16.5 14 20 16 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Entrar
            </Link>
          )}
          <Link to="/carrinho" className={styles.cartButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 6H6L8.4 16.2C8.6 17 9.3 17.5 10.1 17.5H18C18.8 17.5 19.5 17 19.7 16.2L21.3 9.5C21.5 8.7 20.9 8 20.1 8H7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="21" r="1.4" fill="currentColor" />
              <circle cx="18" cy="21" r="1.4" fill="currentColor" />
            </svg>
            Carrinho
            {itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
