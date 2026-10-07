import { decodeJwt } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register"];

/**
 * Proteção das páginas (roda antes da renderização):
 * - sem sessão → /login
 * - com sessão em página pública → /usages
 * - /admin exige role ADMIN
 *
 * A role é apenas lida do access token (sem verificar a assinatura): serve para a navegação.
 * Quem garante a permissão de verdade é a API, que valida o token em toda requisição.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const hasSession = Boolean(accessToken || request.cookies.get("refresh_token")?.value);
  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (accessToken && isPublic) {
    return NextResponse.redirect(new URL("/usages", request.url));
  }

  if (pathname.startsWith("/admin") && accessToken && roleFrom(accessToken) !== "ADMIN") {
    return NextResponse.redirect(new URL("/usages", request.url));
  }

  return NextResponse.next();
}

function roleFrom(token: string) {
  try {
    return decodeJwt(token).role;
  } catch {
    return undefined;
  }
}

export const config = {
  // Ignora a API (proxy próprio), arquivos estáticos, imagens e os arquivos de metadados
  // (manifest, robots, ícones e imagem de compartilhamento), que precisam ser públicos.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|apple-icon|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
