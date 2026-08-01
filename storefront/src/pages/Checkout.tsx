import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAddresses } from "../hooks/useAddresses";
import { useCart } from "../hooks/useCart";
import { api } from "../lib/api";
import { formatCentsToBRL } from "../lib/money";
import type { CheckoutOrderOutput, PaymentStatusOutput, ShippingOption } from "../types/api";
import styles from "./Checkout.module.css";

const PAYMENT_STATUS_POLL_INTERVAL_MS = 4000;
const FINAL_ORDER_STATUSES = new Set(["PAID", "REJECTED", "EXPIRED", "CANCELLED", "REFUNDED", "CHARGEBACK"]);

export function Checkout() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useAuth();
  const { items, subtotalCents, clear } = useCart();
  const { data: addresses, isLoading: addressesLoading } = useAddresses(Boolean(user));

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<CheckoutOrderOutput | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) {
      return;
    }
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!user.onboardingCompleted) {
      navigate("/onboarding", { replace: true });
    }
  }, [userLoading, user, navigate]);

  useEffect(() => {
    if (items.length === 0 && !order) {
      navigate("/carrinho", { replace: true });
    }
  }, [items, order, navigate]);

  useEffect(() => {
    if (!addresses || addresses.length === 0) {
      return;
    }
    if (!selectedAddressId) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (!order || FINAL_ORDER_STATUSES.has(paymentStatus ?? "")) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const status = await api.get<PaymentStatusOutput>(`/order/${order.orderId}/payment-status`);
        setPaymentStatus(status.status);
        if (status.status === "PAID") {
          clear();
        }
      } catch {
        return;
      }
    }, PAYMENT_STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [order, paymentStatus, clear]);

  const selectedAddress = useMemo(
    () => addresses?.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const selectedShipping = shippingOptions?.find((option) => option.serviceId === selectedServiceId) ?? null;
  const grandTotalCents = subtotalCents + (selectedShipping?.priceCents ?? 0);

  async function handleCalculateShipping(addressId: string) {
    const address = addresses?.find((candidate) => candidate.id === addressId);
    if (!address) {
      return;
    }
    setShippingLoading(true);
    setShippingOptions(null);
    setSelectedServiceId(null);
    setError(null);
    try {
      const options = await api.post<ShippingOption[]>("/shipping/quote", {
        destinationPostalCode: address.zipCode,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      setShippingOptions(options);
    } catch {
      setError("Não foi possível calcular o frete para este endereço.");
    } finally {
      setShippingLoading(false);
    }
  }

  function handleSelectAddress(addressId: string) {
    setSelectedAddressId(addressId);
    handleCalculateShipping(addressId);
  }

  async function handleConfirmOrder() {
    if (!selectedAddress || !selectedServiceId) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<CheckoutOrderOutput>("/order/checkout", {
        addressId: selectedAddress.id,
        shippingServiceId: selectedServiceId,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      setOrder(result);
      setPaymentStatus(result.status);
    } catch {
      setError("Não foi possível concluir o pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyPixCode() {
    if (order) {
      navigator.clipboard.writeText(order.qrCode);
    }
  }

  if (order) {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.paymentCard}>
          {paymentStatus === "PAID" ? (
            <>
              <h1 className={styles.title}>Pagamento aprovado!</h1>
              <p className={styles.subtitle}>Seu pedido foi confirmado.</p>
              <Link to="/pedidos" className={styles.primaryButton}>
                Ver meus pedidos
              </Link>
            </>
          ) : paymentStatus && FINAL_ORDER_STATUSES.has(paymentStatus) ? (
            <>
              <h1 className={styles.title}>Pagamento não concluído</h1>
              <p className={styles.subtitle}>Status: {paymentStatus}. Tente novamente a partir do carrinho.</p>
              <Link to="/carrinho" className={styles.primaryButton}>
                Voltar ao carrinho
              </Link>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Pague com PIX para confirmar</h1>
              <p className={styles.subtitle}>Total: {order.grandTotalDisplay}</p>
              <img className={styles.qrImage} src={`data:image/png;base64,${order.qrCodeBase64}`} alt="QR Code do PIX" />
              <button type="button" className={styles.copyButton} onClick={handleCopyPixCode}>
                Copiar código PIX
              </button>
              <p className={styles.waiting}>Aguardando confirmação do pagamento...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Checkout</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Endereço de entrega</h2>
        {addressesLoading && <p className={styles.hint}>Carregando endereços...</p>}
        {!addressesLoading && addresses && addresses.length === 0 && (
          <p className={styles.hint}>
            Você ainda não tem endereços cadastrados.{" "}
            <Link to="/enderecos" className={styles.link}>
              Cadastre um endereço
            </Link>
            .
          </p>
        )}
        <div className={styles.addressList}>
          {addresses?.map((address) => (
            <label key={address.id} className={styles.addressOption}>
              <input
                type="radio"
                name="address"
                checked={selectedAddressId === address.id}
                onChange={() => handleSelectAddress(address.id)}
              />
              <div>
                <strong>{address.label}</strong>
                <span>
                  {address.street}, {address.number} — {address.city}/{address.state}
                </span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {selectedAddressId && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Frete</h2>
          {shippingLoading && <p className={styles.hint}>Calculando opções de frete...</p>}
          {!shippingLoading && shippingOptions && shippingOptions.length === 0 && (
            <p className={styles.hint}>Nenhuma opção de frete disponível para este endereço.</p>
          )}
          <div className={styles.shippingList}>
            {shippingOptions?.map((option) => (
              <label key={option.serviceId} className={styles.shippingOption}>
                <input
                  type="radio"
                  name="shipping"
                  checked={selectedServiceId === option.serviceId}
                  onChange={() => setSelectedServiceId(option.serviceId)}
                />
                <div>
                  <strong>{option.carrierName}</strong>
                  <span> — até {option.deliveryTimeDays} dia(s) úteis</span>
                </div>
                <span className={styles.shippingPrice}>{option.priceDisplay}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>{formatCentsToBRL(subtotalCents)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Frete</span>
          <span>{selectedShipping ? selectedShipping.priceDisplay : "—"}</span>
        </div>
        <div className={styles.summaryTotalRow}>
          <span>Total</span>
          <span>{formatCentsToBRL(grandTotalCents)}</span>
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="button"
        className={styles.confirmButton}
        onClick={handleConfirmOrder}
        disabled={!selectedAddress || !selectedServiceId || submitting}
      >
        {submitting ? "Processando..." : "Confirmar pedido e pagar com PIX"}
      </button>
    </div>
  );
}
