import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Pantallas públicas (login, registro, recuperar contraseña): con sesión abierta no tienen
 * sentido, así que se va a la zona del usuario: /admin/usuarios si solo es ADMIN; /inicio si
 * además (o solo) es DEPORTISTA.
 */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.autenticado()) return true;

  const roles = auth.cuenta()?.roles ?? [];
  const soloAdmin = roles.length > 0 && roles.every((rol) => rol === 'ADMIN');
  return inject(Router).parseUrl(soloAdmin ? '/admin/usuarios' : '/inicio');
};
