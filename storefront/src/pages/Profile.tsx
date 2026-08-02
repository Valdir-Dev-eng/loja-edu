import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAddresses } from "../hooks/useAddresses";
import { useNotifications } from "../hooks/useNotifications";
import styles from "./Profile.module.css";

export function Profile() {
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();
  const { data: addresses } = useAddresses(Boolean(user));
  const { notify } = useNotifications();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [isLoading, user, navigate]);

  async function handleLogout() {
    try {
      await logout();
      notify({ type: "info", title: "Sessão encerrada", message: "Até breve!" });
      navigate("/", { replace: true });
    } catch {
      notify({ type: "error", title: "Não foi possível sair", message: "Tente novamente em instantes." });
    }
  }

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Meu perfil</h1>

      <section className={styles.card}>
        <div className={styles.avatar} aria-hidden="true">
          {(user.fullName ?? user.username).charAt(0).toUpperCase()}
        </div>
        <div className={styles.identity}>
          <span className={styles.name}>{user.fullName ?? user.username}</span>
          <span className={styles.email}>{user.email}</span>
        </div>
        {!user.onboardingCompleted && (
          <Link to="/onboarding" className={styles.pendingBadge}>
            Cadastro incompleto — clique para concluir
          </Link>
        )}
      </section>

      <section className={styles.grid}>
        <div className={styles.infoBlock}>
          <span className={styles.label}>Nome de usuário</span>
          <span className={styles.value}>{user.username}</span>
        </div>
        <div className={styles.infoBlock}>
          <span className={styles.label}>E-mail</span>
          <span className={styles.value}>{user.email}</span>
        </div>
        <div className={styles.infoBlock}>
          <span className={styles.label}>Endereços cadastrados</span>
          <span className={styles.value}>{addresses?.length ?? 0}</span>
        </div>
        <div className={styles.infoBlock}>
          <span className={styles.label}>Situação do cadastro</span>
          <span className={styles.value}>{user.onboardingCompleted ? "Completo" : "Pendente"}</span>
        </div>
      </section>

      <nav className={styles.links}>
        <Link to="/pedidos" className={styles.linkCard}>
          <span>Meus pedidos</span>
          <span className={styles.chevron} aria-hidden="true">›</span>
        </Link>
        <Link to="/enderecos" className={styles.linkCard}>
          <span>Meus endereços</span>
          <span className={styles.chevron} aria-hidden="true">›</span>
        </Link>
      </nav>

      <button type="button" className={styles.logoutButton} onClick={handleLogout}>
        Sair da conta
      </button>
    </div>
  );
}
