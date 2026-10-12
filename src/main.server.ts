import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { serverConfig } from './app/app.config.server';

/**
 * Entrada del render en servidor (ver app.routes.server.ts y server.ts).
 *
 * El `BootstrapContext` es obligatorio al arrancar fuera del navegador: sin él,
 * `bootstrapApplication` no encuentra la plataforma (NG0401).
 */
export default (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, serverConfig, context);
