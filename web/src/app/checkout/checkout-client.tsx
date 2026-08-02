"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/use-cart";
import { useNotifications } from "@/hooks/use-notifications";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatCentsToBRL } from "@/lib/money";
import type { AddressOutput, CheckoutOrderOutput, PaymentStatusOutput, ShippingOption } from "@/lib/api-types";
import { Button } from "@/components/ui/button";

const PAYMENT_STATUS_POLL_INTERVAL_MS = 4000;
const FINAL_ORDER_STATUSES = new Set(["PAID", "REJECTED", "EXPIRED", "CANCELLED", "REFUNDED", "CHARGEBACK"]);

export function CheckoutClient() {
  const router = useRouter();
  const { items, subtotalCents, clear } = useCart();
  const { notify } = useNotifications();

  const [addresses, setAddresses] = useState<AddressOutput[] | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<CheckoutOrderOutput | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<AddressOutput[]>("/addresses/my")
      .then(setAddresses)
      .finally(() => setAddressesLoading(false));
  }, []);

  useEffect(() => {
    if (items.length === 0 && !order) {
      router.replace("/carrinho");
    }
  }, [items, order, router]);

  useEffect(() => {
    if (!addresses || addresses.length === 0) return;
    if (!selectedAddressId) setSelectedAddressId(addresses[0].id);
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (!order || FINAL_ORDER_STATUSES.has(paymentStatus ?? "")) return;
    const interval = setInterval(async () => {
      try {
        const status = await apiClient.get<PaymentStatusOutput>(`/order/${order.orderId}/payment-status`);
        setPaymentStatus(status.status);
        if (status.status === "PAID") {
          clear();
          notify({ type: "success", title: "Pagamento aprovado", message: "Seu pedido foi confirmado." });
        } else if (FINAL_ORDER_STATUSES.has(status.status)) {
          notify({
            type: "error",
            title: "Pagamento não concluído",
            message: `Status: ${status.status}. Tente novamente a partir do carrinho.`,
          });
        }
      } catch {
        return;
      }
    }, PAYMENT_STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [order, paymentStatus, clear, notify]);

  const selectedAddress = useMemo(
    () => addresses?.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );
  const selectedShipping = shippingOptions?.find((option) => option.serviceId === selectedServiceId) ?? null;
  const grandTotalCents = subtotalCents + (selectedShipping?.priceCents ?? 0);

  async function handleCalculateShipping(addressId: string) {
    const address = addresses?.find((candidate) => candidate.id === addressId);
    if (!address) return;
    setShippingLoading(true);
    setShippingOptions(null);
    setSelectedServiceId(null);
    setError(null);
    try {
      const options = await apiClient.post<ShippingOption[]>("/shipping/quote", {
        destinationPostalCode: address.zipCode,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      setShippingOptions(options);
      if (options.length === 0) {
        notify({ type: "info", title: "Sem opções de frete", message: "Não há frete disponível para este endereço." });
      }
    } catch (shippingError) {
      const message = shippingError instanceof ApiError ? shippingError.body.error : "Não foi possível calcular o frete para este endereço.";
      setError(message);
      notify({ type: "error", title: "Erro ao calcular o frete", message });
    } finally {
      setShippingLoading(false);
    }
  }

  function handleSelectAddress(addressId: string) {
    setSelectedAddressId(addressId);
    handleCalculateShipping(addressId);
  }

  async function handleConfirmOrder() {
    if (!selectedAddress || !selectedServiceId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.post<CheckoutOrderOutput>("/order/checkout", {
        addressId: selectedAddress.id,
        shippingServiceId: selectedServiceId,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      setOrder(result);
      setPaymentStatus(result.status);
      notify({ type: "success", title: "Pedido criado", message: "Escaneie o QR Code ou copie o código PIX para pagar." });
    } catch (checkoutError) {
      const message = checkoutError instanceof ApiError ? checkoutError.body.error : "Não foi possível concluir o pedido. Tente novamente.";
      setError(message);
      notify({ type: "error", title: "Não foi possível concluir o pedido", message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyPixCode() {
    if (!order) return;
    navigator.clipboard
      .writeText(order.qrCode)
      .then(() => notify({ type: "success", title: "Código copiado", message: "Cole no app do seu banco para pagar." }))
      .catch(() => notify({ type: "error", title: "Não foi possível copiar", message: "Copie o código manualmente." }));
  }

  if (order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          {paymentStatus === "PAID" ? (
            <>
              <h1 className="text-xl font-extrabold">Pagamento aprovado!</h1>
              <p className="text-muted-foreground">Seu pedido foi confirmado.</p>
              <Button asChild size="lg" className="w-full">
                <Link href="/pedidos">Ver meus pedidos</Link>
              </Button>
            </>
          ) : paymentStatus && FINAL_ORDER_STATUSES.has(paymentStatus) ? (
            <>
              <h1 className="text-xl font-extrabold">Pagamento não concluído</h1>
              <p className="text-muted-foreground">Status: {paymentStatus}. Tente novamente a partir do carrinho.</p>
              <Button asChild size="lg" className="w-full">
                <Link href="/carrinho">Voltar ao carrinho</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-extrabold">Pague com PIX para confirmar</h1>
              <p className="font-sans text-lg font-bold text-brand-red">Total: {order.grandTotalDisplay}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- base64 dinamico, sem sentido otimizar com next/image */}
              <img
                className="size-56 rounded-lg border border-border"
                src={`data:image/png;base64,${order.qrCodeBase64}`}
                alt="QR Code do PIX"
              />
              <Button onClick={handleCopyPixCode} variant="outline" className="w-full">
                Copiar código PIX
              </Button>
              <p className="text-sm text-muted-foreground">Aguardando confirmação do pagamento...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold">Checkout</h1>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold">Endereço de entrega</h2>
        {addressesLoading && <p className="text-sm text-muted-foreground">Carregando endereços...</p>}
        {!addressesLoading && addresses && addresses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Você ainda não tem endereços cadastrados.{" "}
            <Link href="/enderecos" className="font-semibold text-brand-red">
              Cadastre um endereço
            </Link>
            .
          </p>
        )}
        <div className="flex flex-col gap-2">
          {addresses?.map((address) => (
            <label
              key={address.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand-red has-[:checked]:bg-brand-red-light"
            >
              <input
                type="radio"
                name="address"
                checked={selectedAddressId === address.id}
                onChange={() => handleSelectAddress(address.id)}
                className="mt-1"
              />
              <div className="text-sm">
                <strong className="block">{address.label}</strong>
                <span className="text-muted-foreground">
                  {address.street}, {address.number} — {address.city}/{address.state}
                </span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {selectedAddressId && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold">Frete</h2>
          {shippingLoading && <p className="text-sm text-muted-foreground">Calculando opções de frete...</p>}
          {!shippingLoading && shippingOptions && shippingOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma opção de frete disponível para este endereço.</p>
          )}
          <div className="flex flex-col gap-2">
            {shippingOptions?.map((option) => (
              <label
                key={option.serviceId}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand-red has-[:checked]:bg-brand-red-light"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={selectedServiceId === option.serviceId}
                    onChange={() => setSelectedServiceId(option.serviceId)}
                  />
                  <div className="text-sm">
                    <strong>{option.carrierName}</strong>
                    <span className="text-muted-foreground"> — até {option.deliveryTimeDays} dia(s) úteis</span>
                  </div>
                </div>
                <span className="font-semibold">{option.priceDisplay}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 flex flex-col gap-2 rounded-xl bg-secondary p-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatCentsToBRL(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Frete</span>
          <span>{selectedShipping ? selectedShipping.priceDisplay : "—"}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-sans text-lg font-extrabold">
          <span>Total</span>
          <span>{formatCentsToBRL(grandTotalCents)}</span>
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleConfirmOrder}
        disabled={!selectedAddress || !selectedServiceId || submitting}
        size="lg"
        className="mt-6 w-full"
      >
        {submitting ? "Processando..." : "Confirmar pedido e pagar com PIX"}
      </Button>
    </div>
  );
}
