import {PlayerPosition} from '../models/player';

/** Orden en que se enseñan las demarcaciones; sin posición, al final. */
export const POSITION_ORDER: readonly PlayerPosition[] = ['goalkeeper', 'defender', 'midfielder', 'forward'];

export interface PositionGroup<T> {
  /** `null`: jugadores sin posición conocida. */
  position: PlayerPosition | null;
  players: T[];
}

/**
 * Reparte una plantilla por demarcaciones, en el orden de `POSITION_ORDER`, sin grupos
 * vacíos. Dentro de cada grupo respeta el orden recibido (la API ya ordena por dorsal).
 */
export function groupByPosition<T extends {position: PlayerPosition | null}>(players: readonly T[]): PositionGroup<T>[] {
  const groups: PositionGroup<T>[] = [...POSITION_ORDER, null].map((position) => ({position, players: []}));

  for (const player of players) {
    const index = player.position ? POSITION_ORDER.indexOf(player.position) : -1;
    groups[index >= 0 ? index : POSITION_ORDER.length].players.push(player);
  }

  return groups.filter((group) => group.players.length > 0);
}

/** Edad cumplida en `today` de quien nació en `birthDate` (`AAAA-MM-DD`); null si no se sabe. */
export function ageOn(birthDate: string | null | undefined, today: Date): number | null {
  const match = birthDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate) : null;
  if (!match) {
    return null;
  }

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const hadBirthday = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  const age = today.getFullYear() - year - (hadBirthday ? 0 : 1);

  return age >= 0 && age < 100 ? age : null;
}
