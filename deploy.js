/**
 * Despliegue de ff-web en el VPS (aaPanel). Uso: `npm run deploy`. Ver ../DEPLOY.md.
 *
 * Lo que sube:
 *  - `dist/ff-web/browser/` → la raíz del sitio (ficheros que sirve Apache).
 *  - `dist/ff-web/server/`  → el servidor de render (Node), en una carpeta aparte.
 *
 * Orden pensado para que no haya ningún momento con páginas rotas: los ficheros nuevos se
 * suben antes de reiniciar el servidor de render y los viejos no se borran hasta después,
 * porque mientras tanto hay HTML en circulación (el que está generando la versión anterior,
 * el que tenga guardado Cloudflare) que todavía los pide.
 *
 * La conexión se puede cambiar sin tocar el fichero: DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USER.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  host: process.env.DEPLOY_HOST || '145.239.197.90',
  port: process.env.DEPLOY_PORT || '1311',
  user: process.env.DEPLOY_USER || 'deployer',
  // Raíz del sitio en aaPanel: lo público
  siteDir: '/www/wwwroot/fantasyfutbol.es',
  // Servidor de render: fuera de la raíz, no se sirve
  renderDir: '/www/wwwroot/fantasyfutbol.es_web',
  // ff-api, para pedirle la purga de la caché al terminar
  apiDir: '/www/wwwroot/fantasyfutbol.es_api',
  // Donde escucha el servidor de render en el VPS (su PORT)
  renderUrl: 'http://127.0.0.1:4000',
  php: '/www/server/php/85/bin/php',
};

const target = `${CONFIG.user}@${CONFIG.host}`;
const ssh = `ssh -p ${CONFIG.port}`;

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: 'inherit' });
}

/** Ejecuta en el VPS. Con `optional`, un fallo se avisa pero no detiene el despliegue. */
function remote(command, { optional = false } = {}) {
  try {
    run(`${ssh} ${target} ${JSON.stringify(command)}`);
    return true;
  } catch (error) {
    if (!optional) {
      throw error;
    }
    return false;
  }
}

/** Sube el número de compilación (tercer número) y lo deja donde lo lee la app. */
function bumpVersion() {
  const versionFile = path.join(__dirname, 'version.txt');
  const current = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : '0.1.0';

  const parts = current.split('.').map(Number);
  while (parts.length < 3) {
    parts.push(0);
  }
  parts[2]++;

  const version = parts.join('.');
  fs.writeFileSync(versionFile, version + '\n');
  fs.writeFileSync(
    path.join(__dirname, 'src', 'assets', 'version.json'),
    JSON.stringify({ version, date: new Date().toISOString() }, null, 2) + '\n',
  );

  console.log(`Versión ${version}`);
}

function rsync(localDir, remoteDir, { remove = false, excludes = [] } = {}) {
  const flags = ['-avz', `-e "${ssh}"`, ...(remove ? ['--delete'] : []), ...excludes.map((item) => `--exclude "${item}"`)];

  run(`rsync ${flags.join(' ')} "${localDir}/" "${target}:${remoteDir}/"`);
}

// En la raíz del sitio hay cosas que no vienen del build y que `--delete` no debe tocar:
// la configuración de PHP de aaPanel, el enlace a la API y los retos de los certificados
const SITE_EXCLUDES = ['.user.ini', 'backend', '.well-known'];

try {
  bumpVersion();

  run('npx ng build --configuration=production');

  const dist = path.join(__dirname, 'dist', 'ff-web');

  // 1. Ficheros nuevos, sin borrar los de la versión anterior
  rsync(path.join(dist, 'browser'), CONFIG.siteDir, { excludes: SITE_EXCLUDES });

  // 2. Servidor de render nuevo
  remote(`mkdir -p ${CONFIG.renderDir}/server`);
  rsync(path.join(dist, 'server'), `${CONFIG.renderDir}/server`, { remove: true });

  // 3. Reinicio: el proceso vigila este fichero y sale al tocarlo; Supervisor lo arranca de
  //    nuevo, ya con el código nuevo y la caché vacía
  remote(`touch ${CONFIG.renderDir}/restart.txt`);

  const up = remote(
    // Margen para que el proceso anterior vea el fichero (lo mira cada 2 s) y arranque el nuevo
    `sleep 4; curl -fsS --retry 15 --retry-delay 1 --retry-connrefused ${CONFIG.renderUrl}/__ff/health`,
    { optional: true },
  );

  if (!up) {
    console.warn(
      '\n⚠ El servidor de render no responde. Comprueba el proceso «fantasyfutbol-web» en Supervisor Manager (../DEPLOY.md).' +
        '\n  Mientras tanto el sitio funciona, pero las páginas se pintan en el navegador y los buscadores reciben un 503.',
    );
  }

  // 4. Lo que tenga guardado Cloudflare es HTML de la versión anterior
  remote(`cd ${CONFIG.apiDir} && ${CONFIG.php} artisan page-cache:purge --all`, { optional: true });

  // 5. Ya nadie pide los ficheros viejos: fuera
  rsync(path.join(dist, 'browser'), CONFIG.siteDir, { remove: true, excludes: SITE_EXCLUDES });

  console.log('\n¡Despliegue de ff-web completado!');
} catch (error) {
  console.error('\nEl despliegue se ha detenido:', error.message);
  process.exit(1);
}
