"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useNotifications } from "@/hooks/use-notifications";
import { finalPriceCents, formatCentsToBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { ProductImageFallback } from "@/components/product-image-fallback";

export default function CarrinhoPage() {
  const { items, subtotalCents, updateQuantity, removeItem } = useCart();
  const { notify } = useNotifications();

  async function handleRemove(productId: string, name: string) {
    try {
      await removeItem(productId);
      notify({ type: "info", title: "Item removido", message: name });
    } catch {
      notify({ type: "error", title: "Não foi possível remover o item", message: "Tente novamente." });
    }
  }

  async function handleUpdateQuantity(productId: string, quantity: number) {
    try {
      await updateQuantity(productId, quantity);
    } catch {
      notify({ type: "error", title: "Não foi possível atualizar a quantidade", message: "Tente novamente." });
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-(--content-max-width) flex-col items-center gap-4 px-6 py-24 text-center">
        <p className="text-muted-foreground">Seu carrinho está vazio.</p>
        <Link href="/produtos" className="font-bold text-brand-red">
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-extrabold">Meu carrinho</h1>

      <ul className="mt-6 flex flex-col gap-4">
        {items.map((item) => {
          const unitPrice = finalPriceCents(item.priceCents, item.discountCents);
          return (
            <li key={item.productId} className="flex items-center gap-4 rounded-xl border border-border p-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                ) : (
                  <ProductImageFallback size="sm" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-semibold">{item.name}</span>
                <span className="text-sm text-muted-foreground">{formatCentsToBRL(unitPrice)} / un.</span>

                <div className="mt-1 flex w-fit items-center overflow-hidden rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                    aria-label="Diminuir quantidade"
                    className="flex size-9 items-center justify-center bg-secondary"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="flex w-10 items-center justify-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item.productId, Math.min(item.quantity + 1, item.stock))}
                    aria-label="Aumentar quantidade"
                    disabled={item.quantity >= item.stock}
                    className="flex size-9 items-center justify-center bg-secondary disabled:opacity-40"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="font-sans font-bold">{formatCentsToBRL(unitPrice * item.quantity)}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(item.productId, item.name)}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" /> Remover
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
        <span className="font-semibold text-muted-foreground">Subtotal</span>
        <span className="font-sans text-xl font-extrabold">{formatCentsToBRL(subtotalCents)}</span>
      </div>

      <Button asChild size="lg" className="mt-6 w-full">
        <Link href="/checkout">Continuar para o checkout</Link>
      </Button>
    </div>
  );
}
