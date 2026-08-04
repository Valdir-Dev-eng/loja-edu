import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nesta versao do Next.js "middleware.ts" foi renomeado pra "proxy.ts"
// (ver node_modules/next/dist/docs/.../file-conventions/proxy.md).
//
// Por que isso existe: o access token (tokenUser) dura so 15min, mas o
// cookie que o guarda no navegador dura 1h (ver setSessionCookie no
// UserAuthRouter) — entao por ate 45min o cookie ainda esta la, porem
// o JWT dentro dele ja expirou. getSessionUser() (Server Component, usado
// pelo botao de perfil, pelo guard de /login e pelo guard de /onboarding)
// nao tenta renovar nada, so falha e trata como deslogado nesse intervalo,
// mesmo com um refresh token (refreshTokenUser, 2 dias) ainda valido.
// O apiClient do lado do cliente ja resolve isso sozinho (retry em 401),
// mas paginas renderizadas no servidor nao passam por ali.
//
// O proxy roda antes da renderizacao: se o access token esta ausente ou
// expirado mas o refresh token ainda existe, tenta renovar aqui, ANTES do
// Server Component ler o cookie — assim o request atual ja enxerga a sessao
// renovada (nao so o proximo).
const SESSION_COOKIE = "tokenUser";
const REFRESH_TOKEN_COOKIE = "refreshTokenUser";
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:9090";

function isExpiredOrMissing(accessToken: string | undefined): boolean {
    if (!accessToken) return true;
    const payloadSegment = accessToken.split(".")[1];
    if (!payloadSegment) return true;
    try {
        const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8")) as { exp?: number };
        if (typeof payload.exp !== "number") return true;
        return payload.exp * 1000 <= Date.now();
    } catch {
        return true;
    }
}

export async function proxy(request: NextRequest) {
    const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!refreshToken || !isExpiredOrMissing(accessToken)) {
        return NextResponse.next();
    }

    try {
        const refreshResponse = await fetch(`${API_ORIGIN}/auth/refresh`, {
            method: "POST",
            headers: { cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}` },
        });
        const setCookieHeader = refreshResponse.headers.get("set-cookie");
        if (!refreshResponse.ok || !setCookieHeader) {
            return NextResponse.next();
        }
        const newAccessToken = setCookieHeader.split(";")[0].split("=").slice(1).join("=");

        // Reescreve o cookie do request que vai pro Server Component: sem
        // isso, so a PROXIMA navegacao veria a sessao renovada (o Set-Cookie
        // de resposta so afeta requests futuros do navegador).
        const forwardedCookie = (request.headers.get("cookie") ?? "")
            .split(";")
            .map((part) => part.trim())
            .filter((part) => part && !part.startsWith(`${SESSION_COOKIE}=`))
            .concat(`${SESSION_COOKIE}=${newAccessToken}`)
            .join("; ");
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("cookie", forwardedCookie);

        const response = NextResponse.next({ request: { headers: requestHeaders } });
        // Repassa o Set-Cookie tal como o Express mandou (httpOnly, secure,
        // sameSite, maxAge) — sem duplicar essas regras aqui.
        response.headers.append("set-cookie", setCookieHeader);
        return response;
    } catch {
        return NextResponse.next();
    }
}

export const config = {
    matcher: ["/((?!api|auth|webhooks|callback|_next/static|_next/image|favicon.ico).*)"],
};
