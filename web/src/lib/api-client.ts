"use client";

// Cliente de API pro lado do navegador — chamadas passam por /api/* (proxy do
// next.config.ts pro Express), assim o cookie de sessao fica "primeiro-partido"
// sem precisar de CORS no backend. Server Components usam lib/data.ts em vez
// disso (fetch direto em API_ORIGIN, sem passar pelo proxy).

import type { ApiErrorBody } from "./api-types";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error);
    this.status = status;
    this.body = body;
  }
}

// O access token (tokenUser) dura só 15min; o refresh token (refreshTokenUser,
// httpOnly) dura 2 dias. Como o front nunca enxerga o valor de nenhum cookie
// httpOnly, a única forma de saber se a sessão ainda existe é tentar — por
// isso, todo 401 aciona uma tentativa de /auth/refresh antes de desistir.
// Concorrente: várias chamadas 401 ao mesmo tempo compartilham a mesma
// tentativa de refresh em vez de disparar uma por request.
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request<T>(path: string, init?: RequestInit, allowRefreshRetry = true): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (response.status === 401 && allowRefreshRetry && path !== "/auth/refresh") {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({ error: "Resposta inválida do servidor." }));

  if (!response.ok) {
    throw new ApiError(response.status, body as ApiErrorBody);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
