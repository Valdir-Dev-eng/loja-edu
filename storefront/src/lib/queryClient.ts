import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const PUBLIC_CATALOG_QUERY_KEY_ALLOWLIST = new Set(["products", "categories"]);

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "sorofarma:query-cache",
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 12,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const [firstKey] = query.queryKey;
      return typeof firstKey === "string" && PUBLIC_CATALOG_QUERY_KEY_ALLOWLIST.has(firstKey);
    },
  },
});
