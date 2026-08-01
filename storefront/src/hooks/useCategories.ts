import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CategoryOutput } from "../types/api";

export function useCategories() {
  return useQuery<CategoryOutput[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<CategoryOutput[]>("/categories"),
  });
}
