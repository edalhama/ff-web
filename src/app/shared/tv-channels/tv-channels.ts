import {TvChannelSummary} from '../models/tv-channel';

/** Formatos de logo que admite la API (ff-api: `POST /admin/tv-channels/{id}/image`). */
export const TV_CHANNEL_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

/** Tamaño máximo del logo, en bytes (2 MB, como la API). */
export const TV_CHANNEL_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** «M+ LaLiga (54)»: el nombre y, si lo tiene, el dial. */
export function tvChannelLabel(channel: Pick<TvChannelSummary, 'name' | 'dial'>): string {
  return channel.dial ? `${channel.name} (${channel.dial})` : channel.name;
}

/** «M+ LaLiga (54) · DAZN LaLiga», en el orden del proveedor; null si no hay ninguno. */
export function tvChannelsLabel(channels: readonly Pick<TvChannelSummary, 'name' | 'dial'>[] | null | undefined): string | null {
  return channels && channels.length > 0 ? channels.map(tvChannelLabel).join(' · ') : null;
}

/**
 * Por qué no vale un fichero como logo, o null si vale: la clave i18n del motivo. La API lo
 * vuelve a comprobar (también por el contenido); esto solo evita subir algo que va a rechazar.
 */
export function tvChannelImageProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(TV_CHANNEL_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'tv-channel.image-invalid-type';
  }

  return file.size > TV_CHANNEL_IMAGE_MAX_BYTES ? 'tv-channel.image-too-big' : null;
}
