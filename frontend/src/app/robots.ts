import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

/** Só as páginas públicas (login e cadastro) podem aparecer em buscadores; a área logada e a API não. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/register"],
      disallow: ["/api/", "/usages", "/cars", "/drivers", "/profile", "/admin"],
    },
    host: SITE_URL,
  };
}
