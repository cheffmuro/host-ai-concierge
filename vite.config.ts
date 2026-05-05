import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        manifest: {
          name: "Anfitrião",
          short_name: "Anfitrião",
          description: "Painel omnichannel de atendimento de luxo",
          display: "standalone",
          background_color: "#f8fafc",
          theme_color: "#0f172a",
          start_url: "/dashboard",
          icons: [
            { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
            { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api/],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "html", networkTimeoutSeconds: 3 },
            },
          ],
        },
      }),
    ],
  },
});
