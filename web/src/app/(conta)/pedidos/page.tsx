import { getMyOrders } from "@/lib/account-data";
import { OrdersClient } from "./orders-client";

export default async function PedidosPage() {
  const orders = await getMyOrders();
  return <OrdersClient orders={orders} />;
}
