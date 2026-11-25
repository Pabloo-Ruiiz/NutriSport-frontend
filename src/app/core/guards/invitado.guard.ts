import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import type { Rol } from '../models';
import { AuthService } from '../services/auth.service';

/**
 * Pantallas públicas (login, registro, recuperar contraseña): con sesión abierta no tienen
 * sentido, así que se va a la zona del usuario: /admin/usuarios si solo es ADMIN; /inicio si
 * además (o solo) es DEPORTISTA.
 */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.autenticado()) return true;

  return inject(Router).parseUrl(rutaDeInicio(auth.cuenta()?.roles));
};

/** Página de inicio según los roles: /admin/usuarios si solo es ADMIN; si no, /inicio. */
export function rutaDeInicio(roles: readonly Rol[] | null | undefined): string {
  const lista = roles ?? [];
  const soloAdmin = lista.length > 0 && lista.every((rol) => rol === 'ADMIN');
  return soloAdmin ? '/admin/usuarios' : '/inicio';
}
