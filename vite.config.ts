// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  // Passthrough para o Vite (sancionado pelo comentário acima). Expõe o dev
  // server na rede local e libera acesso por IP/host do celular — sem isso o
  // Vite pode recusar requisições de hosts diferentes de localhost.
  vite: {
    server: {
      host: true,          // escuta em 0.0.0.0 (acessível pela rede Wi-Fi)
      allowedHosts: true,  // aceita qualquer host (ex.: 192.168.x.x do celular)
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
