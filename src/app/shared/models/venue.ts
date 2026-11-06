import {Country} from './country';
import {ProviderLink, TeamSummary, VenueSummary} from './team';

/** Superficies que distinguen los proveedores. */
export const VENUE_SURFACES = ['natural', 'artificial', 'hybrid'] as const;
export type VenueSurface = (typeof VENUE_SURFACES)[number];

/** Estadio tal como lo devuelve el panel (`/admin/venues`). */
export interface Venue extends VenueSummary {
  country_id: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Campos que la sincronización ya no toca. */
  locked_fields: string[];
  country?: Country | null;
  /** Equipos que juegan en él. */
  teams?: TeamSummary[];
  /** Partidos que se han jugado o se jugarán en él. */
  matches_count?: number;
  /** Solo en la ficha. */
  providers?: ProviderLink[];
  created_at: string | null;
  updated_at: string | null;
}

/** Cuerpo de una edición: solo lo que cambia. */
export type VenuePayload = Partial<
  Pick<Venue, 'name' | 'city' | 'country_id' | 'address' | 'capacity' | 'opened_year' | 'surface' | 'pitch_length' | 'pitch_width' | 'latitude' | 'longitude'>
> & {
  unlock_fields?: string[];
};
