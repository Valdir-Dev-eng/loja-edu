import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserOutput } from "@/lib/api-types";

// Nesta versao do Next.js "middleware.ts" foi renomeado pra "proxy.ts"
// (ver node_modules/next/dist/docs/.../file-conventions/proxy.md).
//
// Por que isso existe: o access token (tokenUser) dura so 15min, mas o
// cookie que o guarda no navegador dura 1h (ver setSessionCookie no
// UserAuthRouter) — entao por ate 45min o cookie ainda esta la, porem
// o JWT dentro dele ja expirou. Sem renovar aqui, /auth/me falharia por
// ate 45min mesmo com um refresh token (refreshTokenUser, 2 dias) valido.
//
// O proxy roda antes da renderizacao: se o access token esta ausente ou
// expirado mas o refresh token ainda existe, tenta renovar aqui, ANTES do
// resto rodar — assim o request atual ja enxerga a sessao renovada.
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

async function resolveUser(token: string | undefined): Promise<UserOutput | null> {
    if (!token) return null;
    try {
        const response = await fetch(`${API_ORIGIN}/auth/me`, {
            headers: { cookie: `${SESSION_COOKIE}=${token}` },
        });
        if (!response.ok) return null;
        return (await response.json()) as UserOutput;
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    let accessToken = request.cookies.get(SESSION_COOKIE)?.value;
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    let refreshedSetCookie: string | null = null;

    if (refreshToken && isExpiredOrMissing(accessToken)) {
        try {
            const refreshResponse = await fetch(`${API_ORIGIN}/auth/refresh`, {
                method: "POST",
                headers: { cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}` },
            });
            const setCookieHeader = refreshResponse.headers.get("set-cookie");
            if (refreshResponse.ok && setCookieHeader) {
                accessToken = setCookieHeader.split(";")[0].split("=").slice(1).join("=");
                refreshedSetCookie = setCookieHeader;
            }
        } catch {
            // sem refresh token valido — segue como visitante, tratado abaixo.
        }
    }

    // Gate de /login e /onboarding: decidido AQUI, antes de qualquer render/
    // hidratacao — nao dentro dos Server Components dessas paginas. Fazer
    // isso via redirect() no componente rodava numa corrida real contra a
    // hidratacao do cliente sob Cache Components (o redirect chega como
    // marcador dentro do stream RSC, ja que o shell estatico sai com HTTP 200
    // antes da parte dinamica sequer rodar — o cliente as vezes nao estava
    // pronto pra processar esse marcador, causando recarregamento repetido).
    // Um redirect HTTP de verdade aqui nao depende de nenhum React montado.
    const pathname = request.nextUrl.pathname;
    if (pathname === "/login" || pathname === "/onboarding") {
        const user = await resolveUser(accessToken);

        if (pathname === "/login" && user) {
            const response = NextResponse.redirect(new URL(user.onboardingCompleted ? "/" : "/onboarding", request.url));
            if (refreshedSetCookie) response.headers.append("set-cookie", refreshedSetCookie);
            return response;
        }
        if (pathname === "/onboarding") {
            if (!user) {
                const response = NextResponse.redirect(new URL("/login", request.url));
                if (refreshedSetCookie) response.headers.append("set-cookie", refreshedSetCookie);
                return response;
            }
            if (user.onboardingCompleted) {
                const response = NextResponse.redirect(new URL("/", request.url));
                if (refreshedSetCookie) response.headers.append("set-cookie", refreshedSetCookie);
                return response;
            }
        }
    }

    if (!refreshedSetCookie) {
        return NextResponse.next();
    }

    // Reescreve o cookie do request que vai pro Server Component: sem isso,
    // so a PROXIMA navegacao veria a sessao renovada (o Set-Cookie de
    // resposta so afeta requests futuros do navegador).
    const forwardedCookie = (request.headers.get("cookie") ?? "")
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part && !part.startsWith(`${SESSION_COOKIE}=`))
        .concat(`${SESSION_COOKIE}=${accessToken}`)
        .join("; ");
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("cookie", forwardedCookie);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.append("set-cookie", refreshedSetCookie);
    return response;
}

export const config = {
    matcher: ["/((?!api|auth|webhooks|callback|_next/static|_next/image|favicon.ico).*)"],
};
