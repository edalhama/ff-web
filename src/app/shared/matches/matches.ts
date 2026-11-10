import {formatZoned, SHORT_DAY_FORMAT} from '../dates/zoned-dates';
import {LineupRole, MatchEvent, MatchEventType, MatchPeriod, MatchStatus} from '../models/match';

/** Listado de partidos del panel. */
export const MATCHES_PATH = '/admin/matches';

/**
 * Filtros con los que se abre el listado de partidos desde fuera (`?competition_id=1&round_id=9`),
 * los mismos nombres que sus filtros. Una temporada null es «la vigente»: no se manda.
 */
export function matchesQueryParams(competitionId: number, seasonId: number | null, roundId: number | null): Record<string, number> {
  return Object.fromEntries(
    Object.entries({competition_id: competitionId, season_id: seasonId, round_id: roundId}).filter(([, value]) => value !== null),
  ) as Record<string, number>;
}

/** Estados que se avisan con un distintivo. Los programados y los terminados no: se ven por la hora o el resultado. */
export const MATCH_STATUS_TONE: Partial<Record<MatchStatus, 'success' | 'warning' | 'danger'>> = {
  playing: 'success',
  postponed: 'warning',
  suspended: 'warning',
  cancelled: 'danger',
};

/** Icono (Lucide) y color de cada tipo de evento en la cronología. */
export const MATCH_EVENT_ICON: Record<MatchEventType, {icon: string; tone: 'success' | 'warning' | 'danger' | 'neutral'}> = {
  goal: {icon: 'goal', tone: 'success'},
  penalty_goal: {icon: 'goal', tone: 'success'},
  own_goal: {icon: 'goal', tone: 'danger'},
  penalty_missed: {icon: 'circle-x', tone: 'danger'},
  penalty_saved: {icon: 'hand', tone: 'neutral'},
  yellow_card: {icon: 'rectangle-vertical-filled', tone: 'warning'},
  second_yellow_card: {icon: 'copy-filled', tone: 'danger'},
  red_card: {icon: 'rectangle-vertical-filled', tone: 'danger'},
  substitution: {icon: 'arrow-left-right', tone: 'neutral'},
};

/** Orden de los papeles en una hoja de partido. */
export const LINEUP_ROLES: readonly LineupRole[] = ['starter', 'bench', 'absent'];

/**
 * Estado de un partido para un distintivo: «En juego · 30'», «Descanso», «Aplazado»…
 * `instant` es el `TranslateService.instant` de quien lo pinta.
 */
export function matchStatusLabel(
  match: {status: MatchStatus; period: MatchPeriod | null; minute: number | null},
  instant: (key: string) => string,
): string {
  if (match.status !== 'playing') {
    return instant(`enum.match-status.${match.status}`);
  }

  const label = instant(match.period ? `enum.match-period.${match.period}` : 'enum.match-status.playing');
  const showMinute = match.minute !== null && match.period !== 'half_time' && match.period !== 'penalties';

  return showMinute ? `${label} · ${match.minute}'` : label;
}

/** Minuto de un evento: `12'`, o `45+2'` en el añadido. */
export function eventMinute(event: Pick<MatchEvent, 'minute' | 'added_minute'>): string {
  return event.added_minute ? `${event.minute}+${event.added_minute}'` : `${event.minute}'`;
}

/**
 * Clave i18n y parámetros del nombre de una jornada: «Jornada 5» si tiene número; si no (las
 * rondas con nombre propio), el de su tipo («Final»).
 */
export function roundLabelKey(round: {number: number | null; type: string}): {key: string; params?: Record<string, unknown>} {
  return round.number !== null ? {key: 'match.round-number', params: {number: round.number}} : {key: `enum.round-type.${round.type}`};
}

/**
 * ¿Vale el contexto de la última página para estos filtros? Solo si es de la misma competición
 * y se pidió la misma temporada (null = la vigente): así un filtro dependiente nunca ofrece
 * opciones de otra competición o de otra temporada.
 */
export function contextFits(
  context: {competitionId: number; requestedSeasonId: number | null} | null,
  competitionId: unknown,
  seasonId: unknown = context?.requestedSeasonId ?? null,
): boolean {
  return context !== null && context.competitionId === competitionId && context.requestedSeasonId === (seasonId ?? null);
}

/**
 * Fechas de una jornada con la zona de quien mira: «15 ago – 17 ago», o un solo día si empieza
 * y acaba el mismo; vacío si no tiene.
 */
export function roundDateRange(round: {starts_at: string | null; ends_at: string | null}, locale: string, timeZone?: string): string {
  const days = [round.starts_at, round.ends_at].map((value) => (value ? formatZoned(value, locale, timeZone, SHORT_DAY_FORMAT) : null));

  return [...new Set(days.filter(Boolean))].join(' – ');
}
