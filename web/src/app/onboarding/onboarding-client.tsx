"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CompleteOnboardingOutput } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

export function OnboardingClient() {
  const router = useRouter();
  const { notify } = useNotifications();

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

  async function handleZipCodeBlur() {
    const cleanZipCode = zipCode.replace(/\D/g, "");
    if (cleanZipCode.length !== 8) return;
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
      await apiClient.post<CompleteOnboardingOutput>("/auth/onboarding", {
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
      notify({ type: "success", title: "Cadastro concluído", message: "Agora você já pode finalizar compras na Sorofarma." });
      router.replace("/");
    } catch (submitError) {
      const message = submitError instanceof ApiError ? submitError.body.error : "Não foi possível concluir o cadastro. Tente novamente.";
      setError(message);
      notify({ type: "error", title: "Não foi possível concluir o cadastro", message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-extrabold">Complete seu cadastro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Precisamos de mais alguns dados para você comprar na Sorofarma.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Field label="Nome completo" htmlFor="fullName">
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} />
        </Field>

        <Field label="CPF ou CNPJ" htmlFor="document">
          <Input
            id="document"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="000.000.000-00"
            inputMode="numeric"
            required
          />
        </Field>

        <h2 className="mt-2 text-sm font-bold text-brand-red uppercase">Endereço</h2>

        <Field label="CEP" htmlFor="zipCode" hint={cepLoading ? "Buscando endereço..." : undefined}>
          <Input
            id="zipCode"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onBlur={handleZipCodeBlur}
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            required
          />
        </Field>

        <Field label="Rua" htmlFor="street">
          <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Número" htmlFor="number">
            <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
          </Field>
          <Field label="Complemento" htmlFor="complement">
            <Input id="complement" value={complement} onChange={(e) => setComplement(e.target.value)} />
          </Field>
        </div>

        <Field label="Bairro" htmlFor="neighborhood">
          <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cidade" htmlFor="city">
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </Field>
          <Field label="UF" htmlFor="state">
            <Input id="state" value={state} onChange={(e) => setState(e.target.value)} maxLength={2} required />
          </Field>
        </div>

        <Field label="Destinatário" htmlFor="recipientName">
          <Input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required />
        </Field>

        <Field label="Identificação do endereço" htmlFor="label">
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Casa, Trabalho..."
            required
          />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={submitting} className="mt-6 w-full">
        {submitting ? "Salvando..." : "Concluir cadastro"}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
