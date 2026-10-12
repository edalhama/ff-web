import {apiErrorBody, apiErrorStatus} from '@edas/ng';

/**
 * Errores de validación de una respuesta 400 de ff-api, por campo (`translations.es.slug`).
 *
 * La API manda en `message` solo el primero (que el interceptor ya enseña como aviso) y en
 * `data.error` todos, como JSON: de ahí salen los textos que se pintan bajo cada campo.
 */
export function validationErrors(error: unknown): Record<string, string> {
  if (apiErrorStatus(error) !== 400) {
    return {};
  }

  const raw = (apiErrorBody(error) as {data?: {error?: unknown}} | null)?.data?.error;
  if (typeof raw !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, messages]) => Array.isArray(messages) && messages.length > 0)
        .map(([field, messages]) => [field, messages[0]]),
    );
  } catch {
    return {};
  }
}
