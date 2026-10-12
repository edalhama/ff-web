/** Texto de un campo opcional: recortado, o `null` si queda vacío (así lo guarda la API). */
export function textOrNull(value: string): string | null {
  const text = value.trim();
  return text === '' ? null : text;
}

/** Entero de un campo numérico opcional. Lo que no es un entero se manda tal cual y lo rechaza la API. */
export function integerOrNull(value: string): number | string | null {
  const text = value.trim();
  if (text === '') {
    return null;
  }
  return /^-?\d+$/.test(text) ? Number(text) : text;
}

/**
 * Lo que ha cambiado de `current` respecto a `original`, campo a campo. En una edición solo se
 * manda eso: la API bloquea frente a la sincronización justo los campos que recibe cambiados.
 */
export function changedFields<T extends object>(original: T, current: T): Partial<T> {
  const changes: Partial<T> = {};

  for (const key of Object.keys(current) as (keyof T)[]) {
    if (current[key] !== original[key]) {
      changes[key] = current[key];
    }
  }

  return changes;
}
