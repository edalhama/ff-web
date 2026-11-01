import {PlayerCard, PlayerMembership} from '../models/player';

/** Competición en la que se enseña la ficha: la del modal o, si no viene, la de su ficha más reciente. */
export function contextCompetitionId(card: PlayerCard): number | null {
  return card.context_competition_id ?? card.memberships[0]?.competition.id ?? null;
}

/**
 * Sus fichas en esa competición, en la temporada más reciente en la que está (la actual, si
 * está en ella): una por equipo.
 */
export function contextMemberships(card: PlayerCard): PlayerMembership[] {
  const competitionId = contextCompetitionId(card);
  const inCompetition = card.memberships.filter((membership) => membership.competition.id === competitionId);
  // Vienen con la temporada actual primero y luego de la más reciente a la más antigua
  const seasonId = inCompetition[0]?.season.id;

  return inCompetition.filter((membership) => membership.season.id === seasonId);
}
