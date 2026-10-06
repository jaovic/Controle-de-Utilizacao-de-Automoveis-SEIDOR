import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um servidor Node autocontido em .next/standalone (usado pela imagem Docker).
  output: "standalone",
  cacheComponents: true,
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
