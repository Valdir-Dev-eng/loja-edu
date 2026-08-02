import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import styles from "./Login.module.css";

export function Login() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { notify } = useNotifications();
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.onboardingCompleted ? "/" : "/onboarding", { replace: true });
    }
  }, [isLoading, user, navigate]);

  async function handleGoogleLogin() {
    setError(null);
    setRedirecting(true);
    try {
      const response = await fetch("/auth/google?origin=loja", { credentials: "include" });
      const body = await response.json();
      if (!body.url) {
        throw new Error("Não foi possível iniciar o login com o Google.");
      }
      window.location.href = body.url;
    } catch {
      const message = "Não foi possível iniciar o login com o Google. Tente novamente.";
      setError(message);
      notify({ type: "error", title: "Falha ao entrar", message });
      setRedirecting(false);
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Entrar na Sorofarma</h1>
        <p className={styles.subtitle}>Acesse sua conta para acompanhar pedidos, endereços e finalizar compras.</p>

        <button className={styles.googleButton} onClick={handleGoogleLogin} disabled={redirecting}>
          {redirecting ? "Redirecionando..." : "Entrar com Google"}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
