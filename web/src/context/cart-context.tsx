"use client";

import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CartItemOutput, ProductImageOutput } from "@/lib/api-types";

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
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => Promise<AddItemResult>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clear: () => void;
  /** Chamado uma unica vez pelo CartHydrator (dado ja resolvido no servidor,
   * dentro do SiteHeader) — nunca pelo proprio CartProvider sozinho, pra nao
   * reintroduzir uma checagem de sessao repetida no cliente. */
  hydrateFromServer: (serverItems: CartItemOutput[]) => Promise<void>;
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

async function fetchPrimaryImageUrl(productId: string): Promise<string | null> {
  try {
    const images = await apiClient.get<ProductImageOutput[]>(`/product/${productId}/images`);
    const primary = [...images].sort((a, b) => a.order - b.order)[0];
    return primary?.url ?? null;
  } catch {
    return null;
  }
}

async function toCartItems(outputs: CartItemOutput[], previous: CartItem[]): Promise<CartItem[]> {
  const imageByProductId = new Map(previous.map((item) => [item.productId, item.imageUrl]));
  return Promise.all(
    outputs.map(async (output) => ({
      productId: output.productId,
      name: output.productName,
      priceCents: output.priceCents,
      discountCents: output.discountCents,
      stock: output.stock,
      quantity: output.quantity,
      imageUrl: imageByProductId.get(output.productId) ?? (await fetchPrimaryImageUrl(output.productId)),
    }))
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"guest" | "logged-in">("guest");

  useEffect(() => {
    // Le localStorage so depois da hidratacao (nao no useState inicial) pra
    // nao divergir do HTML vazio renderizado no servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loadInitialCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || mode !== "guest") return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated, mode]);

  const hydrateFromServer = useCallback(async (serverItems: CartItemOutput[]) => {
    try {
      const localItems = loadInitialCart();
      const merged =
        localItems.length > 0
          ? await apiClient.post<CartItemOutput[]>("/cart/merge", {
              items: localItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
            })
          : serverItems;
      const withImages = await toCartItems(merged, localItems);
      setItems(withImages);
      window.localStorage.removeItem(CART_STORAGE_KEY);
      setMode("logged-in");
    } catch {
      // Falhou em sincronizar com o backend (rede) — fica no carrinho local
      // que ja estava carregado, sem travar a navegacao do usuario.
    }
  }, []);

  const addItem = useCallback(
    async (item: Omit<CartItem, "quantity">, quantity = 1): Promise<AddItemResult> => {
      if (mode === "logged-in") {
        const before = items.find((cartItem) => cartItem.productId === item.productId)?.quantity ?? 0;
        try {
          const output = await apiClient.post<CartItemOutput>("/cart/items", {
            productId: item.productId,
            quantity,
          });
          const addedQuantity = output.quantity - before;
          setItems((current) => {
            const exists = current.some((cartItem) => cartItem.productId === item.productId);
            if (exists) {
              return current.map((cartItem) =>
                cartItem.productId === item.productId
                  ? { ...cartItem, quantity: output.quantity, stock: output.stock }
                  : cartItem
              );
            }
            return [...current, { ...item, quantity: output.quantity }];
          });
          return { addedQuantity, cappedByStock: addedQuantity < quantity };
        } catch (error) {
          if (error instanceof ApiError) {
            return { addedQuantity: 0, cappedByStock: true };
          }
          throw error;
        }
      }

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
    },
    [mode, items]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (mode === "logged-in") {
        if (quantity <= 0) {
          await apiClient.delete(`/cart/items/${productId}`);
          setItems((current) => current.filter((item) => item.productId !== productId));
          return;
        }
        const output = await apiClient.put<CartItemOutput>(`/cart/items/${productId}`, { quantity });
        setItems((current) =>
          current.map((item) => (item.productId === productId ? { ...item, quantity: output.quantity } : item))
        );
        return;
      }

      setItems((current) =>
        current
          .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(quantity, 0) } : item))
          .filter((item) => item.quantity > 0)
      );
    },
    [mode]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      if (mode === "logged-in") {
        await apiClient.delete(`/cart/items/${productId}`);
      }
      setItems((current) => current.filter((item) => item.productId !== productId));
    },
    [mode]
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalCents = items.reduce(
      (sum, item) => sum + (item.priceCents - (item.discountCents ?? 0)) * item.quantity,
      0
    );
    return { items, itemCount, subtotalCents, addItem, updateQuantity, removeItem, clear, hydrateFromServer };
  }, [items, addItem, updateQuantity, removeItem, clear, hydrateFromServer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
