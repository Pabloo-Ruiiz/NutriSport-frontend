import { Routes } from '@angular/router';

import { environment } from '@env/environment';

/**
 * Rutas de apoyo al desarrollo. En producción el array queda vacío, así que la ruta no existe
 * (el chunk perezoso se genera igualmente, pero ninguna ruta lo carga).
 */
const rutasDesarrollo: Routes = environment.production
  ? []
  : [
      {
        path: 'dev/estilos',
        title: 'Guía de estilos · NutriSport AI',
        loadComponent: () => import('@features/dev/estilos.component').then((m) => m.EstilosComponent),
      },
      {
        path: 'dev/componentes',
        title: 'Componentes · NutriSport AI',
        loadComponent: () => import('@features/dev/componentes.component').then((m) => m.ComponentesComponent),
      },
    ];

export const routes: Routes = [...rutasDesarrollo];
