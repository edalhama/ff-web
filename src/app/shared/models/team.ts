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
  /** Escudo en nuestro almacenamiento, según las fuentes preferidas de la competición desde la que se mira. Lo dan la parte pública y los partidos del panel (`/admin/matches`). */
  crest?: string | null;
}

export interface VenueSummary {
  id: number;
  name: string;
  city: string | null;
  capacity: number | null;
  opened_year: number | null;
  /** `natural`, `artificial`, `hybrid`. */
  surface: string | null;
  /** Metros. */
  pitch_length: number | null;
  pitch_width: number | null;
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
  secondary_color: string | null;
  city: string | null;
  website: string | null;
  /** Cuenta oficial, sin `@`. */
  twitter: string | null;
  image: string | null;
  image_version: number;
  active: boolean;
  /** Campos que la sincronización ya no toca. */
  locked_fields: string[];
  translations: Record<string, TeamTranslation>;
  country?: Country | null;
  venue?: VenueSummary | null;
  /** Competiciones en las que participa en su temporada actual. */
  competitions?: Array<{id: number; name: string | null}>;
  /** Solo en la ficha. */
  providers?: ProviderLink[];
  created_at: string | null;
  updated_at: string | null;
}

/** Cuerpo de una edición: solo lo que cambia. */
export type TeamPayload = Partial<Pick<Team, 'type' | 'gender' | 'country_id' | 'code' | 'founded_year' | 'primary_color' | 'secondary_color' | 'city' | 'website' | 'twitter' | 'active'>> & {
  translations?: Record<string, Partial<TeamTranslation>>;
  unlock_fields?: string[];
};
