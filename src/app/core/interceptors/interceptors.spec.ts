import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { CuentaResponse, TokenResponse } from '../models';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../util/api-error';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

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

const sesion = (accessToken: string): TokenResponse => ({ accessToken, tipo: 'Bearer', expiraEn: 900, cuenta: CUENTA });

function problema(status: number, codigo: string, detail: string, errors: { campo: string; mensaje: string }[] = []) {
  return {
    body: {
      type: `urn:nutrisport:error:${codigo.toLowerCase()}`,
      title: codigo,
      status,
      detail,
      instance: '',
      codigo,
      errors,
    },
    opciones: { status, statusText: String(status) },
  };
}

const NO_AUTENTICADO = problema(401, 'NO_AUTENTICADO', 'La sesión ha caducado');

@Component({ template: '' })
class Pagina {}

describe('authInterceptor + errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  /** Inicia sesión con el token indicado (el login es público: no lleva cabecera). */
  function iniciarSesion(token = 'jwt-1'): void {
    auth.login({ email: 'ana@correo.com', password: 'secreta1234', mantenerSesion: false }).subscribe();
    backend.expectOne('/api/v1/auth/login').flush(sesion(token));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: Pagina },
          { path: 'diario', component: Pagina },
        ]),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => backend.verify());

  describe('cabecera Authorization', () => {
    it('la añade a las peticiones de la API si hay token', () => {
      iniciarSesion();
      http.get('/api/v1/comidas?fecha=2026-11-25').subscribe();
      const peticion = backend.expectOne('/api/v1/comidas?fecha=2026-11-25');
      expect(peticion.request.headers.get('Authorization')).toBe('Bearer jwt-1');
      peticion.flush([]);
    });

    it('no la añade a /auth/login ni a las demás rutas públicas', () => {
      iniciarSesion();

      auth.login({ email: 'ana@correo.com', password: 'otra', mantenerSesion: false }).subscribe();
      const login = backend.expectOne('/api/v1/auth/login');
      expect(login.request.headers.has('Authorization')).toBe(false);
      login.flush(sesion('jwt-1'));

      http.post('/api/v1/auth/recuperar-password', { email: 'ana@correo.com' }).subscribe();
      const recuperar = backend.expectOne('/api/v1/auth/recuperar-password');
      expect(recuperar.request.headers.has('Authorization')).toBe(false);
      recuperar.flush({ mensaje: 'ok' });
    });

    it('sí la añade a /auth/logout-todas, que es protegida', () => {
      iniciarSesion();
      void auth.logoutTodas();
      const peticion = backend.expectOne('/api/v1/auth/logout-todas');
      expect(peticion.request.headers.get('Authorization')).toBe('Bearer jwt-1');
      peticion.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('no toca las URL que no son de la API', () => {
      iniciarSesion();
      http.get('https://world.openfoodfacts.org/api/v2/product/123').subscribe();
      const externa = backend.expectOne('https://world.openfoodfacts.org/api/v2/product/123');
      expect(externa.request.headers.has('Authorization')).toBe(false);
      externa.flush({});

      http.get('/api/v1x/otra').subscribe();
      const parecida = backend.expectOne('/api/v1x/otra');
      expect(parecida.request.headers.has('Authorization')).toBe(false);
      parecida.flush({});
    });

    it('sin token no añade la cabecera', () => {
      http.get('/api/v1/catalogo/categorias').subscribe();
      const peticion = backend.expectOne('/api/v1/catalogo/categorias');
      expect(peticion.request.headers.has('Authorization')).toBe(false);
      peticion.flush([]);
    });
  });

  describe('401 y refresh', () => {
    it('ante dos 401 simultáneos hace un solo refresh y repite las dos peticiones con el token nuevo', async () => {
      iniciarSesion('jwt-caducado');
      const comidas = firstValueFrom(http.get<string[]>('/api/v1/comidas'));
      const perfil = firstValueFrom(http.get<{ nombre: string }>('/api/v1/perfil'));

      backend.expectOne('/api/v1/comidas').flush(NO_AUTENTICADO.body, NO_AUTENTICADO.opciones);
      backend.expectOne('/api/v1/perfil').flush(NO_AUTENTICADO.body, NO_AUTENTICADO.opciones);

      // Un único refresh, sin cabecera (es público).
      const refresh = backend.expectOne('/api/v1/auth/refresh');
      expect(refresh.request.headers.has('Authorization')).toBe(false);
      refresh.flush(sesion('jwt-nuevo'));

      const reintentos = [backend.expectOne('/api/v1/comidas'), backend.expectOne('/api/v1/perfil')];
      for (const reintento of reintentos) {
        expect(reintento.request.headers.get('Authorization')).toBe('Bearer jwt-nuevo');
      }
      reintentos[0].flush(['desayuno']);
      reintentos[1].flush({ nombre: 'Ana' });

      expect(await comidas).toEqual(['desayuno']);
      expect(await perfil).toEqual({ nombre: 'Ana' });
      expect(auth.tokenActual()).toBe('jwt-nuevo');
    });

    it('si el refresh da 401, cierra la sesión, navega a /login?volver= y propaga el error', async () => {
      iniciarSesion();
      await router.navigateByUrl('/diario');

      const resultado = firstValueFrom(http.get('/api/v1/comidas')).catch((e: unknown) => e);
      backend.expectOne('/api/v1/comidas').flush(NO_AUTENTICADO.body, NO_AUTENTICADO.opciones);
      backend.expectOne('/api/v1/auth/refresh').flush(NO_AUTENTICADO.body, NO_AUTENTICADO.opciones);

      const error = await resultado;
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).codigo).toBe('NO_AUTENTICADO');
      expect(auth.autenticado()).toBe(false);

      await new Promise((resolver) => setTimeout(resolver));
      expect(router.url).toBe('/login?volver=%2Fdiario');
    });

    it('repite la petición una sola vez: si vuelve a dar 401, el error llega sin otro refresh', async () => {
      iniciarSesion();
      const resultado = firstValueFrom(http.get('/api/v1/comidas')).catch((e: unknown) => e);

      backend.expectOne('/api/v1/comidas').flush(NO_AUTENTICADO.body, NO_AUTENTICADO.opciones);
      backend.expectOne('/api/v1/auth/refresh').flush(sesion('jwt-nuevo'));
      backend.expectOne('/api/v1/comidas').flush(NO_AUTENTICADO.body, NO_AUTENTICADO.opciones);

      const error = (await resultado) as ApiError;
      expect(error.status).toBe(401);
      backend.expectNone('/api/v1/auth/refresh');
    });

    it('un 401 en una ruta pública (login incorrecto) no intenta el refresh', async () => {
      const resultado = firstValueFrom(
        auth.login({ email: 'ana@correo.com', password: 'mala', mantenerSesion: false }),
      ).catch((e: unknown) => e);
      const credenciales = problema(401, 'NO_AUTENTICADO', 'Email o contraseña incorrectos');
      backend.expectOne('/api/v1/auth/login').flush(credenciales.body, credenciales.opciones);

      const error = (await resultado) as ApiError;
      expect(error.detalle).toBe('Email o contraseña incorrectos');
      backend.expectNone('/api/v1/auth/refresh');
    });

    it('restaurarSesion con 401 sigue sin lanzar error al pasar por los interceptores', async () => {
      const promesa = auth.restaurarSesion();
      backend.expectOne('/api/v1/auth/refresh').flush(NO_AUTENTICADO.body, NO_AUTENTICADO.opciones);
      await expect(promesa).resolves.toBeUndefined();
      expect(auth.autenticado()).toBe(false);
    });
  });

  describe('errorInterceptor', () => {
    it('un 400 llega como ApiError con sus errores[]', async () => {
      iniciarSesion();
      const resultado = firstValueFrom(http.post('/api/v1/comidas', {})).catch((e: unknown) => e);
      const validacion = problema(400, 'VALIDACION', 'Los datos enviados no son válidos', [
        { campo: 'alimentos[0].cantidad', mensaje: 'Debe ser mayor que 0' },
      ]);
      backend.expectOne('/api/v1/comidas').flush(validacion.body, validacion.opciones);

      const error = (await resultado) as ApiError;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.codigo).toBe('VALIDACION');
      expect(error.errores).toEqual([{ campo: 'alimentos[0].cantidad', mensaje: 'Debe ser mayor que 0' }]);
    });

    it('sin conexión llega como ApiError SIN_CONEXION', async () => {
      const resultado = firstValueFrom(http.get('/api/v1/catalogo/categorias')).catch((e: unknown) => e);
      backend.expectOne('/api/v1/catalogo/categorias').error(new ProgressEvent('error'));
      expect(((await resultado) as ApiError).codigo).toBe('SIN_CONEXION');
    });

    it('un 403 CONSENTIMIENTO_REVOCADO marca la cuenta sin consentimiento', async () => {
      iniciarSesion();
      expect(auth.consentimientoVigente()).toBe(true);

      const resultado = firstValueFrom(http.get('/api/v1/perfil')).catch((e: unknown) => e);
      const revocado = problema(403, 'CONSENTIMIENTO_REVOCADO', 'Has revocado el consentimiento');
      backend.expectOne('/api/v1/perfil').flush(revocado.body, revocado.opciones);

      expect(((await resultado) as ApiError).codigo).toBe('CONSENTIMIENTO_REVOCADO');
      expect(auth.consentimientoVigente()).toBe(false);
      expect(auth.autenticado()).toBe(true);
    });

    it('con responseType blob lee el Problem Details del Blob', async () => {
      iniciarSesion();
      const resultado = firstValueFrom(http.get('/api/v1/cuenta/exportacion', { responseType: 'blob' })).catch(
        (e: unknown) => e,
      );
      const noVerificado = problema(403, 'EMAIL_NO_VERIFICADO', 'Verifica tu email');
      backend
        .expectOne('/api/v1/cuenta/exportacion')
        .flush(new Blob([JSON.stringify(noVerificado.body)]), noVerificado.opciones);

      const error = (await resultado) as ApiError;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.codigo).toBe('EMAIL_NO_VERIFICADO');
      expect(error.detalle).toBe('Verifica tu email');
    });
  });
});
