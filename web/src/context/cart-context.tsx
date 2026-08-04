"use client";

import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CartItemOutput } from "@/lib/api-types";

export interface CartItem {
  productId: string;
  name: string;
  priceCents: number;
  discountCents: number | null;
  stock: number;
  quantity: number;
}

export interface AddItemResult {
  /** quantas unidades realmente foram adicionadas, depois de limitar pelo estoque */
  addedQuantity: number;
  /** true quando o pedido teve que ser reduzido porque o carrinho já estava no limite do estoque */
  cappedByStock: boolean;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  isLoading: boolean;
  addItem: (productId: string, quantity?: number) => Promise<AddItemResult>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  /** Só reflete localmente — o backend já esvazia o carrinho no servidor
   * assim que o pedido é criado (CheckoutOrder), não precisa chamar API aqui. */
  clear: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

// O carrinho e' sempre resolvido no servidor por um cookie httpOnly proprio
// (cartId — nada a ver com sessao de login). O front nunca guarda o
// conteudo do carrinho fora da memoria do React: sem localStorage, sem
// merge de array nao confiavel. Uma unica busca ao montar (dado real que
// precisamos, nao um "estou logado?" disfarcado) e cada mutacao vai direto
// pra API — o cookie viaja sozinho em toda chamada (credentials: include).
function toCartItem(output: CartItemOutput): CartItem {
  return {
    productId: output.productId,
    name: output.productName,
    priceCents: output.priceCents,
    discountCents: output.discountCents,
    stock: output.stock,
    quantity: output.quantity,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<CartItemOutput[]>("/cart")
      .then((output) => setItems(output.map(toCartItem)))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, []);

  const addItem = useCallback(async (productId: string, quantity = 1): Promise<AddItemResult> => {
    const before = items.find((item) => item.productId === productId)?.quantity ?? 0;
    try {
      const output = await apiClient.post<CartItemOutput>("/cart/items", { productId, quantity });
      const addedQuantity = output.quantity - before;
      setItems((current) => {
        const exists = current.some((item) => item.productId === productId);
        const updated = toCartItem(output);
        return exists ? current.map((item) => (item.productId === productId ? updated : item)) : [...current, updated];
      });
      return { addedQuantity, cappedByStock: addedQuantity < quantity };
    } catch (error) {
      if (error instanceof ApiError) {
        return { addedQuantity: 0, cappedByStock: true };
      }
      throw error;
    }
  }, [items]);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await apiClient.delete(`/cart/items/${productId}`);
      setItems((current) => current.filter((item) => item.productId !== productId));
      return;
    }
    const output = await apiClient.put<CartItemOutput>(`/cart/items/${productId}`, { quantity });
    setItems((current) => current.map((item) => (item.productId === productId ? toCartItem(output) : item)));
  }, []);

  const removeItem = useCallback(async (productId: string) => {
    await apiClient.delete(`/cart/items/${productId}`);
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalCents = items.reduce(
      (sum, item) => sum + (item.priceCents - (item.discountCents ?? 0)) * item.quantity,
      0
    );
    return { items, itemCount, subtotalCents, isLoading, addItem, updateQuantity, removeItem, clear };
  }, [items, isLoading, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
