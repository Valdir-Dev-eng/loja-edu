import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAddresses, useAddressMutations } from "../hooks/useAddresses";
import { useNotifications } from "../hooks/useNotifications";
import { ApiError } from "../lib/api";
import styles from "./Addresses.module.css";

const MAX_ADDRESSES = 5;

interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export function Addresses() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useAuth();
  const { data: addresses, isLoading } = useAddresses(Boolean(user));
  const { createAddress, deleteAddress } = useAddressMutations();
  const { notify } = useNotifications();

  const [showForm, setShowForm] = useState(false);
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [userLoading, user, navigate]);

  function resetForm() {
    setRecipientName("");
    setLabel("");
    setZipCode("");
    setStreet("");
    setNumber("");
    setComplement("");
    setNeighborhood("");
    setCity("");
    setState("");
    setError(null);
  }

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
    setSubmitting(true);
    setError(null);
    try {
      await createAddress({
        recipientName,
        zipCode: zipCode.replace(/\D/g, ""),
        street,
        number,
        complement: complement.trim().length > 0 ? complement : null,
        neighborhood,
        city,
        state: state.toUpperCase(),
        label,
      });
      resetForm();
      setShowForm(false);
      notify({ type: "success", title: "Endereço salvo", message: label ? `"${label}" adicionado aos seus endereços.` : undefined });
    } catch (submitError) {
      const message = submitError instanceof ApiError ? submitError.body.error : "Não foi possível salvar o endereço.";
      setError(message);
      notify({ type: "error", title: "Não foi possível salvar o endereço", message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    try {
      await deleteAddress(addressId);
      notify({ type: "info", title: "Endereço removido" });
    } catch {
      notify({ type: "error", title: "Não foi possível remover o endereço", message: "Tente novamente em instantes." });
    } finally {
      setDeletingId(null);
    }
  }

  const atLimit = (addresses?.length ?? 0) >= MAX_ADDRESSES;

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Meus endereços</h1>

      {isLoading && <p className={styles.hint}>Carregando endereços...</p>}
      {!isLoading && addresses && addresses.length === 0 && !showForm && (
        <p className={styles.hint}>Você ainda não tem endereços cadastrados.</p>
      )}

      <ul className={styles.list}>
        {addresses?.map((address) => (
          <li key={address.id} className={styles.address}>
            <div>
              <strong>{address.label}</strong>
              <p>
                {address.street}, {address.number}
                {address.complement ? ` — ${address.complement}` : ""}
              </p>
              <p>
                {address.neighborhood}, {address.city}/{address.state} — {address.zipCode}
              </p>
              <p className={styles.recipient}>Destinatário: {address.recipientName}</p>
            </div>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => handleDelete(address.id)}
              disabled={deletingId === address.id}
            >
              {deletingId === address.id ? "Removendo..." : "Remover"}
            </button>
          </li>
        ))}
      </ul>

      {!showForm && (
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setShowForm(true)}
          disabled={atLimit}
        >
          {atLimit ? `Limite de ${MAX_ADDRESSES} endereços atingido` : "Adicionar endereço"}
        </button>
      )}

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
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

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => { setShowForm(false); resetForm(); }}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar endereço"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
