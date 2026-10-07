/**
 * Erro de domínio/aplicação com status HTTP associado.
 * Lançado pelos services e convertido em resposta pelo errorHandler.
 * `code` é um identificador estável que o frontend pode usar para decidir o fluxo
 * (ex.: TOKEN_EXPIRED faz o front renovar a sessão).
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado', code = 'UNAUTHORIZED') {
    super(message, 401, undefined, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para esta ação', code = 'FORBIDDEN', details?: unknown) {
    super(message, 403, details, code);
  }
}
