import { QueryClient } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx response means the request itself is wrong (not found, forbidden, invalid) —
      // retrying it will never succeed, it only delays the user from seeing the real result.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const PUBLIC_CATALOG_QUERY_KEY_ALLOWLIST = new Set(["products", "product", "categories", "product-images"]);

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "sorofarma:query-cache",
});

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister,
  maxAge: 1000 * 60 * 60 * 12,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const [firstKey] = query.queryKey;
      return typeof firstKey === "string" && PUBLIC_CATALOG_QUERY_KEY_ALLOWLIST.has(firstKey);
    },
  },
};
