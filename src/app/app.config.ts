import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { AuthService } from '@core/services/auth.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { routes } from './app.routes';

// Datos de formato es-ES (coma decimal, punto de miles, nombres de días y meses).
registerLocaleData(localeEs, 'es-ES');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // authInterceptor: token y refresh ante 401. errorInterceptor: HttpErrorResponse → ApiError.
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    // Iconos de Lucide disponibles por nombre en <svg lucideIcon="…"> (shared/design/iconos.ts).
    provideLucideIcons(...ICONOS_APP),
    // Recupera la sesión con la cookie ns_refresh antes de la primera navegación (NutriSport_API.md §2.1).
    provideAppInitializer(() => inject(AuthService).restaurarSesion()),
  ],
};
