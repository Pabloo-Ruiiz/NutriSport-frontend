import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import type { CuentaResponse, LoginRequest, TokenResponse } from '../models';
import { AuthService } from './auth.service';

const CUENTA: CuentaResponse = {
  id: '0193a3f2-7c1e-7a4b-9f00-1a2b3c4d5e6f',
  nombre: 'Ana',
  email: 'ana@correo.com',
  roles: ['DEPORTISTA'],
  estado: 'ACTIVO',
  emailVerificado: true,
  consentimientoSaludVigente: true,
  unidades: 'METRICO',
  insightsActivos: true,
};

function token(accessToken: string, cuenta: Partial<CuentaResponse> = {}): TokenResponse {
  return { accessToken, tipo: 'Bearer', expiraEn: 900, cuenta: { ...CUENTA, ...cuenta } };
}

const NO_AUTENTICADO = {
  type: 'urn:nutrisport:error:no_autenticado',
  title: 'No autenticado',
  status: 401,
  detail: 'La sesión ha caducado',
  instance: '/api/v1/auth/refresh',
  codigo: 'NO_AUTENTICADO',
  errors: [],
};

@Component({ template: '' })
class PaginaVacia {}

describe('AuthService', () => {
  let servicio: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: PaginaVacia }]),
      ],
    });
    servicio = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('empieza sin sesión', () => {
    expect(servicio.autenticado()).toBe(false);
    expect(servicio.tokenActual()).toBeNull();
    expect(servicio.cuenta()).toBeNull();
    expect(servicio.esAdmin()).toBe(false);
  });

  describe('login', () => {
    it('guarda el token y la cuenta en memoria y nunca en el almacenamiento del navegador', () => {
      const antes = Date.now();
      let respuesta: TokenResponse | undefined;
      servicio
        .login({ email: 'ana@correo.com', password: 'secreta1234', mantenerSesion: true })
        .subscribe((r) => (respuesta = r));

      const peticion = http.expectOne('/api/v1/auth/login');
      expect(peticion.request.method).toBe('POST');
      expect(peticion.request.withCredentials).toBe(true);
      peticion.flush(token('jwt-1', { roles: ['DEPORTISTA', 'ADMIN'] }));

      expect(respuesta?.accessToken).toBe('jwt-1');
      expect(servicio.tokenActual()).toBe('jwt-1');
      expect(servicio.autenticado()).toBe(true);
      expect(servicio.esAdmin()).toBe(true);
      expect(servicio.emailVerificado()).toBe(true);
      expect(servicio.consentimientoVigente()).toBe(true);
      expect(servicio.caducaEn()).toBeGreaterThanOrEqual(antes + 900_000);
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });

    it('envía siempre mantenerSesion y solo los campos de LoginRequest', () => {
      const conExtras = {
        email: 'ana@correo.com',
        password: 'secreta1234',
        recordarEmail: true,
      } as unknown as LoginRequest;
      servicio.login(conExtras).subscribe({ error: () => {} });

      const peticion = http.expectOne('/api/v1/auth/login');
      expect(peticion.request.body).toEqual({
        email: 'ana@correo.com',
        password: 'secreta1234',
        mantenerSesion: false,
      });
      peticion.flush(
        { ...NO_AUTENTICADO, detail: 'Email o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );
      expect(servicio.autenticado()).toBe(false);
    });
  });

  describe('refrescar', () => {
    it('llamado dos veces seguidas hace una sola petición y ambos reciben la respuesta', () => {
      const recibidos: string[] = [];
      servicio.refrescar().subscribe((r) => recibidos.push(`a:${r.accessToken}`));
      servicio.refrescar().subscribe((r) => recibidos.push(`b:${r.accessToken}`));

      const peticion = http.expectOne('/api/v1/auth/refresh');
      expect(peticion.request.withCredentials).toBe(true);
      peticion.flush(token('jwt-2'));

      expect(recibidos).toEqual(['a:jwt-2', 'b:jwt-2']);
      expect(servicio.tokenActual()).toBe('jwt-2');
    });

    it('al terminar, la siguiente llamada hace una petición nueva', () => {
      servicio.refrescar().subscribe();
      http.expectOne('/api/v1/auth/refresh').flush(token('jwt-2'));

      servicio.refrescar().subscribe();
      http.expectOne('/api/v1/auth/refresh').flush(token('jwt-3'));
      expect(servicio.tokenActual()).toBe('jwt-3');
    });

    it('con 401 limpia la sesión y propaga el error', () => {
      servicio.login({ email: 'ana@correo.com', password: 'secreta1234', mantenerSesion: false }).subscribe();
      http.expectOne('/api/v1/auth/login').flush(token('jwt-1'));

      let error: unknown;
      servicio.refrescar().subscribe({ error: (e) => (error = e) });
      http.expectOne('/api/v1/auth/refresh').flush(NO_AUTENTICADO, { status: 401, statusText: 'Unauthorized' });

      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect(servicio.autenticado()).toBe(false);
    });

    it('un refresh que responde después de cerrar la sesión no la vuelve a abrir', () => {
      servicio.refrescar().subscribe();
      const peticion = http.expectOne('/api/v1/auth/refresh');
      servicio.cerrarSesionLocal();
      peticion.flush(token('jwt-tarde'));
      expect(servicio.autenticado()).toBe(false);
    });
  });

  describe('restaurarSesion', () => {
    it('con 401 deja autenticado() en false sin lanzar error', async () => {
      const promesa = servicio.restaurarSesion();
      http.expectOne('/api/v1/auth/refresh').flush(NO_AUTENTICADO, { status: 401, statusText: 'Unauthorized' });

      await expect(promesa).resolves.toBeUndefined();
      expect(servicio.autenticado()).toBe(false);
    });

    it('con 200 recupera la sesión', async () => {
      const promesa = servicio.restaurarSesion();
      http.expectOne('/api/v1/auth/refresh').flush(token('jwt-restaurado'));
      await promesa;
      expect(servicio.autenticado()).toBe(true);
      expect(servicio.cuenta()?.nombre).toBe('Ana');
    });

    it('sin conexión arranca sin sesión y sin lanzar error', async () => {
      const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const promesa = servicio.restaurarSesion();
      http.expectOne('/api/v1/auth/refresh').error(new ProgressEvent('error'));
      await expect(promesa).resolves.toBeUndefined();
      expect(servicio.autenticado()).toBe(false);
      expect(aviso).toHaveBeenCalled();
      aviso.mockRestore();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      servicio.login({ email: 'ana@correo.com', password: 'secreta1234', mantenerSesion: false }).subscribe();
      http.expectOne('/api/v1/auth/login').flush(token('jwt-1'));
    });

    it('llama al backend, limpia el estado y navega a /login', async () => {
      const promesa = servicio.logout();
      const peticion = http.expectOne('/api/v1/auth/logout');
      expect(peticion.request.method).toBe('POST');
      peticion.flush(null, { status: 204, statusText: 'No Content' });

      expect(await promesa).toBe(true);
      expect(servicio.autenticado()).toBe(false);
      expect(TestBed.inject(Router).url).toBe('/login');
    });

    it('ignora los errores del backend y cierra igualmente', async () => {
      const promesa = servicio.logoutTodas();
      http.expectOne('/api/v1/auth/logout-todas').error(new ProgressEvent('error'));

      expect(await promesa).toBe(false);
      expect(servicio.autenticado()).toBe(false);
      expect(TestBed.inject(Router).url).toBe('/login');
    });

    it('cerrarSesionLocal no llama al backend', () => {
      servicio.cerrarSesionLocal();
      expect(servicio.tokenActual()).toBeNull();
      http.expectNone('/api/v1/auth/logout');
    });
  });

  it('restablecerPassword cierra la sesión local al terminar', () => {
    servicio.login({ email: 'ana@correo.com', password: 'secreta1234', mantenerSesion: false }).subscribe();
    http.expectOne('/api/v1/auth/login').flush(token('jwt-1'));

    servicio.restablecerPassword('tok', 'nuevaClave2026').subscribe();
    const peticion = http.expectOne('/api/v1/auth/restablecer-password');
    expect(peticion.request.body).toEqual({ token: 'tok', nuevaPassword: 'nuevaClave2026' });
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    expect(servicio.autenticado()).toBe(false);
  });

  it('registrar envía los tres booleanos aunque falten', () => {
    servicio
      .registrar({ nombre: 'Ana', email: 'ana@correo.com', password: 'secreta1234', mayorDeEdad: true } as never)
      .subscribe();
    const peticion = http.expectOne('/api/v1/auth/registro');
    expect(peticion.request.body).toEqual({
      nombre: 'Ana',
      email: 'ana@correo.com',
      password: 'secreta1234',
      mayorDeEdad: true,
      aceptaTerminos: false,
      consentimientoSalud: false,
    });
    peticion.flush(
      { mensaje: 'Si los datos son correctos, te hemos enviado un correo' },
      { status: 202, statusText: 'Accepted' },
    );
  });

  it('actualizarCuenta cambia la cuenta y sus signals derivados', () => {
    servicio.login({ email: 'ana@correo.com', password: 'secreta1234', mantenerSesion: false }).subscribe();
    http.expectOne('/api/v1/auth/login').flush(token('jwt-1', { emailVerificado: false }));
    expect(servicio.emailVerificado()).toBe(false);

    servicio.actualizarCuenta({ ...CUENTA, emailVerificado: true, consentimientoSaludVigente: false });
    expect(servicio.emailVerificado()).toBe(true);
    expect(servicio.consentimientoVigente()).toBe(false);
  });
});
