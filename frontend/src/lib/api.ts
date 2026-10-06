/**
 * Cliente HTTP do front. Todas as chamadas vão para /api (proxy same-origin), com os cookies
 * de sessão enviados automaticamente. Se o access token expirar (401), tenta renovar a sessão
 * uma única vez com o refresh token e repete a chamada.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Rotas em que um 401 é resposta de negócio (credenciais/código), não sessão expirada.
const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/login/verify",
  "/auth/register",
  "/auth/verify-phone",
  "/auth/resend-code",
  "/auth/refresh",
  "/auth/logout",
];

let refreshInFlight: Promise<boolean> | null = null;

/** Renova a sessão; requisições simultâneas compartilham a mesma tentativa. */
function refreshSession() {
  refreshInFlight ??= fetch("/api/auth/refresh", { method: "POST" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function api<T>(path: string, { method = "GET", body }: RequestOptions = {}, canRetry = true): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && canRetry && !NO_REFRESH_PATHS.includes(path)) {
    if (await refreshSession()) return api<T>(path, { method, body }, false);

    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // Navegação completa de propósito: fora de um componente, e descarta todo o estado em memória.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${next}`);
    throw new ApiError("Sua sessão expirou. Faça login novamente.", 401, "SESSION_EXPIRED");
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data?.error ?? {};
    throw new ApiError(error.message ?? "Erro inesperado. Tente novamente.", response.status, error.code, error.details);
  }

  return data as T;
}

/** Junta a mensagem principal com os erros de validação por campo (400), se houver. */
export function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Erro inesperado. Tente novamente.";

  const body = error.details?.body as Record<string, string[]> | undefined;
  const fieldErrors = body ? Object.values(body).flat() : [];
  return fieldErrors.length > 0 ? `${error.message}: ${fieldErrors.join("; ")}` : error.message;
}
