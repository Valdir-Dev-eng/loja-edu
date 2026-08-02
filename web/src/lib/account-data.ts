import "server-only";

import { cookies } from "next/headers";
import type { AddressOutput, OrderOutput } from "./api-types";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:9090";
const SESSION_COOKIE = "tokenUser";

async function authedFetch<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getMyOrders(): Promise<OrderOutput[]> {
  return authedFetch<OrderOutput[]>("/order/my");
}

export function getMyAddresses(): Promise<AddressOutput[]> {
  return authedFetch<AddressOutput[]>("/addresses/my");
}
