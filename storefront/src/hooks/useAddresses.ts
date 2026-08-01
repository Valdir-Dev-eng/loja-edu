import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { AddressInput, AddressOutput } from "../types/api";

export function useAddresses(enabled = true) {
  return useQuery<AddressOutput[]>({
    queryKey: ["addresses", "my"],
    queryFn: () => api.get<AddressOutput[]>("/addresses/my"),
    enabled,
  });
}

export function useAddressMutations() {
  const queryClient = useQueryClient();

  async function createAddress(input: AddressInput) {
    const created = await api.post<AddressOutput>("/addresses", input);
    await queryClient.invalidateQueries({ queryKey: ["addresses", "my"] });
    return created;
  }

  async function deleteAddress(addressId: string) {
    await api.delete(`/addresses/${addressId}`);
    await queryClient.invalidateQueries({ queryKey: ["addresses", "my"] });
  }

  return { createAddress, deleteAddress };
}
