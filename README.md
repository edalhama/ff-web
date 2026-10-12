# ff-web

Frontend de **fantasyfutbol**: Angular 22 (zoneless, componentes standalone, signals) sobre las librerías compartidas `edas-ng` y `edas-layout`, con la misma operativa que el frontend de UTMA.

Tiene dos partes:

- **Parte pública** (`/`, `/en`): portada, competiciones (resumen, clasificación, calendario por jornadas, equipos) y fichas de equipo. En español e inglés, cada idioma con sus URLs. Se genera en el servidor para que los buscadores la reciban completa.
- **Panel de gestión** (`/admin`): competiciones, temporadas con su calendario, clasificación y equipos, la ficha de cada equipo, la sincronización con los proveedores y la caché de las páginas públicas. Se pinta en el navegador.

## Requisitos

- **Node 22.22.3 o superior** (lo exige Angular CLI 22; también vale Node 24).
- `ff-api` levantado en `http://localhost:8090` (ver [../ff-api/docs/DEV.md](../ff-api/docs/DEV.md)) y un administrador creado con `sail artisan admin:create`.

## Puesta en marcha

```bash
cd ff-web
git submodule update --init      # projects/edas-ng y projects/edas-layout
npm install
npm start                        # http://localhost:4203
```

El sitio está en `http://localhost:4203` y el panel en `http://localhost:4203/admin`. El puerto 4203 no coincide con los de UTMA para poder tener los dos proyectos abiertos; `ff-api` ya lo admite en su CORS local.

