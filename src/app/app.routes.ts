import { Routes } from '@angular/router';

import { adminGuard } from '@core/guards/admin.guard';
import { autenticadoGuard } from '@core/guards/autenticado.guard';
import { cambiosSinGuardarGuard } from '@core/guards/cambios-sin-guardar.guard';
import { invitadoGuard } from '@core/guards/invitado.guard';
import { perfilGuard } from '@core/guards/perfil.guard';
import { environment } from '@env/environment';

/**
 * Rutas de la aplicación (NutriSport_API.md §9). Todo se carga de forma diferida.
 *
 * Cada ruta lleva un `title` corto: NutriSportTitleStrategy le añade " · NutriSport" en la pestaña
 * y la topbar del shell lo muestra tal cual.
 */

/**
 * Pantalla que aún no existe: PaginaPendienteComponent con "Pantalla en construcción (paso N)",
 * donde N es el paso de docs/Guia_Github_Frontend_NutriSport.md que la crea. Al llegar a ese paso,
 * se cambia `...pendiente(N)` por el loadComponent de la pantalla.
 */
const pendiente = (paso: number) => ({
  loadComponent: () => import('@features/errores/pagina-pendiente.component').then((m) => m.PaginaPendienteComponent),
  data: { paso },
});

/**
 * Rutas de apoyo al desarrollo. En producción el array queda vacío, así que la ruta no existe
 * (el chunk perezoso se genera igualmente, pero ninguna ruta lo carga).
 */
const rutasDesarrollo: Routes = environment.production
  ? []
  : [
      {
        path: 'dev/estilos',
        title: 'Guía de estilos',
        loadComponent: () => import('@features/dev/estilos.component').then((m) => m.EstilosComponent),
      },
      {
        path: 'dev/componentes',
        title: 'Componentes',
        loadComponent: () => import('@features/dev/componentes.component').then((m) => m.ComponentesComponent),
      },
    ];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },

  // Pantallas públicas, con el panel de marca.
  {
    path: '',
    loadComponent: () => import('@core/layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        // Solo sin sesión: con sesión, invitadoGuard lleva a /inicio (o a /admin/usuarios).
        path: '',
        canActivate: [invitadoGuard],
        children: [
          {
            path: 'login',
            title: 'Iniciar sesión',
            loadComponent: () => import('@features/auth/login/login.component').then((m) => m.LoginComponent),
          },
          {
            path: 'registro',
            title: 'Crear cuenta',
            loadComponent: () => import('@features/auth/registro/registro.component').then((m) => m.RegistroComponent),
          },
          {
            path: 'registro/revisa-tu-email',
            title: 'Revisa tu email',
            loadComponent: () =>
              import('@features/auth/registro/revisa-tu-email.component').then((m) => m.RevisaTuEmailComponent),
          },
          {
            path: 'recuperar-password',
            title: 'Recuperar contraseña',
            loadComponent: () =>
              import('@features/auth/recuperar/recuperar-password.component').then((m) => m.RecuperarPasswordComponent),
          },
        ],
      },
      // Enlaces de los correos (§2.2): válidos con o sin sesión.
      {
        path: 'verificar-email',
        title: 'Verificar email',
        loadComponent: () =>
          import('@features/auth/verificar-email/verificar-email.component').then((m) => m.VerificarEmailComponent),
      },
      {
        path: 'restablecer-password',
        title: 'Nueva contraseña',
        loadComponent: () =>
          import('@features/auth/recuperar/restablecer-password.component').then((m) => m.RestablecerPasswordComponent),
      },
    ],
  },

  // Configuración inicial del perfil: pantalla completa, sin sidebar.
  {
    path: 'bienvenida',
    title: 'Bienvenida',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('@features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },

  // Zona del deportista.
  {
    path: '',
    loadComponent: () => import('@core/layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [autenticadoGuard],
    children: [
      {
        // Sin perfil → /bienvenida (salvo con el consentimiento revocado: ver perfilGuard).
        path: '',
        canActivate: [perfilGuard],
        children: [
          { path: 'inicio', title: 'Inicio', ...pendiente(18) },
          {
            path: 'comidas',
            title: 'Comidas',
            loadComponent: () =>
              import('@features/comidas/historial/historial-comidas.component').then(
                (m) => m.HistorialComidasComponent,
              ),
          },
          {
            path: 'comidas/nueva',
            title: 'Registrar comida',
            loadComponent: () =>
              import('@features/comidas/registro/registro-comida.component').then((m) => m.RegistroComidaComponent),
            canDeactivate: [cambiosSinGuardarGuard],
          },
          { path: 'comidas/foto', title: 'Registrar con foto', ...pendiente(19) },
          { path: 'comidas/foto/:id', title: 'Resultado del análisis', ...pendiente(20) },
          {
            path: 'comidas/:id/editar',
            title: 'Editar comida',
            loadComponent: () =>
              import('@features/comidas/registro/registro-comida.component').then((m) => m.RegistroComidaComponent),
            canDeactivate: [cambiosSinGuardarGuard],
          },
          {
            path: 'mis-alimentos',
            title: 'Mis alimentos',
            loadComponent: () =>
              import('@features/alimentos/mis-alimentos.component').then((m) => m.MisAlimentosComponent),
          },
          {
            path: 'actividad',
            title: 'Actividad',
            loadComponent: () => import('@features/actividad/actividad.component').then((m) => m.ActividadComponent),
          },
          {
            path: 'perfil',
            title: 'Mi perfil',
            loadComponent: () => import('@features/perfil/perfil.component').then((m) => m.PerfilComponent),
            canDeactivate: [cambiosSinGuardarGuard],
          },
        ],
      },
      // Sin perfilGuard: la cuenta se gestiona aunque no haya perfil o se haya revocado el consentimiento.
      {
        path: 'configuracion',
        title: 'Configuración',
        loadChildren: () => import('@features/configuracion/configuracion.routes').then((m) => m.RUTAS_CONFIGURACION),
      },
    ],
  },

  // Administración.
  {
    path: 'admin',
    loadComponent: () => import('@core/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [autenticadoGuard, adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      { path: 'usuarios', title: 'Usuarios', ...pendiente(21) },
      { path: 'catalogo', title: 'Catálogo', ...pendiente(22) },
    ],
  },

  ...rutasDesarrollo,

  {
    path: 'sin-permiso',
    title: 'Sin permiso',
    loadComponent: () => import('@features/errores/sin-permiso.component').then((m) => m.SinPermisoComponent),
  },
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('@features/errores/no-encontrado.component').then((m) => m.NoEncontradoComponent),
  },
];
