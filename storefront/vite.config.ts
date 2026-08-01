import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function readAllowedHosts(): string[] {
  const raw = process.env.OAUTH_ALLOWED_HOSTS;
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim().replace(/:\d+$/, ""))
    .filter((hostname) => hostname.length > 0);
}

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: readAllowedHosts(),
  },
  build: {
    outDir: "dist",
  },
});
