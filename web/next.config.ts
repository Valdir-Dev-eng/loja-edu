import path from "node:path";
import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:9090";

const nextConfig: NextConfig = {
  // Ha um package-lock.json na raiz do monorepo tambem (backend Express) —
  // sem isso o Next tenta adivinhar a raiz errada.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Permite que o tunel ngrok usado pra testar o login com Google em dev
  // acesse o servidor de desenvolvimento (o Next bloqueia origem externa por
  // padrao). Atualizar aqui sempre que a URL do tunel mudar.
  allowedDevOrigins: ["devoted-robin-striking.ngrok-free.app"],

  // Partial Prerendering (static shell + streaming dynamic parts) — o motor
  // que faz a pagina chegar pronta no HTML sem esperar a rede no cliente.
  cacheComponents: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.sirv.com",
      },
    ],
    // Fotos de produto raramente mudam depois de publicadas — cache
    // longo reduz re-otimizacao e faz visitas repetidas nao rebaixarem
    // as mesmas imagens.
    minimumCacheTTL: 2678400, // 31 dias
  },

  async rewrites() {
    return [
      {
        // Chamadas feitas do navegador (fetch client-side) passam por aqui
        // pra ficar "mesma origem" e o cookie de sessao (tokenUser) circular
        // sem precisar de CORS no Express. Server Components buscam direto
        // em API_ORIGIN, sem passar por esse proxy.
        source: "/api/:path*",
        destination: `${API_ORIGIN}/:path*`,
      },
      {
        // O fluxo de login com Google (incluindo o callback, que o proprio
        // Google navega o navegador ate) precisa ficar na mesma origem do
        // Next pra o redirect final (res.redirect relativo, feito pelo
        // Express) cair de volta aqui, nao no processo antigo do storefront.
        source: "/auth/:path*",
        destination: `${API_ORIGIN}/auth/:path*`,
      },
      {
        // Webhook do Mercado Pago: o proprio Mercado Pago faz o POST direto
        // nessa URL publica (sem passar pelo navegador). Se o tunel (ngrok)
        // apontar pro Next em vez do Express, precisa desse rewrite pra nao
        // cair em 404 do Next e a confirmacao de pagamento nunca chegar.
        source: "/webhooks/:path*",
        destination: `${API_ORIGIN}/webhooks/:path*`,
      },
      {
        // Callback do Melhor Envio (OAuth do frete) — mesmo motivo do
        // /auth/*: precisa ficar na mesma origem de quem iniciou o fluxo
        // pro cookie de estado (melhorEnvioOauthState) sobreviver.
        source: "/callback/:path*",
        destination: `${API_ORIGIN}/callback/:path*`,
      },
    ];
  },
};

export default nextConfig;
