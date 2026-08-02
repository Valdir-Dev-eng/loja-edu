// Camada de dados pro lado do servidor — Server Components buscam direto em
// API_ORIGIN (sem passar pelo proxy /api/*, que so existe pro navegador).
// "use cache" + cacheLife fazem essas funcoes virarem parte do shell estatico
// (Cache Components/PPR) em vez de bloquear a renderizacao a cada request.

import { cacheLife, cacheTag } from "next/cache";
import type { CategoryOutput, ProductImageOutput, ProductOutput } from "./api-types";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:9090";

export async function getProducts(): Promise<ProductOutput[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const res = await fetch(`${API_ORIGIN}/product/`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar produtos: ${res.status}`);
  }
  return res.json();
}

export async function getProduct(id: string): Promise<ProductOutput | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");

  const res = await fetch(`${API_ORIGIN}/product/${id}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Falha ao buscar produto ${id}: ${res.status}`);
  }
  return res.json();
}

export async function getCategories(): Promise<CategoryOutput[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("categories");

  const res = await fetch(`${API_ORIGIN}/categories`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar categorias: ${res.status}`);
  }
  return res.json();
}

export async function getProductImages(productId: string): Promise<ProductImageOutput[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("product-images");

  const res = await fetch(`${API_ORIGIN}/product/${productId}/images`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar imagens do produto ${productId}: ${res.status}`);
  }
  return res.json();
}

export async function getPrimaryProductImageUrl(productId: string): Promise<string | null> {
  const images = await getProductImages(productId);
  const ordered = [...images].sort((a, b) => a.order - b.order);
  return ordered[0]?.url ?? null;
}
