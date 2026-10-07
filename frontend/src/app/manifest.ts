import type { MetadataRoute } from "next";
import { BRAND_COLOR, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/brand";

/** Permite "instalar" o site como app no celular, com nome, ícone e cores da marca. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "pt-BR",
    start_url: "/usages",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: BRAND_COLOR,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