| Comando | Qué hace |
|---------|----------|
| `npm start` | Servidor de desarrollo en el puerto 4203. Genera las páginas públicas en el servidor, como producción, pero sin guardarlas |
| `npm run build` | Compilación de producción en `dist/ff-web` (`browser/` y `server/`) |
| `npm run serve:ssr` | Arranca el servidor de páginas compilado (`PORT`, por defecto 4000), con su caché |
| `npm run deploy` | Compila y despliega en el VPS (ver [../DEPLOY.md](../DEPLOY.md)) |
| `npm test` | Specs de la app y de `edas-ng` (Karma + Jasmine) |
| `npm run i18n:sync` | Audita las claves de traducción (ver [Traducciones](#traducciones)) |
| `npm run check:boundaries` | Comprueba que `edas-ng` no importa nada de la app |

## Estructura

```
ff-web/
├── projects/
│   ├── edas-ng/          # Componentes y servicios edas-* (submódulo, alias @edas/ng)
│   └── edas-layout/      # Estilos LESS y tokens (submódulo)
├── deploy.js             # Despliegue en el VPS
└── src/
    ├── server.ts         # Servidor de páginas: render en Node, caché y sitemap
    ├── server/           # La caché de páginas y el sitemap (lógica sin Angular)
    ├── .htaccess         # Reparto de peticiones en Apache (producción)
    ├── environments/     # URL de la API y del sitio
    ├── assets/i18n/      # es.json, en.json
    ├── styles/           # styles.less (edas-layout + Taiga), app.less (panel) y site.less (parte pública)
    └── app/
        ├── core/         # Configuración de edas-ng, navegación, modales, interceptor del token
        ├── site/         # Parte pública: URLs, rutas, datos, SEO y caché
        ├── screens/      # Una carpeta por ruta: site/ (pública) y admin/ (panel)
        ├── components/   # Piezas de cada entidad: competition/, season/, team/, match/, standing/, sync/, site/, shared/
        └── shared/
            ├── models/   # Tipos de lo que devuelve ff-api (`site.ts`: la API pública)
            ├── services/ # Sesión y un servicio por recurso de la API (services/api)
            ├── dates/    # Fechas en una zona horaria concreta
            └── forms/    # Utilidades de formulario (valores, textos por idioma y errores del servidor)
```

Lo reutilizable entre proyectos va a `edas-ng` / `edas-layout`; aquí solo vive lo propio de fantasyfutbol. Los submódulos apuntan a los mismos repositorios que usa UTMA: un cambio en ellos afecta a los dos proyectos.

## Rutas

| Ruta (español · inglés) | Pantalla |
|-------------------------|----------|
| `/` · `/en` | Portada: las competiciones |
| `/{slug}` · `/en/{slug}` | Resumen de la competición: jornada en juego y clasificación |
| `…/clasificacion` · `…/standings` | Clasificación (general, local, visitante) |
| `…/calendario` · `…/fixtures` | La jornada en juego y el acceso a todas |
| `…/calendario/jornada-12` · `…/fixtures/matchday-12` | Una jornada |
| `…/equipos` · `…/teams` | Equipos de la temporada |
| `/{slug}/{temporada}/…` | Lo mismo, de una temporada concreta (`2024-25`) |
| `/equipos/{slug}` · `/en/teams/{slug}` | Ficha de un equipo |

| Ruta | Pantalla | Acceso |
|------|----------|--------|
| `/admin/login` | Acceso al panel | Solo sin sesión |
| `/admin/home` | Inicio: secciones, cuenta y preferencias | Admin |
| `/admin/competitions` | Listado de competiciones | Admin |
| `/admin/teams` | Listado de equipos | Admin |
| `/admin/cache` | Caché de las páginas públicas | Admin |

`robots.txt` excluye `/admin` y anuncia el sitemap (`/sitemap.xml`, que genera el servidor de páginas).

## Parte pública

Todo lo suyo está en `src/app/site/` y `src/app/screens/site/`.

### URLs

**`site/site-links.ts` es el único sitio donde se definen.** De ahí salen las rutas de Angular, todos los enlaces, las etiquetas `hreflang` y el sitemap. Reglas:

- El español va en la raíz; el inglés, bajo `/en`. Cada idioma usa sus palabras (`clasificacion` / `standings`).
- **La competición no lleva palabra delante**: su slug es el primer tramo (`/laliga`, `/en/laliga`). Comparte sitio, por tanto, con las demás secciones de primer nivel (`/equipos`, `/admin`…); ff-api no deja que una competición use una de esas palabras como slug (`Competition::RESERVED_SLUGS`). **Al añadir una sección de primer nivel hay que reservar allí su palabra, en todos los idiomas**, y declarar su ruta antes que las de la competición en `site-routes.ts`.
- Los slugs de competiciones y equipos son los de ff-api, que son por idioma. Un slug antiguo, o el de otro idioma, redirige (301) al vigente.
- **Sin temporada en la URL se ve la actual.** Así «la clasificación de LaLiga» tiene siempre la misma dirección. Cada temporada tiene además la suya (`/laliga/2024-25/clasificacion`); la de la temporada actual declara como canónica la que no lleva temporada.
- Una sola URL por página: sin barra final, y los parámetros (`?utm_…`) no cambian la página.

Cambiar una palabra de `SITE_SEGMENTS` cambia URLs ya publicadas: una vez indexadas por los buscadores hay que dejar redirecciones.

### Idioma

En la parte pública el idioma lo manda la URL, no la preferencia guardada (`site-language.guard.ts`). En el panel es al revés. Visitar una página en inglés no cambia el idioma del panel.

El selector de idioma de la cabecera son enlaces a la misma página en el otro idioma.

### Datos

Cada página carga sus datos en un `resolve` de su ruta (`site/site-resolvers.ts`), contra la API pública de ff-api (`SiteApiService`, `/api/site`). El resultado es siempre uno de tres (`SiteData`): datos, «no existe» (la página responde 404) o «la API no responde» (503, que para un buscador es «vuelve luego», no «ha desaparecido»).

Lo que se pide al generar la página en el servidor viaja incrustado en el HTML y el navegador lo reutiliza al arrancar: no se pide dos veces.

### SEO

`SiteSeoService` pone en cada página título, descripción, URL canónica, `hreflang` (con `x-default`), Open Graph, Twitter y los datos estructurados de schema.org (`site-schema.ts`): organización, sitio, página, migas y, según la página, la competición (`SportsOrganization`), los partidos (`SportsEvent`) o el equipo (`SportsTeam`). Solo se describe lo que está en la página.

El título y la descripción de una competición o un equipo salen de sus campos «para buscadores» del panel si están rellenos; si no, se componen.

Las páginas sin contenido (una temporada sin clasificación todavía) llevan `noindex`.

### Horas

El servidor genera las páginas en hora peninsular española. En el navegador, una vez arrancada la app, pasan a la hora de quien mira (`SiteClockService`); una nota al pie de cada lista de partidos dice cuál es. No se hace antes porque al arrancar el navegador tiene que pintar exactamente lo mismo que mandó el servidor.

### Render en servidor y caché

`src/server.ts` es un servidor de Node que genera las páginas con Angular y las guarda en memoria. Cada página declara cuánto vale y de qué datos depende (`SiteResponseService.cache()` en su resolver); ff-api purga las que toca cuando cambian los datos. Está explicado entero en [../ff-api/docs/PAGE-CACHE.md](../ff-api/docs/PAGE-CACHE.md).

En `app.routes.server.ts` está qué se genera dónde: `/admin/**` en el navegador, el resto en el servidor.

Dos cosas a tener en cuenta al tocar la parte pública:

- **Lo que pinte el servidor y lo que pinte el navegador al arrancar tiene que ser idéntico.** Nada de `Date.now()`, `window`, `localStorage` o la zona horaria del dispositivo en el primer pintado; lo que dependa del navegador, después (`afterNextRender`).
- El `index.html` lleva un splash pensado para el panel. Las páginas generadas en el servidor salen sin él (`site-server-document.ts`).

### Añadir una página

1. Su ruta y su enlace en `site-links.ts` (con su spec) y `site-routes.ts`. Si estrena un primer tramo de URL, resérvalo en ff-api (ver [URLs](#urls)).
2. Su endpoint en ff-api (`/api/site/…`), su tipo en `shared/models/site.ts` y su método en `SiteApiService`.
3. Su resolver, que además declara vigencia y etiquetas de caché.
4. Su pantalla en `screens/site/`, que aplica `SiteSeoService` y lo limpia al destruirse.
5. Sus URLs en `server/sitemap.ts`.

Los estilos comunes son las clases `site-*` de `src/styles/site.less`.

## Sesión

`SessionService` implementa el contrato `EdasSession` de edas-ng:

- El token JWT se guarda en `localStorage` (`ff_token`) y `authTokenInterceptor` lo añade a las peticiones a la API.
- Solo una cuenta con rol `admin` cuenta como sesión; cualquier otra se rechaza en el acceso.
- Un `401` o `403` de la API cierra la sesión local. Si ocurre dentro de `/admin` lleva a la pantalla de acceso; en una página pública, el visitante se queda donde está.
- La parte pública se ve igual con sesión que sin ella (es lo que genera el servidor, que no sabe quién mira); con sesión, la cabecera añade un acceso al panel.

## Panel

Los listados (competiciones, equipos) usan `<edas-list>`: tarjetas o tabla, búsqueda, filtros y orden en el servidor. Las fichas se abren como **modales apilados** que viajan en la URL, así que se pueden enlazar y el botón atrás funciona:

```
/admin/competitions?modal=competition&section=seasons&id=7&modal=season&section=edit&id=31
```

El catálogo está en `core/app-modal-registry.ts`:

| Modal | `id` | Secciones |
|-------|------|-----------|
| `competition` | competición | `new` · `edit` · `seasons` · `sync` |
| `season-new` | competición | `new` |
| `season` | temporada | `calendar` · `standings` · `teams` · `edit` |
| `team` | equipo | `edit` |

Qué hay en cada ficha:

- **Competición:** sus datos, sus temporadas y la **sincronización** (de qué proveedor llega cada dato, lanzarla ahora y las últimas ejecuciones con lo que hizo cada una). La sincronización se espera en pantalla; si el proveedor la rechaza, el aviso muestra su mensaje tal cual.
- **Temporada:** se abre por el **calendario** (una jornada cada vez, empezando por la que está en curso, con las horas en la zona horaria de quien mira), y tiene la **clasificación** (general, local y visitante, con las zonas marcadas por color) y los **equipos** inscritos. Todo esto es de solo lectura: llega por la sincronización.
- **Caché de páginas** (`/admin/cache`, no es una ficha sino una pantalla): qué páginas públicas hay guardadas, si Cloudflare está enlazado, las últimas purgas, y purgar todo, una página o lo de una competición.
- **Equipo:** sus textos y datos. No hay alta ni baja: los equipos los crea la sincronización. Sirve sobre todo para corregir los nombres, que los proveedores dan en inglés y sin tildes.

Cómo se comportan los formularios:

- **Textos por idioma.** Competición y equipo comparten el bloque de textos (`app-translation-fields`): una pestaña por idioma (`languages` de `edas.config.ts`, los mismos que `locales` en ff-api). El nombre solo es obligatorio en el idioma principal (el primero); los demás idiomas lo heredan si se dejan vacíos. El slug se genera solo si se deja vacío.
- **En una edición solo se envía lo que cambia.** ff-api bloquea frente a la sincronización los campos que recibe modificados, así que mandar el formulario entero los bloquearía todos.
- **Campos protegidos.** Los campos bloqueados se muestran al final de la ficha, con un interruptor para devolvérselos a la sincronización (`unlock_fields`).
- **Errores de validación.** La API devuelve en `data.error` un mensaje por campo. `ServerErrors` (`shared/forms`) los pinta bajo cada control y, si el error está en otro idioma, cambia a su pestaña.
- **Bajas.** Una competición con temporadas o una temporada con contenido no se pueden eliminar: la API responde `409` y el aviso explica el motivo.

Para añadir otra entidad al panel: modelo en `shared/models`, servicio en `shared/services/api`, tarjeta y formulario en `components/<entidad>`, pantalla con `<edas-list>` en `screens/admin`, ruta en `routes.ts`, entrada en `app-navigation.ts` y su modal en el registro. `components/team` es el ejemplo más corto.

Las tablas y listas propias (clasificación, partidos, ejecuciones) usan las clases `ff-panel` y `ff-table` de `src/styles/app.less`, que tienen el mismo aspecto que la tabla de `<edas-list>`. La tabla de clasificación (`app-standings-table`) y la lista de partidos (`app-match-list`) son las mismas en el panel y en la parte pública. Dentro de un componente, evita las etiquetas `<section>`, `<header>` y `<article>`: `edas-layout` les da márgenes pensados para páginas enteras.

## Traducciones

Los textos están en `src/assets/i18n/{es,en}.json`, agrupados por namespace (`competition.name`). Los namespaces se declaran en `core/edas.config.ts`: **una clave de un namespace no declarado se trata como texto libre** y se pinta mal.

Tres cosas a tener en cuenta:

- Las etiquetas de los campos `edas-*` pasan por un filtro que deja la primera letra en mayúscula y **el resto en minúsculas**. Evita siglas y nombres propios en ellas («Título para buscadores», no «Título SEO»).
- `edas-app-card` no traduce `title` ni `description`: se le pasan ya traducidos (`[title]="'common.status' | translate"`).
- `npm run i18n:sync` no ve las claves que se componen en tiempo de ejecución (`enum.*`, `standing.*`, `*.field-*`, `lang.*`, `site.competition.tab-*`, `site.competition.heading-*`, `cache.state-*`, `cache.reason-*`) y las da por no usadas. **No ejecutes `i18n:prune` sin revisar la lista.** También avisa de claves «faltantes» que solo aparecen en los specs de `edas-ng`; se pueden ignorar.

El namespace `server` no tiene entradas en los JSON: lo rellena `ServerErrors` con los mensajes que llegan de la API.

## Pruebas

```bash
npm test                                        # todo, con Chrome
npm test -- --include='src/**/*.spec.ts'        # solo los specs de la app
```

Los specs de la app cubren la lógica sin interfaz: lectura de errores de la API, utilidades de formulario, qué se envía de los textos por idioma, las URLs públicas, la vigencia de las páginas, las fechas por zona horaria, la caché de páginas y el sitemap.

## Pendiente

| Qué | Dónde |
|-----|-------|
| **Marca definitiva.** El logotipo y los iconos actuales son provisionales (monocromos, generados). También la imagen de las tarjetas sociales | `src/assets/images/brand/`, `src/assets/icons/`, `src/favicon.ico` y el logo incrustado en el splash de `src/index.html` |
| **Primer despliegue.** Los scripts y el `.htaccess` no se han probado en el VPS | [../DEPLOY.md](../DEPLOY.md) |
| **Páginas de partido y de jugador**, y las puntuaciones | — |
| **Copas y eliminatorias.** La parte pública solo pinta jornadas numeradas | — |
| **Imágenes.** Logo de la competición y escudos de los equipos: la API tiene los campos; falta la subida | — |
| **Texto de presentación** de competiciones y equipos (`content`): se pinta como texto plano | `screens/site/` |
| **Ficha de partido en el panel.** El calendario es de solo lectura; aún no se puede abrir ni corregir un partido | — |
| **Enlazar una competición con su proveedor** desde el panel (hoy, por consola con `sync:link`) | — |
