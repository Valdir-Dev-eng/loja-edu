"use client";

import { useCart } from "@/hooks/use-cart";

export function CartBadge() {
  const { itemCount } = useCart();

  if (itemCount === 0) {
    return null;
  }

  return (
    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-brand-red text-[11px] font-bold text-white">
      {itemCount > 99 ? "99+" : itemCount}
    </span>
  );
}
