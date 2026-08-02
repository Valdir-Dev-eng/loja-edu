import path from "node:path";
import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:9090";

const nextConfig: NextConfig = {
  // Ha um package-lock.json na raiz do monorepo tambem (backend Express) —
  // sem isso o Next tenta adivinhar a raiz errada.
  turbopack: {
    root: path.resolve(__dirname),
  },

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
    ];
  },
};

export default nextConfig;
