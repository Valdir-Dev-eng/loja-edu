import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ProductOutput } from "../types/api";

export function useProducts() {
  return useQuery<ProductOutput[]>({
    queryKey: ["products"],
    queryFn: () => api.get<ProductOutput[]>("/product/"),
  });
}

export function useProduct(productId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery<ProductOutput>({
    queryKey: ["product", productId],
    queryFn: () => api.get<ProductOutput>(`/product/${productId}`),
    enabled: Boolean(productId),
    initialData: () =>
      queryClient.getQueryData<ProductOutput[]>(["products"])?.find((product) => product.id === productId),
    initialDataUpdatedAt: () => queryClient.getQueryState(["products"])?.dataUpdatedAt,
  });
}
