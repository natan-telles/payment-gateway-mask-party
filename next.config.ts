import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // @react-pdf/renderer roda no Node puro (gera o PDF do ingresso); não deve ser empacotado pelo bundler
  serverExternalPackages: ["@react-pdf/renderer"],
  // Permite abrir o dev server por túnel ngrok (teste local de webhooks de pagamento)
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
