import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Zonas privadas: sin sesión, a /login?volver=<url pedida> para regresar después de entrar.
 * La sesión ya se ha intentado restaurar en el arranque (AuthService.restaurarSesion()).
 */
export const autenticadoGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).autenticado()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { volver: state.url } });
};
