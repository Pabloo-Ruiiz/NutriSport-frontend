import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '@env/environment';
import { AuthService } from '../services/auth.service';
import { estadoHttp } from '../util/api-error';

/**
 * Rutas públicas de /auth (NutriSport_API.md §2.1): no llevan Authorization y un 401 en ellas no
 * dispara el refresh (p. ej. el 401 del login con credenciales incorrectas). Sin el prefijo
 * environment.apiUrl ni la query.
 */
export const RUTAS_PUBLICAS: readonly string[] = [
  '/auth/login',
  '/auth/registro',
  '/auth/refresh',
  '/auth/logout',
  '/auth/verificar-email',
  '/auth/reenviar-verificacion',
  '/auth/recuperar-password',
  '/auth/restablecer-password',
];

/** Ruta de la API sin el prefijo ni la query ("/comidas/123"), o null si no es de la API. */
function rutaApi(url: string): string | null {
  const base = environment.apiUrl;
  if (!url.startsWith(base)) return null;
  const resto = url.slice(base.length);
  // "/api/v1x" no es de la API: tras el prefijo tiene que venir "/", "?" o nada.
  if (resto !== '' && !/^[/?#]/.test(resto)) return null;
  return resto.split(/[?#]/)[0] || '/';
}

function conToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Añade el access token y renueva la sesión ante un 401 (NutriSport_API.md §2.1).
 *
 * - Solo actúa en las URL de la API (environment.apiUrl); las demás pasan tal cual.
 * - Añade "Authorization: Bearer …" si hay token, salvo en las rutas públicas de /auth.
 * - 401 en una ruta protegida: AuthService.refrescar() (una sola petición aunque fallen varias a la
 *   vez) y repite la petición original UNA vez con el token nuevo. Si el reintento vuelve a dar
 *   401, ese error llega a la pantalla (no hay bucle: el reintento sale por `next`, que ya no pasa
 *   por este interceptor).
 * - Si el refresh falla: cierra la sesión local, navega a /login?volver=<url actual> y propaga el
 *   401 original.
 *
 * Con withInterceptors([authInterceptor, errorInterceptor]), errorInterceptor ve la respuesta
 * antes que este (las respuestas recorren la lista al revés), así que el 401 puede llegar ya como
 * ApiError: por eso se mira el estado con estadoHttp(), que acepta los dos tipos.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const ruta = rutaApi(req.url);
  if (ruta === null) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const publica = RUTAS_PUBLICAS.includes(ruta);
  const token = auth.tokenActual();
  const peticion = token && !publica ? conToken(req, token) : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (publica || estadoHttp(error) !== 401) return throwError(() => error);

      return auth.refrescar().pipe(
        catchError(() => {
          auth.cerrarSesionLocal();
          const actual = router.url;
          const yaEnLogin = actual.startsWith('/login');
          void router.navigate(['/login'], yaEnLogin ? {} : { queryParams: { volver: actual } });
          return throwError(() => error);
        }),
        switchMap((sesion) => next(conToken(req, sesion.accessToken))),
      );
    }),
  );
};
