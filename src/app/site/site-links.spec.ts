import {
  absoluteUrl,
  competitionPath,
  homePath,
  languageOfPath,
  roundFromSegment,
  teamPath,
  withCompetitionSlug,
  withTeamSlug,
} from './site-links';

describe('site-links', () => {
  it('pone el idioma principal en la raíz y los demás bajo su código', () => {
    expect(homePath('es')).toBe('/');
    expect(homePath('en')).toBe('/en');
    expect(teamPath('es', 'sevilla')).toBe('/equipos/sevilla');
    expect(teamPath('en', 'sevilla')).toBe('/en/teams/sevilla');
  });

  it('compone las páginas de una competición con las palabras de cada idioma', () => {
    expect(competitionPath('es', 'laliga')).toBe('/laliga');
    expect(competitionPath('en', 'laliga')).toBe('/en/laliga');
    expect(competitionPath('es', 'laliga', {page: 'standings'})).toBe('/laliga/clasificacion');
    expect(competitionPath('en', 'laliga', {page: 'standings'})).toBe('/en/laliga/standings');
    expect(competitionPath('es', 'laliga', {page: 'teams', season: '2024-25'})).toBe('/laliga/2024-25/equipos');
  });

  it('solo añade la jornada en el calendario', () => {
    expect(competitionPath('es', 'laliga', {page: 'fixtures', round: 12})).toBe('/laliga/calendario/jornada-12');
    expect(competitionPath('en', 'laliga', {page: 'fixtures', season: '2024-25', round: 3})).toBe('/en/laliga/2024-25/fixtures/matchday-3');
    expect(competitionPath('es', 'laliga', {page: 'standings', round: 12})).toBe('/laliga/clasificacion');
  });

  it('lee la jornada de su segmento, en el idioma de la URL', () => {
    expect(roundFromSegment('es', 'jornada-12')).toBe(12);
    expect(roundFromSegment('en', 'matchday-1')).toBe(1);
    expect(roundFromSegment('en', 'jornada-12')).toBeNull();
    expect(roundFromSegment('es', 'jornada-')).toBeNull();
    expect(roundFromSegment('es', undefined)).toBeNull();
  });

  it('deduce el idioma de una ruta', () => {
    expect(languageOfPath('/')).toBe('es');
    expect(languageOfPath('/equipos/sevilla')).toBe('es');
    expect(languageOfPath('/en')).toBe('en');
    expect(languageOfPath('/en/teams/sevilla')).toBe('en');
    expect(languageOfPath('/entrenadores')).toBe('es');
    expect(languageOfPath('/laliga/clasificacion')).toBe('es');
    expect(languageOfPath('/en/laliga/standings')).toBe('en');
  });

  it('cambia el slug de una URL sin tocar el resto', () => {
    expect(withCompetitionSlug('es', '/primera/clasificacion', 'laliga')).toBe('/laliga/clasificacion');
    expect(withCompetitionSlug('en', '/en/first/2024-25/fixtures/matchday-3?x=1', 'laliga')).toBe('/en/laliga/2024-25/fixtures/matchday-3?x=1');
    expect(withTeamSlug('es', '/equipos/sevilla-fc', 'sevilla')).toBe('/equipos/sevilla');
    expect(withTeamSlug('en', '/en/teams/sevilla-fc#top', 'sevilla')).toBe('/en/teams/sevilla#top');
  });

  it('cambia el tramo del slug aunque su texto aparezca antes en la URL', () => {
    // Con un reemplazo de texto, `/e` cambiaría el prefijo del idioma
    expect(withCompetitionSlug('en', '/en/e/standings', 'euro')).toBe('/en/euro/standings');
    expect(withTeamSlug('es', '/equipos/equipo', 'sevilla')).toBe('/equipos/sevilla');
  });

  it('compone URLs absolutas', () => {
    expect(absoluteUrl('https://fantasyfutbol.es/', '/')).toBe('https://fantasyfutbol.es/');
    expect(absoluteUrl('https://fantasyfutbol.es', '/en')).toBe('https://fantasyfutbol.es/en');
  });
});
