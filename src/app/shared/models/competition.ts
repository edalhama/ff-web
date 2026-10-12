import {Country} from './country';
import {Season} from './season';

export type CompetitionType = 'league' | 'cup' | 'tournament';
export type TeamType = 'club' | 'national';
export type Gender = 'male' | 'female';

export const COMPETITION_TYPES: readonly CompetitionType[] = ['league', 'cup', 'tournament'];
export const TEAM_TYPES: readonly TeamType[] = ['club', 'national'];
export const GENDERS: readonly Gender[] = ['male', 'female'];

/** Icono (Lucide) con el que el panel distingue cada tipo de competición. */
export function competitionIcon(type: CompetitionType | null | undefined): string {
  switch (type) {
    case 'cup':
      return 'award';
    case 'tournament':
      return 'earth';
    default:
      return 'trophy';
  }
}

/** Textos de una competición en un idioma. */
export interface CompetitionTranslation {
  name: string;
  short_name: string | null;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  content: string | null;
}

/** Competición tal como la devuelve el panel (`/admin/competitions`). */
export interface Competition {
  id: number;
  /** Nombre en el idioma de la petición. */
  name: string | null;
  country_id: number | null;
  type: CompetitionType;
  team_type: TeamType;
  gender: Gender;
  tier: number | null;
  image: string | null;
  image_version: number;
  position: number;
  active: boolean;
  /** Campos que la sincronización ya no toca. */
  locked_fields: string[];
  /** Textos por idioma (`es`, `en`). */
  translations: Record<string, CompetitionTranslation>;
  country?: Country | null;
  current_season?: Season | null;
  seasons_count?: number;
  created_at: string | null;
  updated_at: string | null;
}

/** Cuerpo de alta o edición. En la edición solo va lo que cambia. */
export type CompetitionPayload = Partial<Pick<Competition, 'country_id' | 'type' | 'team_type' | 'gender' | 'tier' | 'position' | 'active'>> & {
  translations?: Record<string, Partial<CompetitionTranslation>>;
  unlock_fields?: string[];
};
