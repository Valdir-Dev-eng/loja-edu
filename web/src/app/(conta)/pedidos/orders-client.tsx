"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Accordion, Badge, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useNotifications } from "@/hooks/use-notifications";
import { useOrderPaymentSocket } from "@/hooks/use-order-payment-socket";
import type { OrderOutput, OrderStatus, PaymentStatusOutput } from "@/lib/api-types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGEBACK: "Estornado",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "yellow",
  PAID: "green",
  REJECTED: "red",
  EXPIRED: "gray",
  CANCELLED: "gray",
  REFUNDED: "blue",
  CHARGEBACK: "red",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface PixData {
  qrCode: string;
  qrCodeBase64: string;
}

function PixPaymentSection({
  pix,
  loading,
  error,
  onLoadPix,
  onCopyCode,
}: {
  pix: PixData | undefined;
  loading: boolean;
  error: string | null;
  onLoadPix: () => void;
  onCopyCode: () => void;
}) {
  if (pix) {
    return (
      <Stack gap="sm" align="center" mt="md" p="md" className="rounded-lg bg-secondary">
        <Text size="sm" fw={600}>
          Escaneie o QR Code ou copie o código PIX para pagar
        </Text>
        {/* eslint-disable-next-line @next/next/no-img-element -- base64 dinamico, sem sentido otimizar com next/image */}
        <img
          className="size-48 rounded-lg border border-border"
          src={`data:image/png;base64,${pix.qrCodeBase64}`}
          alt="QR Code do PIX"
        />
        <Button onClick={onCopyCode} variant="outline" size="sm">
          Copiar código PIX
        </Button>
        <Text size="xs" c="dimmed">
          Aguardando confirmação do pagamento...
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xs" mt="md">
      {error && (
        <Text size="sm" c="red">
          {error}
        </Text>
      )}
      <Button onClick={onLoadPix} disabled={loading} className="w-fit">
        {loading ? "Carregando..." : "Concluir pagamento"}
      </Button>
    </Stack>
  );
}

export function OrdersClient({ orders: initialOrders }: { orders: OrderOutput[] }) {
  const { notify } = useNotifications();
  const [orders, setOrders] = useState(initialOrders);
  const [pixByOrder, setPixByOrder] = useState<Record<string, PixData>>({});
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [errorByOrder, setErrorByOrder] = useState<Record<string, string | null>>({});

  const applyStatusUpdate = useCallback(
    (orderId: string, status: OrderStatus) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      if (status !== "PENDING_PAYMENT") {
        setPixByOrder((prev) => {
          if (!(orderId in prev)) return prev;
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
      }
    },
    []
  );

  const fetchPaymentStatus = useCallback(
    async (orderId: string, { silent = false }: { silent?: boolean } = {}) => {
      try {
        const result = await apiClient.get<PaymentStatusOutput>(`/order/${orderId}/payment-status`);
        applyStatusUpdate(orderId, result.status);
        if (result.status === "PENDING_PAYMENT" && result.qrCode && result.qrCodeBase64) {
          setPixByOrder((prev) => ({ ...prev, [orderId]: { qrCode: result.qrCode!, qrCodeBase64: result.qrCodeBase64! } }));
          setErrorByOrder((prev) => ({ ...prev, [orderId]: null }));
        } else if (result.status === "PENDING_PAYMENT") {
          if (!silent) {
            setErrorByOrder((prev) => ({
              ...prev,
              [orderId]: "Não foi possível carregar o pagamento agora. Tente novamente.",
            }));
          }
        } else if (!silent) {
          if (result.status === "PAID") {
            notify({ type: "success", title: "Pagamento aprovado", message: "Seu pedido foi confirmado." });
          } else {
            notify({
              type: "error",
              title: "Pagamento não concluído",
              message: `Status: ${STATUS_LABEL[result.status]}.`,
            });
          }
        }
      } catch {
        if (!silent) {
          setErrorByOrder((prev) => ({
            ...prev,
            [orderId]: "Não foi possível carregar o pagamento agora. Tente novamente.",
          }));
        }
      }
    },
    [applyStatusUpdate, notify]
  );

  async function handleLoadPix(orderId: string) {
    setLoadingOrderId(orderId);
    setErrorByOrder((prev) => ({ ...prev, [orderId]: null }));
    await fetchPaymentStatus(orderId);
    setLoadingOrderId(null);
  }

  function handleCopyPixCode(orderId: string) {
    const pix = pixByOrder[orderId];
    if (!pix) return;
    navigator.clipboard
      .writeText(pix.qrCode)
      .then(() => notify({ type: "success", title: "Código copiado", message: "Cole no app do seu banco para pagar." }))
      .catch(() => notify({ type: "error", title: "Não foi possível copiar", message: "Copie o código manualmente." }));
  }

  // Enquanto houver QR aberto de algum pedido pendente, escuta a atualização
  // via WebSocket (mesmo padrao do checkout) pra detectar a confirmacao do
  // pagamento sem o usuario precisar recarregar a pagina.
  useOrderPaymentSocket(Object.keys(pixByOrder).length > 0, (update) => {
    if (!(update.orderId in pixByOrder)) return;
    applyStatusUpdate(update.orderId, update.status);
    if (update.status === "PAID") {
      notify({ type: "success", title: "Pagamento aprovado", message: "Seu pedido foi confirmado." });
    } else if (update.status !== "PENDING_PAYMENT") {
      notify({ type: "error", title: "Pagamento não concluído", message: `Status: ${STATUS_LABEL[update.status]}.` });
    }
  });

  return (
    <Stack gap="lg">
      <Title order={2}>Meus pedidos</Title>

      {orders.length === 0 ? (
        <Card withBorder radius="lg" p="xl">
          <Text ta="center" c="dimmed">
            Você ainda não fez nenhum pedido.
          </Text>
          <Text ta="center" mt="sm">
            <Link href="/produtos" className="font-semibold text-brand-red">
              Ver produtos
            </Link>
          </Text>
        </Card>
      ) : (
        <Accordion variant="separated" radius="lg">
          {orders.map((order) => (
            <Accordion.Item key={order.id} value={order.id}>
              <Accordion.Control>
                <Group justify="space-between" wrap="wrap" pr="md">
                  <Stack gap={0}>
                    <Text fw={700}>Pedido #{order.id.slice(0, 8).toUpperCase()}</Text>
                    <Text size="xs" c="dimmed">
                      {formatDate(order.createdAt)}
                    </Text>
                  </Stack>
                  <Group gap="md">
                    <Badge color={STATUS_COLOR[order.status]} variant="light">
                      {STATUS_LABEL[order.status]}
                    </Badge>
                    <Text fw={700}>{order.totalDisplay}</Text>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Table verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Produto</Table.Th>
                      <Table.Th ta="center">Qtd.</Table.Th>
                      <Table.Th ta="right">Preço</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {order.items.map((item) => (
                      <Table.Tr key={item.productId}>
                        <Table.Td>{item.productName}</Table.Td>
                        <Table.Td ta="center">{item.quantity}</Table.Td>
                        <Table.Td ta="right">{item.priceDisplay}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                {order.status === "PENDING_PAYMENT" && (
                  <PixPaymentSection
                    pix={pixByOrder[order.id]}
                    loading={loadingOrderId === order.id}
                    error={errorByOrder[order.id] ?? null}
                    onLoadPix={() => handleLoadPix(order.id)}
                    onCopyCode={() => handleCopyPixCode(order.id)}
                  />
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Stack>
  );
}
