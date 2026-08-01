import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ProductImageOutput } from "../types/api";

export function useProductImages(productId: string) {
  return useQuery<ProductImageOutput[]>({
    queryKey: ["product-images", productId],
    queryFn: () => api.get<ProductImageOutput[]>(`/product/${productId}/images`),
    staleTime: 60_000,
    enabled: Boolean(productId),
  });
}

export function usePrimaryProductImage(productId: string): string | null {
  const { data } = useProductImages(productId);
  if (!data || data.length === 0) {
    return null;
  }
  return data[0].url;
}
