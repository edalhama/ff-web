/** Sobre común de las respuestas de ff-api (BaseController). */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  /** Campos que fallan en un error de validación (400). */
  field?: string[];
}
