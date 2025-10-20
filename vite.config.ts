// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig(async ({ mode }) => {
  const plugins = [react()];

  // importa só no dev e ignora se o pacote não existir
  if (mode === "development") {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger());
    } catch { /* ignore */ }
  }

  return {
    base: "/",
    server: {
      host: "::",
      port: 5000,
      proxy: mode === "development" ? {
        "/.netlify/functions": {
          target: "http://localhost:8888",
          changeOrigin: true,
          configure(proxy) {
            proxy.on("error", (_e, _req, res) => {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                ok: false,
                error: "dev_functions_unavailable",
                message: "Execute: npm run dev:netlify",
              }));
            });
          },
        },
      } : undefined,
    },
    plugins,
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    build: { outDir: "dist", sourcemap: true },
  };
});
