import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { CuentaResponse, TokenResponse } from '../models';
import { AuthService } from './auth.service';
import { CuentaService } from './cuenta.service';

@Component({ template: '' })
class Vacia {}

const CUENTA: CuentaResponse = {
  id: '0193a3f2-7c1e-7a4b-9f00-1a2b3c4d5e6f',
  nombre: 'Ana López',
  email: 'ana@correo.com',
  roles: ['DEPORTISTA'],
  estado: 'ACTIVO',
  emailVerificado: true,
  consentimientoSaludVigente: true,
  unidades: 'METRICO',
  insightsActivos: true,
};

let servicio: CuentaService;
let auth: AuthService;
let http: HttpTestingController;

beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', component: Vacia }])],
  });
  servicio = TestBed.inject(CuentaService);
  auth = TestBed.inject(AuthService);
  http = TestBed.inject(HttpTestingController);

  // Sesión abierta con la cuenta de prueba.
  const login = firstValueFrom(auth.login({ email: CUENTA.email, password: 'x', mantenerSesion: false }));
  const token: TokenResponse = { accessToken: 'abc', tipo: 'Bearer', expiraEn: 900, cuenta: CUENTA };
  http.expectOne('/api/v1/auth/login').flush(token);
  await login;
});

afterEach(() => http.verify());

describe('CuentaService', () => {
  it('obtener() hace GET /cuenta y actualiza AuthService', async () => {
    const promesa = firstValueFrom(servicio.obtener());
    http.expectOne({ method: 'GET', url: '/api/v1/cuenta' }).flush({ ...CUENTA, emailVerificado: false });
    expect((await promesa).emailVerificado).toBe(false);
    expect(auth.emailVerificado()).toBe(false);
  });

  describe('actualizar()', () => {
    it('envía en PATCH solo los campos que cambian y actualiza AuthService', async () => {
      const promesa = firstValueFrom(
        servicio.actualizar({ nombre: ' Ana López ', unidades: 'METRICO', insightsActivos: false }),
      );
      const peticion = http.expectOne({ method: 'PATCH', url: '/api/v1/cuenta' });
      expect(peticion.request.body).toStrictEqual({ insightsActivos: false });
      peticion.flush({ ...CUENTA, insightsActivos: false });
      await promesa;
      expect(auth.cuenta()?.insightsActivos).toBe(false);
    });

    it('envía false cuando se desactivan los insights y el nombre recortado', () => {
      servicio.actualizar({ nombre: '  Ana María ', insightsActivos: false }).subscribe();
      expect(http.expectOne('/api/v1/cuenta').request.body).toStrictEqual({
        nombre: 'Ana María',
        insightsActivos: false,
      });
    });

    it('sin cambios no llama y devuelve la cuenta actual', async () => {
      expect(await firstValueFrom(servicio.actualizar({ nombre: 'Ana López', unidades: 'METRICO' }))).toEqual(CUENTA);
      http.expectNone('/api/v1/cuenta');
    });
  });

  it('cambiarPassword() hace PUT /cuenta/password y cierra la sesión local', async () => {
    const promesa = firstValueFrom(
      servicio.cambiarPassword({ passwordActual: 'vieja1234', nuevaPassword: 'Nueva#12345', extra: 1 } as never),
    );
    const peticion = http.expectOne({ method: 'PUT', url: '/api/v1/cuenta/password' });
    expect(peticion.request.body).toStrictEqual({ passwordActual: 'vieja1234', nuevaPassword: 'Nueva#12345' });
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    await promesa;
    expect(auth.autenticado()).toBe(false);
  });

  it('cambiarPassword() con la contraseña actual incorrecta no cierra la sesión', async () => {
    const promesa = firstValueFrom(servicio.cambiarPassword({ passwordActual: 'mal', nuevaPassword: 'Nueva#12345' }));
    http
      .expectOne('/api/v1/cuenta/password')
      .flush(
        { codigo: 'VALIDACION', errors: [{ campo: 'passwordActual', mensaje: 'La contraseña no es correcta' }] },
        { status: 400, statusText: 'Bad Request' },
      );
    await expect(promesa).rejects.toMatchObject({ status: 400 });
    expect(auth.autenticado()).toBe(true);
  });

  it('cambiarEmail() hace PUT /cuenta/email y no cambia la cuenta hasta verificar', async () => {
    const promesa = firstValueFrom(servicio.cambiarEmail({ nuevoEmail: ' nuevo@correo.com ', password: 'x' }));
    const peticion = http.expectOne({ method: 'PUT', url: '/api/v1/cuenta/email' });
    expect(peticion.request.body).toStrictEqual({ nuevoEmail: 'nuevo@correo.com', password: 'x' });
    peticion.flush({ mensaje: 'Revisa tu email' }, { status: 202, statusText: 'Accepted' });
    expect(await promesa).toEqual({ mensaje: 'Revisa tu email' });
    expect(auth.cuenta()?.email).toBe('ana@correo.com');
  });

  it('revocarConsentimiento() hace DELETE y después vuelve a pedir la cuenta', async () => {
    const promesa = firstValueFrom(servicio.revocarConsentimiento());
    http
      .expectOne({ method: 'DELETE', url: '/api/v1/cuenta/consentimiento-salud' })
      .flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne({ method: 'GET', url: '/api/v1/cuenta' }).flush({ ...CUENTA, consentimientoSaludVigente: false });
    expect((await promesa).consentimientoSaludVigente).toBe(false);
    expect(auth.consentimientoVigente()).toBe(false);
  });

  it('darConsentimiento() hace POST y después vuelve a pedir la cuenta', async () => {
    auth.actualizarCuenta({ ...CUENTA, consentimientoSaludVigente: false });
    const promesa = firstValueFrom(servicio.darConsentimiento());
    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/cuenta/consentimiento-salud' });
    expect(peticion.request.body).toBeNull();
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne({ method: 'GET', url: '/api/v1/cuenta' }).flush(CUENTA);
    await promesa;
    expect(auth.consentimientoVigente()).toBe(true);
  });

  it('si falla el consentimiento no recarga la cuenta', async () => {
    const promesa = firstValueFrom(servicio.darConsentimiento());
    http.expectOne('/api/v1/cuenta/consentimiento-salud').flush(null, { status: 500, statusText: 'Error' });
    await expect(promesa).rejects.toMatchObject({ status: 500 });
    http.expectNone('/api/v1/cuenta');
  });

  describe('eliminar()', () => {
    it('envía { password, inmediata } en el cuerpo de un DELETE y cierra la sesión local', async () => {
      const promesa = firstValueFrom(servicio.eliminar({ password: 'secreta1234', inmediata: true }));
      const peticion = http.expectOne({ method: 'DELETE', url: '/api/v1/cuenta' });
      expect(peticion.request.body).toStrictEqual({ password: 'secreta1234', inmediata: true });
      peticion.flush(null, { status: 204, statusText: 'No Content' });
      await promesa;
      expect(auth.autenticado()).toBe(false);
    });

    it('envía siempre inmediata, false si no viene', () => {
      servicio.eliminar({ password: 'secreta1234' } as never).subscribe();
      expect(http.expectOne({ method: 'DELETE', url: '/api/v1/cuenta' }).request.body).toStrictEqual({
        password: 'secreta1234',
        inmediata: false,
      });
    });
  });
});
