import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { aApiError } from '../util/api-error';

/**
 * Convierte cualquier HttpErrorResponse en ApiError (core/util/api-error.ts), así las pantallas y
 * los servicios solo trabajan con ApiError: codigo, detalle, errores[], mensajeEspera()…
 *
 * No muestra nada: cada pantalla decide (ns-alert, toast, errores en el formulario). Única
 * excepción: un 403 CONSENTIMIENTO_REVOCADO marca la cuenta local con
 * consentimientoSaludVigente = false, para que el layout muestre el aviso global (NutriSport_API.md
 * §3.1: "Banner global → Configuración › Privacidad").
 *
 * Los errores que no son HTTP (o que ya son ApiError) pasan tal cual.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((e: unknown) => {
      if (!(e instanceof HttpErrorResponse)) return throwError(() => e);

      const error = aApiError(e);
      if (error.status === 403 && error.esCodigo('CONSENTIMIENTO_REVOCADO')) {
        const cuenta = auth.cuenta();
        if (cuenta?.consentimientoSaludVigente) {
          auth.actualizarCuenta({ ...cuenta, consentimientoSaludVigente: false });
        }
      }
      return throwError(() => error);
    }),
  );
};
