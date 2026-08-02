import Link from "next/link";
import { Accordion, Badge, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { getMyOrders } from "@/lib/account-data";
import type { OrderStatus } from "@/lib/api-types";

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

export default async function PedidosPage() {
  const orders = await getMyOrders();

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
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Stack>
  );
}
