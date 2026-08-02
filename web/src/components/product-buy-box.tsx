"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Ruler, ShoppingCart, Truck } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useNotifications } from "@/hooks/use-notifications";
import { apiClient, ApiError } from "@/lib/api-client";
import { discountPercentage, finalPriceCents, formatCentsToBRL } from "@/lib/money";
import type { ProductOutput, ShippingOption } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductBuyBoxProps {
  product: ProductOutput;
  activeImageUrl: string | null;
}

export function ProductBuyBox({ product, activeImageUrl }: ProductBuyBoxProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { notify } = useNotifications();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const percentage = discountPercentage(product.priceCents, product.discountCents);
  const finalPrice = finalPriceCents(product.priceCents, product.discountCents);
  const outOfStock = product.stock <= 0;

  function handleAddToCart(): boolean {
    const result = addItem(
      {
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        discountCents: product.discountCents,
        stock: product.stock,
        imageUrl: activeImageUrl,
      },
      quantity
    );

    if (result.addedQuantity > 0) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      notify({ type: "success", title: "Adicionado ao carrinho", message: `${result.addedQuantity}x ${product.name}` });
      return true;
    }

    notify({
      type: "warning",
      title: "Limite de estoque atingido",
      message: `Você já tem no carrinho todo o estoque disponível de "${product.name}".`,
    });
    return false;
  }

  function handleBuyNow() {
    if (handleAddToCart()) {
      router.push("/carrinho");
    }
  }

  async function handleCalculateShipping(event: FormEvent) {
    event.preventDefault();
    const cleanPostalCode = postalCode.replace(/\D/g, "");
    if (cleanPostalCode.length !== 8) {
      setShippingError("Informe um CEP com 8 dígitos.");
      return;
    }
    setShippingLoading(true);
    setShippingOptions(null);
    setShippingError(null);
    try {
      const options = await apiClient.post<ShippingOption[]>("/shipping/quote", {
        destinationPostalCode: cleanPostalCode,
        items: [{ productId: product.id, quantity }],
      });
      setShippingOptions(options);
      if (options.length === 0) {
        notify({ type: "info", title: "Sem opções de frete", message: "Não há frete disponível para esse CEP." });
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.body.error : "Não foi possível calcular o frete. Verifique sua conexão e tente novamente.";
      setShippingError(message);
      notify({ type: "error", title: "Erro ao calcular o frete", message });
    } finally {
      setShippingLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-sm">
        <CardContent>
        <div className="flex items-center gap-3">
          {percentage > 0 && (
            <>
              <span className="text-sm text-muted-foreground line-through">{formatCentsToBRL(product.priceCents)}</span>
              <Badge className="rounded-full bg-brand-red px-2.5 py-1 text-white">-{percentage}%</Badge>
            </>
          )}
        </div>
        <span className="mt-1 block font-sans text-3xl font-extrabold text-brand-red">
          {formatCentsToBRL(finalPrice)}
        </span>

        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <span className={outOfStock ? "size-2 rounded-full bg-border" : "size-2 rounded-full bg-brand-success"} />
          {outOfStock ? "Produto sem estoque no momento" : `${product.stock} em estoque`}
        </p>

        <div className="mt-5 flex items-center gap-4">
          <span id="quantity-label" className="text-sm font-semibold">
            Quantidade
          </span>
          <div className="flex items-center overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuir quantidade"
              className="flex size-11 items-center justify-center bg-secondary"
            >
              <Minus className="size-4" />
            </button>
            <p aria-labelledby="quantity-label" aria-live="polite" className="flex w-12 items-center justify-center text-sm font-semibold">
              {quantity}
            </p>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              aria-label="Aumentar quantidade"
              className="flex size-11 items-center justify-center bg-secondary"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {quantity > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm font-semibold text-muted-foreground">
            <span>Total</span>
            <span className="font-sans text-lg font-extrabold text-foreground">
              {formatCentsToBRL(finalPrice * quantity)}
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleBuyNow} disabled={outOfStock} className="flex-1" size="lg">
            Comprar agora
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={outOfStock}
            variant={added ? "secondary" : "outline"}
            className="flex-1"
            size="lg"
          >
            <ShoppingCart className="size-4" />
            {added ? "Adicionado ✓" : "Adicionar ao carrinho"}
          </Button>
        </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary shadow-none">
        <CardContent>
        <Tabs defaultValue="frete">
          <TabsList className="w-full">
            <TabsTrigger value="frete">
              <Truck className="size-4" />
              Frete
            </TabsTrigger>
            <TabsTrigger value="detalhes">
              <Ruler className="size-4" />
              Detalhes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="frete" className="mt-4">
            <form onSubmit={handleCalculateShipping} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="00000-000"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                maxLength={9}
                aria-label="CEP de entrega"
                className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-brand-red"
              />
              <Button type="submit" disabled={shippingLoading} variant="secondary" className="bg-foreground text-background hover:bg-foreground/90">
                {shippingLoading ? "Calculando..." : "Calcular"}
              </Button>
            </form>

            {shippingError && <p className="mt-3 text-sm text-destructive">{shippingError}</p>}

            {shippingOptions && shippingOptions.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {shippingOptions.map((option) => (
                  <li
                    key={option.serviceId}
                    className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm"
                  >
                    <div>
                      <strong>{option.carrierName}</strong>
                      <span className="text-muted-foreground"> — até {option.deliveryTimeDays} dia(s) úteis</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span>{option.priceDisplay}</span>
                      <span className="text-xs text-muted-foreground">
                        Total: {formatCentsToBRL(finalPrice * quantity + option.priceCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="detalhes" className="mt-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border bg-background p-3">
                <dt className="text-xs text-muted-foreground">Peso</dt>
                <dd className="font-semibold">{product.weight} kg</dd>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <dt className="text-xs text-muted-foreground">Dimensões (L×A×C)</dt>
                <dd className="font-semibold">
                  {product.width}×{product.height}×{product.length} cm
                </dd>
              </div>
            </dl>
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
