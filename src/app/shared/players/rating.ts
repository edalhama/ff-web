import {PlayerRating} from '../models/player';

/** Las seis medias de la carta, en el orden del juego. */
export const CARD_STATS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;

export type CardStat = (typeof CARD_STATS)[number];

/** Color de la carta en el juego: oro (75+), plata (65-74) y bronce. */
export function ratingTier(overall: number): 'gold' | 'silver' | 'bronze' {
  return overall >= 75 ? 'gold' : overall >= 65 ? 'silver' : 'bronze';
}

/**
 * Clave i18n de una media de la carta. En los porteros el juego da en las mismas claves
 * estirada, paradas, saque, reflejos, velocidad y colocación.
 */
export function cardStatKey(stat: CardStat, rating: Pick<PlayerRating, 'position'>): string {
  return `player.card-stat.${rating.position === 'GK' ? 'gk-' : ''}${stat}`;
}

/** Grupo de atributos detallados del juego: los de una media de la carta, o los de portero. */
export interface StatGroup {
  /** Media de la carta a la que pertenecen; `goalkeeping` para los de portero. */
  key: CardStat | 'goalkeeping' | 'other';
  stats: string[];
}

/** Atributos detallados por grupo, en el orden en que los enseña el juego. */
export const STAT_GROUPS: readonly StatGroup[] = [
  {key: 'pace', stats: ['acceleration', 'sprintSpeed']},
  {key: 'shooting', stats: ['positioning', 'finishing', 'shotPower', 'longShots', 'volleys', 'penalties']},
  {key: 'passing', stats: ['vision', 'crossing', 'freeKickAccuracy', 'shortPassing', 'longPassing', 'curve']},
  {key: 'dribbling', stats: ['agility', 'balance', 'reactions', 'ballControl', 'dribbling', 'composure']},
  {key: 'defending', stats: ['interceptions', 'headingAccuracy', 'defensiveAwareness', 'standingTackle', 'slidingTackle']},
  {key: 'physical', stats: ['jumping', 'stamina', 'strength', 'aggression']},
  {key: 'goalkeeping', stats: ['gkDiving', 'gkHandling', 'gkKicking', 'gkPositioning', 'gkReflexes']},
];

/**
 * Los atributos de una valoración repartidos en sus grupos, sin grupos vacíos. Uno que el
 * juego añada y aquí no se conozca va a «otros», con su clave tal cual.
 */
export function groupStats(stats: Record<string, number>): Array<{key: StatGroup['key']; stats: Array<{key: string; value: number; known: boolean}>}> {
  const known = new Set(STAT_GROUPS.flatMap((group) => group.stats));
  const groups = [
    ...STAT_GROUPS.map((group) => ({
      key: group.key,
      stats: group.stats.filter((stat) => stats[stat] != null).map((stat) => ({key: stat, value: stats[stat], known: true})),
    })),
    {
      key: 'other' as const,
      stats: Object.keys(stats)
        .filter((stat) => !known.has(stat))
        .map((stat) => ({key: stat, value: stats[stat], known: false})),
    },
  ];

  return groups.filter((group) => group.stats.length > 0);
}

/** «★★★★☆»: filigranas o pierna mala, de 1 a 5. */
export function stars(value: number | null): string | null {
  return value ? '★'.repeat(value) + '☆'.repeat(Math.max(0, 5 - value)) : null;
}
