"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useNotifications } from "@/hooks/use-notifications";
import { discountPercentage, finalPriceCents, formatCentsToBRL } from "@/lib/money";
import type { ProductOutput } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImageFallback } from "@/components/product-image-fallback";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: ProductOutput;
  imageUrl: string | null;
}

export function ProductCard({ product, imageUrl }: ProductCardProps) {
  const { addItem } = useCart();
  const { notify } = useNotifications();
  const [added, setAdded] = useState(false);
  const percentage = discountPercentage(product.priceCents, product.discountCents);
  const finalPrice = finalPriceCents(product.priceCents, product.discountCents);
  const outOfStock = product.stock <= 0;

  async function handleAdd() {
    const result = await addItem({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      discountCents: product.discountCents,
      stock: product.stock,
      imageUrl,
    });

    if (result.addedQuantity > 0) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      notify({ type: "success", title: "Adicionado ao carrinho", message: product.name });
    } else {
      notify({
        type: "warning",
        title: "Limite de estoque atingido",
        message: `Você já tem no carrinho todo o estoque disponível de "${product.name}".`,
      });
    }
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
      <Link href={`/produto/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 240px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <ProductImageFallback size="lg" />
          )}
          {percentage > 0 && (
            <Badge className="absolute top-2 left-2 rounded-full bg-brand-red px-2.5 py-1 text-white shadow-sm">
              -{percentage}%
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={`/produto/${product.id}`}
          className="line-clamp-2 min-h-[2.6em] font-sans text-sm font-bold text-foreground"
        >
          {product.name}
        </Link>

        <div className="flex items-baseline gap-2">
          {percentage > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCentsToBRL(product.priceCents)}
            </span>
          )}
          <span className="font-sans text-xl font-extrabold text-brand-red">
            {formatCentsToBRL(finalPrice)}
          </span>
        </div>

        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", outOfStock ? "bg-border" : "bg-brand-success")} />
          {outOfStock ? "Sem estoque" : `${product.stock} em estoque`}
        </span>

        <Button
          onClick={handleAdd}
          disabled={outOfStock}
          className="mt-auto"
          variant={added ? "secondary" : "default"}
        >
          {outOfStock ? (
            "Sem estoque"
          ) : added ? (
            <>
              <Check className="size-4" /> Adicionado
            </>
          ) : (
            <>
              <ShoppingCart className="size-4" /> Adicionar
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
