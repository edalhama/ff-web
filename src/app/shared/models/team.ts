import {CompetitionTranslation, Gender, TeamType} from './competition';
import {Country} from './country';

/** Lo justo para nombrar a un equipo dentro de un partido o de una clasificación. */
export interface TeamSummary {
  id: number;
  /** Nombre en el idioma de la petición. */
  name: string | null;
  short_name: string | null;
  /** Abreviatura: `RMA`. */
  code: string | null;
}

export interface VenueSummary {
  id: number;
  name: string;
  city: string | null;
  capacity: number | null;
}

/** Con qué id conoce un proveedor a una entidad. */
export interface ProviderLink {
  code: string;
  name: string;
  external_id: string;
}

/** Textos de un equipo en un idioma: los mismos campos que los de una competición. */
export type TeamTranslation = CompetitionTranslation;

/** Equipo tal como lo devuelve el panel (`/admin/teams`). */
export interface Team extends TeamSummary {
  type: TeamType;
  gender: Gender;
  country_id: number | null;
  venue_id: number | null;
  founded_year: number | null;
  /** Color principal: `#ffffff`. */
  primary_color: string | null;
  image: string | null;
  image_version: number;
  active: boolean;
  /** Campos que la sincronización ya no toca. */
  locked_fields: string[];
  translations: Record<string, TeamTranslation>;
  country?: Country | null;
  venue?: VenueSummary | null;
  /** Solo en la ficha. */
  providers?: ProviderLink[];
  created_at: string | null;
  updated_at: string | null;
}

/** Cuerpo de una edición: solo lo que cambia. */
export type TeamPayload = Partial<Pick<Team, 'type' | 'gender' | 'country_id' | 'code' | 'founded_year' | 'primary_color' | 'active'>> & {
  translations?: Record<string, Partial<TeamTranslation>>;
  unlock_fields?: string[];
};
