import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';

import { environment } from '@env/environment';
import type { CuentaResponse, LoginRequest, MensajeResponse, RegistroRequest, TokenResponse } from '../models';
import { estadoHttp } from '../util/api-error';
import { PerfilService } from './perfil.service';

/**
 * Sesión del usuario (NutriSport_API.md §2).
 *
 * - El access token (15 min) y la cuenta viven SOLO en memoria, en signals. Nunca en localStorage
 *   ni sessionStorage: un XSS no puede leerlos de ahí y, al recargar, la sesión se recupera con
 *   la cookie HttpOnly ns_refresh (restaurarSesion(), en el arranque).
 * - El refresh token rota en cada uso y reutilizar uno ya usado cierra todas las sesiones: por eso
 *   refrescar() comparte una única petición entre todos los que lo llamen a la vez.
 * - Los cuerpos se construyen campo a campo: el backend rechaza propiedades desconocidas (400) y
 *   exige los booleanos de LoginRequest y RegistroRequest.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly perfil = inject(PerfilService);
  private readonly url = `${environment.apiUrl}/auth`;

  private readonly token = signal<string | null>(null);
  /** Momento (ms desde 1970) en que caduca el access token. */
  private readonly expiraEn = signal<number | null>(null);
  private readonly cuentaActual = signal<CuentaResponse | null>(null);

  /** Petición de refresh en curso, compartida (ver refrescar()). */
  private refreshEnCurso: Observable<TokenResponse> | null = null;
  /**
   * Sube al cerrar la sesión. Un refresh que salió antes y responde después no debe volver a
   * abrirla: solo guarda la sesión si la generación no ha cambiado.
   */
  private generacion = 0;

  /** Cuenta del usuario autenticado, o null. */
  readonly cuenta = this.cuentaActual.asReadonly();
  readonly autenticado = computed(() => this.token() !== null && this.cuentaActual() !== null);
  readonly esAdmin = computed(() => this.cuentaActual()?.roles.includes('ADMIN') ?? false);
  readonly emailVerificado = computed(() => this.cuentaActual()?.emailVerificado ?? false);
  readonly consentimientoVigente = computed(() => this.cuentaActual()?.consentimientoSaludVigente ?? false);
  /** Momento (ms desde 1970) en que caduca el access token, o null sin sesión. */
  readonly caducaEn = this.expiraEn.asReadonly();

  /** Access token para la cabecera Authorization (lo usa el interceptor). */
  tokenActual(): string | null {
    return this.token();
  }

  /** POST /auth/login. 401 con el mismo mensaje para credenciales incorrectas y cuentas bloqueadas. */
  login(req: LoginRequest): Observable<TokenResponse> {
    const cuerpo: LoginRequest = {
      email: req.email,
      password: req.password,
      mantenerSesion: req.mantenerSesion === true,
    };
    return this.http
      .post<TokenResponse>(`${this.url}/login`, cuerpo, { withCredentials: true })
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  /** POST /auth/registro. Responde siempre 202 con el mismo mensaje (§2.4). */
  registrar(req: RegistroRequest): Observable<MensajeResponse> {
    const cuerpo: RegistroRequest = {
      nombre: req.nombre,
      email: req.email,
      password: req.password,
      mayorDeEdad: req.mayorDeEdad === true,
      aceptaTerminos: req.aceptaTerminos === true,
      consentimientoSalud: req.consentimientoSalud === true,
    };
    return this.http.post<MensajeResponse>(`${this.url}/registro`, cuerpo);
  }

  /**
   * POST /auth/verificar-email (204). Sirve para el registro y para el cambio de email. Si hay
   * sesión, conviene recargar la cuenta después (emailVerificado o el email nuevo).
   */
  verificarEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.url}/verificar-email`, { token });
  }

  /** POST /auth/reenviar-verificacion. Siempre 202 con el mismo mensaje. */
  reenviarVerificacion(email: string): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.url}/reenviar-verificacion`, { email });
  }

  /** POST /auth/recuperar-password. Siempre 202 con el mismo mensaje. */
  recuperarPassword(email: string): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.url}/recuperar-password`, { email });
  }

  /**
   * POST /auth/restablecer-password (204). El backend cierra todas las sesiones del usuario, así
   * que también se limpia la local (§2.1): hay que volver a iniciar sesión.
   */
  restablecerPassword(token: string, nuevaPassword: string): Observable<void> {
    return this.http
      .post<void>(`${this.url}/restablecer-password`, { token, nuevaPassword })
      .pipe(tap(() => this.cerrarSesionLocal()));
  }

  /**
   * POST /auth/refresh: renueva el access token con la cookie y guarda la sesión. Si ya hay uno en
   * curso, devuelve el mismo Observable, así que nunca salen dos a la vez. Con 401/403 (cookie
   * caducada, revocada u Origin no permitido) limpia la sesión local y propaga el error.
   */
  refrescar(): Observable<TokenResponse> {
    if (!this.refreshEnCurso) {
      const generacion = this.generacion;
      const compartido: Observable<TokenResponse> = this.http
        .post<TokenResponse>(`${this.url}/refresh`, null, { withCredentials: true })
        .pipe(
          tap({
            next: (respuesta) => {
              if (generacion === this.generacion) this.guardarSesion(respuesta);
            },
            error: (error: unknown) => {
              const sinSesion = esSinSesion(error);
              if (sinSesion && generacion === this.generacion) this.limpiarEstado();
            },
          }),
          // Al terminar (bien o mal), la siguiente llamada hará una petición nueva. Solo se borra a
          // sí mismo: si se cerró la sesión entretanto, puede haber ya otro refresh en curso.
          finalize(() => {
            if (this.refreshEnCurso === compartido) this.refreshEnCurso = null;
          }),
          // Sin refCount: aunque todos se desuscriban, la petición sigue (la cookie ya puede haber rotado).
          shareReplay(1),
        );
      this.refreshEnCurso = compartido;
    }
    return this.refreshEnCurso;
  }

  /**
   * Arranque de la aplicación (provideAppInitializer): intenta recuperar la sesión con la cookie.
   * Sin sesión (401) no es un error. Tampoco bloquea el arranque si el backend no responde: la
   * aplicación arranca sin sesión.
   */
  async restaurarSesion(): Promise<void> {
    try {
      await firstValueFrom(this.refrescar());
    } catch (error) {
      this.limpiarEstado();
      if (!esSinSesion(error)) {
        console.warn('No se ha podido restaurar la sesión', error);
      }
    }
  }

  /**
   * POST /auth/logout (borra la cookie), limpia el estado y navega a /login. Los errores del
   * backend se ignoran: la sesión local se cierra igual. Devuelve true si el backend lo confirmó.
   */
  async logout(): Promise<boolean> {
    return this.cerrarEn(`${this.url}/logout`);
  }

  /** POST /auth/logout-todas (necesita el token) y después lo mismo que logout(). */
  async logoutTodas(): Promise<boolean> {
    return this.cerrarEn(`${this.url}/logout-todas`);
  }

  /**
   * Limpia la sesión en memoria sin llamar al backend ni navegar (p. ej. tras cambiar la
   * contraseña, que ya cierra todas las sesiones en el servidor).
   */
  cerrarSesionLocal(): void {
    this.generacion++;
    this.refreshEnCurso = null;
    this.limpiarEstado();
  }

  /** Para cuando otra pantalla cambia la cuenta (GET o PATCH /cuenta). */
  actualizarCuenta(cuenta: CuentaResponse): void {
    this.cuentaActual.set(cuenta);
  }

  private async cerrarEn(url: string): Promise<boolean> {
    const confirmado = await firstValueFrom(
      this.http.post<void>(url, null, { withCredentials: true }).pipe(
        map(() => true),
        catchError(() => of(false)),
      ),
    );
    this.cerrarSesionLocal();
    await this.router.navigateByUrl('/login');
    return confirmado;
  }

  private guardarSesion(respuesta: TokenResponse): void {
    this.token.set(respuesta.accessToken);
    this.expiraEn.set(Date.now() + respuesta.expiraEn * 1000);
    this.cuentaActual.set(respuesta.cuenta);
  }

  private limpiarEstado(): void {
    this.token.set(null);
    this.expiraEn.set(null);
    this.cuentaActual.set(null);
    // Lo que se sabía del perfil es del usuario que se va.
    this.perfil.limpiar();
  }
}

/**
 * 401 o 403 del refresh: la cookie no vale (caducada, revocada u Origin no permitido). Llega como
 * HttpErrorResponse o, si ha pasado por errorInterceptor, como ApiError.
 */
function esSinSesion(error: unknown): boolean {
  const estado = estadoHttp(error);
  return estado === 401 || estado === 403;
}
