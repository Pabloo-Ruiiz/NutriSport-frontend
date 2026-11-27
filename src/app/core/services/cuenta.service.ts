import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, tap } from 'rxjs';

import { environment } from '@env/environment';
import type {
  ActualizarCuentaRequest,
  CambiarEmailRequest,
  CambiarPasswordRequest,
  CuentaResponse,
  EliminarCuentaRequest,
  MensajeResponse,
} from '../models';
import { nombreDeContentDisposition } from '../util/descarga';
import { AuthService } from './auth.service';

/** Nombre del archivo de la exportación si la respuesta no trae Content-Disposition. */
export const NOMBRE_EXPORTACION_POR_DEFECTO = 'nutrisport-datos.json';

/** Archivo de la exportación de datos, listo para descargarBlob(). */
export interface ExportacionDatos {
  blob: Blob;
  nombre: string;
}

/**
 * Cuenta del usuario autenticado (NutriSport_API.md §6 Cuenta y §4): datos, contraseña, email,
 * consentimiento de datos de salud (RGPD art. 9) y eliminación.
 *
 * Lo que cambia la cuenta se refleja en AuthService.cuenta(), de la que dependen la sidebar, los
 * avisos del shell y los guards. Los cuerpos se construyen campo a campo: el backend rechaza
 * propiedades desconocidas (400).
 *
 * Si la contraseña actual no es correcta (cambiar contraseña o email, eliminar), el backend
 * responde 400 VALIDACION con el error en el campo de la contraseña (§11.4): aplicarErroresServidor.
 */
@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/cuenta`;

  /** GET /cuenta. Actualiza la cuenta en memoria de AuthService (emailVerificado, email, roles…). */
  obtener(): Observable<CuentaResponse> {
    return this.http.get<CuentaResponse>(this.url).pipe(tap((cuenta) => this.auth.actualizarCuenta(cuenta)));
  }

  /**
   * PATCH /cuenta: nombre, unidades e insights. Solo envía los campos que cambian respecto a la
   * cuenta actual (los que no se envían no cambian). Si no cambia nada, no llama y devuelve la
   * cuenta actual. El nombre se envía sin espacios al principio ni al final.
   */
  actualizar(req: ActualizarCuentaRequest): Observable<CuentaResponse> {
    const actual = this.auth.cuenta();
    const cambios: ActualizarCuentaRequest = {};
    const nombre = req.nombre?.trim();
    if (nombre !== undefined && nombre !== actual?.nombre) cambios.nombre = nombre;
    if (req.unidades !== undefined && req.unidades !== actual?.unidades) cambios.unidades = req.unidades;
    if (req.insightsActivos !== undefined && req.insightsActivos !== actual?.insightsActivos) {
      cambios.insightsActivos = req.insightsActivos;
    }

    if (Object.keys(cambios).length === 0 && actual) return of(actual);
    return this.http.patch<CuentaResponse>(this.url, cambios).pipe(tap((cuenta) => this.auth.actualizarCuenta(cuenta)));
  }

  /**
   * PUT /cuenta/password (204). El backend cierra todas las sesiones, también esta: se limpia la
   * sesión local (NutriSport_API.md §2.1) y la pantalla debe llevar a /login.
   */
  cambiarPassword(req: CambiarPasswordRequest): Observable<void> {
    const cuerpo: CambiarPasswordRequest = { passwordActual: req.passwordActual, nuevaPassword: req.nuevaPassword };
    return this.http.put<void>(`${this.url}/password`, cuerpo).pipe(tap(() => this.auth.cerrarSesionLocal()));
  }

  /**
   * PUT /cuenta/email (202): envía un enlace de confirmación al email nuevo. La cuenta no cambia
   * hasta que se abre (POST /auth/verificar-email). Responde siempre igual, esté o no en uso (§2.4).
   */
  cambiarEmail(req: CambiarEmailRequest): Observable<MensajeResponse> {
    const cuerpo: CambiarEmailRequest = { nuevoEmail: req.nuevoEmail.trim(), password: req.password };
    return this.http.put<MensajeResponse>(`${this.url}/email`, cuerpo);
  }

  /**
   * POST /cuenta/consentimiento-salud (204): vuelve a dar el consentimiento y desbloquea perfil,
   * comidas, análisis, entrenamientos y seguimiento. Después recarga la cuenta.
   */
  darConsentimiento(): Observable<CuentaResponse> {
    return this.http.post<void>(`${this.url}/consentimiento-salud`, null).pipe(switchMap(() => this.obtener()));
  }

  /**
   * DELETE /cuenta/consentimiento-salud (204): bloquea las funciones con datos de salud (403
   * CONSENTIMIENTO_REVOCADO) hasta volver a darlo. Los datos no se borran. Después recarga la cuenta.
   */
  revocarConsentimiento(): Observable<CuentaResponse> {
    return this.http.delete<void>(`${this.url}/consentimiento-salud`).pipe(switchMap(() => this.obtener()));
  }

  /**
   * GET /cuenta/exportacion (§7.6): JSON con todos los datos de la cuenta. Se pide por HttpClient
   * (lleva el token) como Blob; el nombre sale de Content-Disposition o, si falta,
   * "nutrisport-datos.json". Funciona aunque el consentimiento de salud esté revocado (RGPD art.
   * 20); sin el email verificado responde 403 EMAIL_NO_VERIFICADO.
   */
  exportar(): Observable<ExportacionDatos> {
    return this.http.get(`${this.url}/exportacion`, { responseType: 'blob', observe: 'response' }).pipe(
      map((respuesta) => ({
        blob: respuesta.body ?? new Blob([], { type: 'application/json' }),
        nombre:
          nombreDeContentDisposition(respuesta.headers.get('Content-Disposition')) ?? NOMBRE_EXPORTACION_POR_DEFECTO,
      })),
    );
  }

  /**
   * DELETE /cuenta (204) con { password, inmediata } en el cuerpo; `inmediata` va siempre (§11.2).
   * inmediata = true lo borra todo al momento; false deja la cuenta ELIMINADA y la borra a los 30
   * días. El backend cierra todas las sesiones y borra la cookie: se limpia la sesión local y la
   * pantalla debe llevar fuera de la zona privada.
   */
  eliminar(req: EliminarCuentaRequest): Observable<void> {
    const cuerpo: EliminarCuentaRequest = { password: req.password, inmediata: req.inmediata === true };
    return this.http.delete<void>(this.url, { body: cuerpo }).pipe(tap(() => this.auth.cerrarSesionLocal()));
  }
}
