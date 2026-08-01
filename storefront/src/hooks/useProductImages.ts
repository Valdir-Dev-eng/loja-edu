import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ProductImageOutput, ProductOutput } from "../types/api";

function productImagesQuery(productId: string) {
  return {
    queryKey: ["product-images", productId],
    queryFn: () => api.get<ProductImageOutput[]>(`/product/${productId}/images`),
    staleTime: 60_000,
  };
}

export function useProductImages(productId: string) {
  return useQuery<ProductImageOutput[]>({ ...productImagesQuery(productId), enabled: Boolean(productId) });
}

export function usePrimaryProductImage(productId: string): string | null {
  const { data } = useProductImages(productId);
  if (!data || data.length === 0) {
    return null;
  }
  return data[0].url;
}

export function useProductsWithImages(products: ProductOutput[]): ProductOutput[] {
  const results = useQueries({ queries: products.map((product) => productImagesQuery(product.id)) });
  return products.filter((_, index) => (results[index].data?.length ?? 0) > 0);
}
