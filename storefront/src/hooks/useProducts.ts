import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ProductOutput } from "../types/api";

export function useProducts() {
  return useQuery<ProductOutput[]>({
    queryKey: ["products"],
    queryFn: () => api.get<ProductOutput[]>("/product/"),
  });
}

export function useProduct(productId: string | undefined) {
  return useQuery<ProductOutput>({
    queryKey: ["product", productId],
    queryFn: () => api.get<ProductOutput>(`/product/${productId}`),
    enabled: Boolean(productId),
  });
}
