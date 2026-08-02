export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function discountPercentage(priceCents: number, discountCents: number | null): number {
  if (!discountCents || priceCents <= 0) {
    return 0;
  }
  return Math.round((discountCents / priceCents) * 100);
}

export function finalPriceCents(priceCents: number, discountCents: number | null): number {
  if (!discountCents) {
    return priceCents;
  }
  return Math.max(priceCents - discountCents, 0);
}
