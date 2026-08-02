"use client";

import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  discountCents: number | null;
  stock: number;
  imageUrl: string | null;
  quantity: number;
}

export interface AddItemResult {
  /** quantas unidades realmente foram adicionadas, depois de limitar pelo estoque */
  addedQuantity: number;
  /** true quando o pedido teve que ser reduzido porque o carrinho ja estava no limite do estoque */
  cappedByStock: boolean;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => AddItemResult;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const CART_STORAGE_KEY = "sorofarma:cart";

export const CartContext = createContext<CartContextValue | null>(null);

function loadInitialCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadInitialCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1): AddItemResult => {
    const result: AddItemResult = { addedQuantity: 0, cappedByStock: false };
    setItems((current) => {
      const existing = current.find((cartItem) => cartItem.productId === item.productId);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, existing.stock);
        result.addedQuantity = nextQuantity - existing.quantity;
        result.cappedByStock = result.addedQuantity < quantity;
        return current.map((cartItem) =>
          cartItem.productId === item.productId ? { ...cartItem, quantity: nextQuantity } : cartItem
        );
      }
      const initialQuantity = Math.min(quantity, item.stock);
      result.addedQuantity = initialQuantity;
      result.cappedByStock = initialQuantity < quantity;
      return [...current, { ...item, quantity: initialQuantity }];
    });
    return result;
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(quantity, 0) } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalCents = items.reduce(
      (sum, item) => sum + (item.priceCents - (item.discountCents ?? 0)) * item.quantity,
      0
    );
    return { items, itemCount, subtotalCents, addItem, updateQuantity, removeItem, clear };
  }, [items, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
