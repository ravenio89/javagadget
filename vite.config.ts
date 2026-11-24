// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Load server-side .env variables (WP_SITE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET)
// into process.env during local dev/preview without exposing them to the client bundle.
const fileEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
for (const [k, v] of Object.entries(fileEnv)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

export default defineConfig({
  nitro: {
    preset: process.env["NITRO_PRESET"] ?? "node-server",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Pre-bundle so Vite doesn't re-optimize mid-session (which loads a second React copy).
    optimizeDeps: { include: ["@radix-ui/react-dialog", "lucide-react"] },
  },
});
