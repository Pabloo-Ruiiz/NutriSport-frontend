import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Zona de administración. Va después de autenticadoGuard: aquí ya hay sesión y solo falta el rol.
 * El backend responde 403 SIN_PERMISO igualmente; esto solo evita mostrar la pantalla.
 */
export const adminGuard: CanActivateFn = () => {
  if (inject(AuthService).esAdmin()) return true;
  return inject(Router).parseUrl('/sin-permiso');
};
