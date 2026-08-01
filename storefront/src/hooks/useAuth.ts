import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import type { UserOutput } from "../types/api";

export function useAuth() {
  const queryClient = useQueryClient();

  const query = useQuery<UserOutput | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api.get<UserOutput>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  async function logout() {
    await api.post("/auth/logout");
    queryClient.setQueryData(["auth", "me"], null);
  }

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    logout,
  };
}
