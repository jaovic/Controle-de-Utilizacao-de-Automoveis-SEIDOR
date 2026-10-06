import type { NextRequest } from "next/server";

/**
 * Proxy same-origin para a API Express.
 *
 * O navegador fala apenas com o domínio do front (/api/...), e este handler repassa a chamada
 * para BACKEND_URL. Assim os cookies httpOnly de sessão definidos pela API ficam no domínio do
 * front, tanto em localhost (Docker) quanto na Vercel, sem CORS e sem cookies de terceiros.
 * BACKEND_URL é lida em tempo de execução, então a mesma build funciona em qualquer ambiente.
 */
const FORWARDED_REQUEST_HEADERS = ["accept", "authorization", "content-type", "cookie", "user-agent"];
// Cabeçalhos que não podem ser repassados como vieram (o fetch já descompactou o corpo).
const SKIPPED_RESPONSE_HEADERS = ["connection", "content-encoding", "content-length", "transfer-encoding", "set-cookie"];

async function proxyToBackend(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3333";
  const { path } = await context.params;
  const target = new URL(`/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, backendUrl);

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Mantém o IP real do usuário para o rate limit da API.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: { message: "Não foi possível conectar à API. Tente novamente em instantes.", code: "BACKEND_UNAVAILABLE" } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  response.headers.forEach((value, name) => {
    if (!SKIPPED_RESPONSE_HEADERS.includes(name)) responseHeaders.set(name, value);
  });
  for (const cookie of response.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);

  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

export { proxyToBackend as GET, proxyToBackend as POST, proxyToBackend as PUT, proxyToBackend as PATCH, proxyToBackend as DELETE };
