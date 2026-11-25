import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { routes } from './app.routes';

// Datos de formato es-ES (coma decimal, punto de miles, nombres de días y meses).
registerLocaleData(localeEs, 'es-ES');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Los interceptores (token y errores) se añaden en el paso 7.
    provideHttpClient(withInterceptors([])),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    // Iconos de Lucide disponibles por nombre en <svg lucideIcon="…"> (shared/design/iconos.ts).
    provideLucideIcons(...ICONOS_APP),
  ],
};
