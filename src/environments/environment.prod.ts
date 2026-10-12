export const environment = {
  production: true,
  /** URL pública del sitio: canonical, hreflang, Open Graph, datos estructurados y sitemap. */
  siteUrl: 'https://fantasyfutbol.es/',
  api: {
    // Misma convención que UTMA: la API cuelga de /backend en el propio dominio (un enlace
    // simbólico a la carpeta `public` de ff-api). Absoluta para que valga también en el
    // servidor de render, que no tiene «dominio actual».
    url: 'https://fantasyfutbol.es/backend/api/',
  },
};
