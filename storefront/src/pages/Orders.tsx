import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import type { OrderOutput } from "../types/api";
import styles from "./Orders.module.css";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGEBACK: "Estornado",
};

export function Orders() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useAuth();

  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [userLoading, user, navigate]);

  const { data: orders, isLoading } = useQuery<OrderOutput[]>({
    queryKey: ["orders", "my"],
    queryFn: () => api.get<OrderOutput[]>("/order/my"),
    enabled: Boolean(user),
  });

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Meus pedidos</h1>

      {isLoading && <p className={styles.hint}>Carregando pedidos...</p>}
      {!isLoading && orders && orders.length === 0 && <p className={styles.hint}>Você ainda não fez nenhum pedido.</p>}

      <ul className={styles.list}>
        {orders?.map((order) => (
          <li key={order.id} className={styles.order}>
            <div className={styles.orderHeader}>
              <span className={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
              <span className={styles.statusBadge}>{STATUS_LABELS[order.status] ?? order.status}</span>
            </div>
            <ul className={styles.itemList}>
              {order.items.map((item) => (
                <li key={item.productId} className={styles.item}>
                  <span>
                    {item.quantity}x {item.productName}
                  </span>
                  <span>{item.priceDisplay}</span>
                </li>
              ))}
            </ul>
            <div className={styles.orderTotal}>
              <span>Total</span>
              <span>{order.totalDisplay}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
