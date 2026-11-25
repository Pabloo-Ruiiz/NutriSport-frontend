import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { PerfilService } from '../services/perfil.service';

/**
 * Zona del deportista (NutriSport_API.md §4): sin perfil deportivo, a /bienvenida para crearlo.
 *
 * - Sin consentimiento de salud vigente deja pasar sin preguntar: GET /perfil respondería 403
 *   CONSENTIMIENTO_REVOCADO, y el layout ya muestra el aviso global.
 * - Si GET /perfil falla por otro motivo (sin conexión, 500…), el error se propaga y la
 *   navegación se cancela; el resto de la aplicación lo trata como cualquier error de navegación.
 */
export const perfilGuard: CanActivateFn = async () => {
  if (!inject(AuthService).consentimientoVigente()) return true;

  const router = inject(Router);
  const existe = await inject(PerfilService).existe();
  return existe ? true : router.parseUrl('/bienvenida');
};
