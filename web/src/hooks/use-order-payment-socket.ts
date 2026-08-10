"use client";

import { useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import type { OrderStatus } from "@/lib/api-types";

const WS_ORIGIN = process.env.NEXT_PUBLIC_WS_ORIGIN ?? "ws://localhost:9090";
const RECONNECT_DELAY_MS = 3000;

interface OrderPaymentUpdate {
  orderId: string;
  status: OrderStatus;
}

// Substitui o polling em setInterval de /order/:id/payment-status: em vez de
// o front bater na rota repetidamente até estourar rate limit, o backend
// empurra a atualização assim que o webhook do Mercado Pago confirma o
// pagamento (ver WsOrderNotifierAdapter). O ticket avulso (não o cookie de
// sessão) autentica a conexão — ver comentário em .env.local.example.
export function useOrderPaymentSocket(active: boolean, onUpdate: (update: OrderPaymentUpdate) => void) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    if (!active) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function connect() {
      try {
        const { ticket } = await apiClient.get<{ ticket: string }>("/order/realtime-ticket");
        if (cancelled) return;
        socket = new WebSocket(`${WS_ORIGIN}/ws/orders?ticket=${ticket}`);
        socket.onmessage = (event) => {
          try {
            onUpdateRef.current(JSON.parse(event.data) as OrderPaymentUpdate);
          } catch {
            return;
          }
        };
        socket.onclose = () => {
          if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        };
      } catch {
        if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [active]);
}
