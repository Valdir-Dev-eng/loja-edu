"use client";

import { FormEvent, useState } from "react";
import { ActionIcon, Button, Card, Group, Modal, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Plus, Trash2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { useNotifications } from "@/hooks/use-notifications";
import type { AddressInput, AddressOutput } from "@/lib/api-types";

interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

const EMPTY_FORM: AddressInput = {
  recipientName: "",
  zipCode: "",
  street: "",
  number: "",
  complement: null,
  neighborhood: "",
  city: "",
  state: "",
  label: "",
};

export function AddressesClient({ initialAddresses }: { initialAddresses: AddressOutput[] }) {
  const { notify } = useNotifications();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function setField<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleZipBlur() {
    const clean = form.zipCode.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = (await response.json()) as ViaCepResponse;
      if (data.erro) return;
      setForm((current) => ({
        ...current,
        street: data.logradouro ?? current.street,
        neighborhood: data.bairro ?? current.neighborhood,
        city: data.localidade ?? current.city,
        state: data.uf ?? current.state,
      }));
    } catch {
      // silencioso: usuario preenche manualmente se o ViaCEP falhar
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await apiClient.post<AddressOutput>("/addresses", {
        ...form,
        zipCode: form.zipCode.replace(/\D/g, ""),
        state: form.state.toUpperCase(),
        complement: form.complement?.trim() ? form.complement : null,
      });
      setAddresses((current) => [...current, created]);
      notify({ type: "success", title: "Endereço adicionado", message: "Seu novo endereço já pode ser usado no checkout." });
      setForm(EMPTY_FORM);
      close();
    } catch (error) {
      const message = error instanceof ApiError ? error.body.error : "Não foi possível salvar o endereço.";
      notify({ type: "error", title: "Erro ao salvar endereço", message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      await apiClient.delete(`/addresses/${id}`);
      setAddresses((current) => current.filter((address) => address.id !== id));
      notify({ type: "info", title: "Endereço removido", message: "" });
    } catch (error) {
      const message = error instanceof ApiError ? error.body.error : "Não foi possível remover o endereço.";
      notify({ type: "error", title: "Erro ao remover endereço", message });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Endereços</Title>
        <Button leftSection={<Plus size={16} />} onClick={open}>
          Adicionar endereço
        </Button>
      </Group>

      {addresses.length === 0 ? (
        <Card withBorder radius="lg" p="xl">
          <Text ta="center" c="dimmed">
            Você ainda não tem endereços cadastrados.
          </Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {addresses.map((address) => (
            <Card key={address.id} withBorder radius="lg" p="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text fw={700}>{address.label}</Text>
                  <Text size="sm">
                    {address.street}, {address.number}
                    {address.complement ? ` — ${address.complement}` : ""}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {address.neighborhood} — {address.city}/{address.state}
                  </Text>
                  <Text size="sm" c="dimmed">
                    CEP {address.zipCode}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Destinatário: {address.recipientName}
                  </Text>
                </Stack>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  loading={removingId === address.id}
                  onClick={() => handleRemove(address.id)}
                  aria-label="Remover endereço"
                >
                  <Trash2 size={18} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={opened} onClose={close} title="Novo endereço" centered>
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="CEP"
              value={form.zipCode}
              onChange={(e) => setField("zipCode", e.target.value)}
              onBlur={handleZipBlur}
              placeholder="00000-000"
              description={cepLoading ? "Buscando endereço..." : undefined}
              required
            />
            <TextInput label="Rua" value={form.street} onChange={(e) => setField("street", e.target.value)} required />
            <Group grow>
              <TextInput label="Número" value={form.number} onChange={(e) => setField("number", e.target.value)} required />
              <TextInput
                label="Complemento"
                value={form.complement ?? ""}
                onChange={(e) => setField("complement", e.target.value)}
              />
            </Group>
            <TextInput
              label="Bairro"
              value={form.neighborhood}
              onChange={(e) => setField("neighborhood", e.target.value)}
              required
            />
            <Group grow>
              <TextInput label="Cidade" value={form.city} onChange={(e) => setField("city", e.target.value)} required />
              <TextInput
                label="UF"
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                maxLength={2}
                required
              />
            </Group>
            <TextInput
              label="Destinatário"
              value={form.recipientName}
              onChange={(e) => setField("recipientName", e.target.value)}
              required
            />
            <TextInput
              label="Identificação"
              placeholder="Casa, Trabalho..."
              value={form.label}
              onChange={(e) => setField("label", e.target.value)}
              required
            />
            <Button type="submit" loading={submitting} fullWidth mt="sm">
              Salvar endereço
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
