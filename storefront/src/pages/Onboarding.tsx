import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { api, ApiError } from "../lib/api";
import type { CompleteOnboardingOutput } from "../types/api";
import styles from "./Onboarding.module.css";

interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [label, setLabel] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.onboardingCompleted) {
      navigate("/", { replace: true });
    }
  }, [isLoading, user, navigate]);

  async function handleZipCodeBlur() {
    const cleanZipCode = zipCode.replace(/\D/g, "");
    if (cleanZipCode.length !== 8) {
      return;
    }
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
      const data = (await response.json()) as ViaCepResponse;
      if (data.erro) {
        setError("CEP não encontrado.");
        return;
      }
      setStreet(data.logradouro ?? "");
      setNeighborhood(data.bairro ?? "");
      setCity(data.localidade ?? "");
      setState(data.uf ?? "");
      setError(null);
    } catch {
      setError("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<CompleteOnboardingOutput>("/auth/onboarding", {
        fullName,
        document: document.replace(/\D/g, ""),
        addresses: [
          {
            recipientName,
            zipCode: zipCode.replace(/\D/g, ""),
            street,
            number,
            complement: complement.trim().length > 0 ? complement : null,
            neighborhood,
            city,
            state: state.toUpperCase(),
            label,
          },
        ],
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/", { replace: true });
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.body.error);
      } else {
        setError("Não foi possível concluir o cadastro. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Complete seu cadastro</h1>
        <p className={styles.subtitle}>Precisamos de mais alguns dados para você comprar na Sorofarma.</p>

        <div className={styles.fieldGroup}>
          <label htmlFor="fullName">Nome completo</label>
          <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="document">CPF ou CNPJ</label>
          <input
            id="document"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="000.000.000-00"
            inputMode="numeric"
            required
          />
        </div>

        <h2 className={styles.sectionTitle}>Endereço</h2>

        <div className={styles.fieldGroup}>
          <label htmlFor="zipCode">CEP</label>
          <input
            id="zipCode"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onBlur={handleZipCodeBlur}
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            required
          />
          {cepLoading && <span className={styles.hint}>Buscando endereço...</span>}
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="street">Rua</label>
          <input id="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
        </div>

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label htmlFor="number">Número</label>
            <input id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="complement">Complemento</label>
            <input id="complement" value={complement} onChange={(e) => setComplement(e.target.value)} />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="neighborhood">Bairro</label>
          <input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
        </div>

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label htmlFor="city">Cidade</label>
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="state">UF</label>
            <input id="state" value={state} onChange={(e) => setState(e.target.value)} maxLength={2} required />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="recipientName">Destinatário</label>
          <input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="label">Identificação do endereço</label>
          <input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Casa, Trabalho..." required />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitButton} type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Concluir cadastro"}
        </button>
      </form>
    </div>
  );
}
