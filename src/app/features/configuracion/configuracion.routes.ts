import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { LayoutService } from '@core/layout/layout.service';
import { ConfiguracionComponent } from './configuracion.component';

/** Sección por defecto. */
export const SECCION_INICIAL = '/configuracion/cuenta';

/**
 * /configuracion sin sección: en móvil es la lista de secciones (DESIGN.md §7.16: "lista que abre
 * cada sección en pantalla propia"); en tablet y escritorio, donde la lista está siempre a la
 * izquierda, va a Cuenta.
 */
export const indiceConfiguracionGuard: CanActivateFn = () =>
  inject(LayoutService).esMovil() ? true : inject(Router).parseUrl(SECCION_INICIAL);

/** En /configuracion (móvil) el contenido es la propia lista del contenedor. */
@Component({ selector: 'app-configuracion-indice', template: '', changeDetection: ChangeDetectionStrategy.OnPush })
export class ConfiguracionIndiceComponent {}

/** La topbar muestra "Configuración" en todas las secciones; la pestaña, el nombre de la sección. */
const enConfiguracion = { tituloPagina: 'Configuración' };

export const RUTAS_CONFIGURACION: Routes = [
  {
    path: '',
    component: ConfiguracionComponent,
    children: [
      { path: '', pathMatch: 'full', canActivate: [indiceConfiguracionGuard], component: ConfiguracionIndiceComponent },
      {
        path: 'cuenta',
        title: 'Cuenta',
        data: enConfiguracion,
        loadComponent: () => import('./cuenta-datos.component').then((m) => m.CuentaDatosComponent),
      },
      {
        path: 'seguridad',
        title: 'Seguridad',
        data: enConfiguracion,
        loadComponent: () => import('./seguridad.component').then((m) => m.SeguridadComponent),
      },
      {
        path: 'privacidad',
        title: 'Privacidad y datos',
        data: enConfiguracion,
        loadComponent: () => import('./privacidad.component').then((m) => m.PrivacidadComponent),
      },
      {
        path: 'uso-ia',
        title: 'Uso de IA',
        data: enConfiguracion,
        loadComponent: () => import('./uso-ia.component').then((m) => m.UsoIaComponent),
      },
    ],
  },
];
