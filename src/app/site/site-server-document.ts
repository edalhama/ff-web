import {DOCUMENT} from '@angular/common';
import {inject} from '@angular/core';

/**
 * Aspecto guardado por el visitante (claro/oscuro y combinación de color), aplicado antes del
 * primer pintado.
 *
 * El servidor genera la página con el aspecto por defecto, porque no sabe qué eligió cada
 * visitante: eso está en el `localStorage` de su navegador. Sin esto, quien eligió el claro
 * vería la página en oscuro hasta que arrancase la app. Solo cambia los atributos de tema que
 * el servidor ya ha puesto (en `<html>`, `<body>` y `<tui-root>`). Las claves son las de edas-ng
 * (`EdasStorageKeys.theme` y `themeVariant`, ver `core/config.ts`): este script corre fuera
 * del bundle y no puede importarlas.
 */
const APPLY_SAVED_THEME = `(function(){try{
var s=window.localStorage,m=s.getItem('color_theme'),v=s.getItem('color_theme_variant');
if(!m&&!v)return;
var mode=m?(m.indexOf('dark')===0?'dark':'light'):null;
[document.documentElement,document.body,document.querySelector('tui-root')].forEach(function(e){if(!e)return;
['data-theme','tuiTheme'].forEach(function(a){if(mode&&e.hasAttribute(a))e.setAttribute(a,mode);});
if(v&&e.hasAttribute('data-theme-variant')){if(v==='default')e.removeAttribute('data-theme-variant');else e.setAttribute('data-theme-variant',v);}});
}catch(e){}})();`;

/**
 * Ajusta el documento de las páginas que se generan en el servidor (inicializador de
 * `app.config.server.ts`). El `index.html` está pensado para una app que arranca en el
 * navegador sobre una página vacía; una página que ya llega pintada no quiere:
 *
 *  - el **splash** de arranque, que taparía el contenido hasta que cargase el JavaScript;
 *  - el aviso de **«activa JavaScript»**: la página se lee sin él.
 *
 * Y sí necesita aplicar cuanto antes el aspecto guardado (ver `APPLY_SAVED_THEME`).
 *
 * El panel no pasa por aquí: se sirve con el esqueleto vacío de la app, que conserva su splash.
 */
export function prepareServerDocument(): void {
  const document = inject(DOCUMENT);

  document.getElementById('app-splash')?.remove();
  document.querySelector('noscript')?.remove();

  const app = document.querySelector('app-root');
  if (app?.parentNode) {
    const script = document.createElement('script');
    script.textContent = APPLY_SAVED_THEME;
    // Justo detrás de la app: se ejecuta en cuanto el navegador termina de leerla
    app.parentNode.insertBefore(script, app.nextSibling);
  }
}
