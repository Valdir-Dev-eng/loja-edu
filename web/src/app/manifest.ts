import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sorofarma — Farmácia online",
    short_name: "Sorofarma",
    description: "Medicamentos, vitaminas e cuidados com entrega rápida em Sorocaba e região.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#c00612",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
