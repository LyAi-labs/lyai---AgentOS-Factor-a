export type DomainErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION';

const HTTP_STATUS: Readonly<Record<DomainErrorCode, number>> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 400,
};

/** Error esperado de negocio: se traduce a respuesta HTTP sin traza. */
export class DomainError extends Error {
  override name = 'DomainError';
  readonly httpStatus: number;

  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.httpStatus = HTTP_STATUS[code];
  }
}

export const notFound = (what: string) => new DomainError('NOT_FOUND', `${what} no existe`);
export const conflict = (message: string) => new DomainError('CONFLICT', message);
