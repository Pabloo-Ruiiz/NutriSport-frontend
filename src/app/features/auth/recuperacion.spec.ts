import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import type { CuentaResponse, TokenResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { MENSAJE_RECUPERACION, RecuperarPasswordComponent } from './recuperar/recuperar-password.component';
import { RestablecerPasswordComponent } from './recuperar/restablecer-password.component';
import { VerificarEmailComponent } from './verificar-email/verificar-email.component';

@Component({ template: '<p>Destino</p>' })
class Destino {}

const CUENTA: CuentaResponse = {
  id: '0193a3f2-7c1e-7a4b-9f00-1a2b3c4d5e6f',
  nombre: 'Ana',
  email: 'ana@correo.com',
  roles: ['DEPORTISTA'],
  estado: 'ACTIVO',
  emailVerificado: false,
  consentimientoSaludVigente: true,
  unidades: 'METRICO',
  insightsActivos: true,
};

function problema(status: number, codigo: string, detail: string, errors: { campo: string; mensaje: string }[] = []) {
  return {
    cuerpo: { type: `urn:nutrisport:error:${codigo.toLowerCase()}`, title: codigo, status, detail, codigo, errors },
    opciones: { status, statusText: String(status) },
  };
}

let harness: RouterTestingHarness;
let http: HttpTestingController;

beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter(
        [
          { path: 'verificar-email', component: VerificarEmailComponent },
          { path: 'recuperar-password', component: RecuperarPasswordComponent },
          { path: 'restablecer-password', component: RestablecerPasswordComponent },
          { path: '**', component: Destino },
        ],
        withComponentInputBinding(),
      ),
      provideLucideIcons(...ICONOS_APP),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  harness = await RouterTestingHarness.create();
});

afterEach(() => http.verify());

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const url = () => TestBed.inject(Router).url;
const estable = () => harness.fixture.whenStable();

async function tras(accion: () => void): Promise<void> {
  accion();
  await estable();
  await new Promise((resolver) => setTimeout(resolver));
  await estable();
}

function escribir(input: Element, valor: string): void {
  (input as HTMLInputElement).value = valor;
  input.dispatchEvent(new Event('input'));
}

/** Abre una sesión real en AuthService (login contra HttpTestingController). */
async function iniciarSesion(): Promise<void> {
  const auth = TestBed.inject(AuthService);
  const promesa = new Promise<void>((resolver) =>
    auth.login({ email: CUENTA.email, password: 'x', mantenerSesion: false }).subscribe(() => resolver()),
  );
  const token: TokenResponse = { accessToken: 'abc', tipo: 'Bearer', expiraEn: 900, cuenta: CUENTA };
  http.expectOne('/api/v1/auth/login').flush(token);
  await promesa;
}

describe('VerificarEmailComponent', () => {
  it('sin sesión: verifica el token del fragmento y ofrece iniciar sesión', async () => {
    await harness.navigateByUrl('/verificar-email#token=abc%2B1');
    expect(raiz().textContent).toContain('Comprobando el enlace');
    expect(location.hash).toBe('');

    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/auth/verificar-email' });
    expect(peticion.request.body).toEqual({ token: 'abc+1' });
    await tras(() => peticion.flush(null, { status: 204, statusText: 'No Content' }));

    expect(raiz().textContent).toContain('Email verificado');
    expect(raiz().querySelector('a[href="/login"]')?.textContent).toContain('Iniciar sesión');
    http.expectNone('/api/v1/cuenta');
  });

  it('con sesión: refresca la cuenta y ofrece ir al panel', async () => {
    await iniciarSesion();
    await harness.navigateByUrl('/verificar-email#token=abc');
    await tras(() =>
      http.expectOne('/api/v1/auth/verificar-email').flush(null, { status: 204, statusText: 'No Content' }),
    );

    http.expectOne({ method: 'GET', url: '/api/v1/cuenta' }).flush({ ...CUENTA, emailVerificado: true });
    expect(TestBed.inject(AuthService).emailVerificado()).toBe(true);
    expect(raiz().querySelector('a[href="/inicio"]')?.textContent).toContain('Ir a mi panel');
  });

  it('TOKEN_NO_VALIDO: enlace caducado con formulario para reenviar', async () => {
    await harness.navigateByUrl('/verificar-email#token=viejo');
    const { cuerpo, opciones } = problema(400, 'TOKEN_NO_VALIDO', 'El enlace no es válido');
    await tras(() => http.expectOne('/api/v1/auth/verificar-email').flush(cuerpo, opciones));

    expect(raiz().textContent).toContain('El enlace ha caducado o ya se ha usado');
    escribir(raiz().querySelector('input[type=email]')!, 'ana@correo.com');
    (raiz().querySelector('app-reenviar-verificacion button') as HTMLButtonElement).click();
    const reenvio = http.expectOne('/api/v1/auth/reenviar-verificacion');
    expect(reenvio.request.body).toEqual({ email: 'ana@correo.com' });
    await tras(() => reenvio.flush({ mensaje: 'ok' }, { status: 202, statusText: 'Accepted' }));
    expect(
      TestBed.inject(NsToastService)
        .visibles()
        .map((t) => t.titulo),
    ).toEqual(['Enlace reenviado']);
  });

  it('EMAIL_EN_USO: el email nuevo ya lo usa otra cuenta', async () => {
    await harness.navigateByUrl('/verificar-email#token=cambio');
    const { cuerpo, opciones } = problema(409, 'EMAIL_EN_USO', 'El email ya está en uso');
    await tras(() => http.expectOne('/api/v1/auth/verificar-email').flush(cuerpo, opciones));
    expect(raiz().textContent).toContain('Ese email ya está en uso por otra cuenta');
  });

  it('otro error: muestra el mensaje y permite reintentar con el mismo token', async () => {
    await harness.navigateByUrl('/verificar-email#token=abc');
    await tras(() => http.expectOne('/api/v1/auth/verificar-email').flush(null, { status: 0, statusText: '' }));
    expect(raiz().textContent).toContain('No hay conexión con el servidor');

    (raiz().querySelector('button') as HTMLButtonElement).click();
    await estable();
    expect(http.expectOne('/api/v1/auth/verificar-email').request.body).toEqual({ token: 'abc' });
  });

  it('sin token: enlace incompleto y no llama al servidor', async () => {
    await harness.navigateByUrl('/verificar-email');
    expect(raiz().textContent).toContain('El enlace está incompleto');
    http.expectNone('/api/v1/auth/verificar-email');
  });
});

describe('RecuperarPasswordComponent', () => {
  it('envía el email y muestra siempre el mensaje genérico', async () => {
    await harness.navigateByUrl('/recuperar-password');
    escribir(raiz().querySelector('input[type=email]')!, ' ana@correo.com ');
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    await estable();

    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/auth/recuperar-password' });
    expect(peticion.request.body).toEqual({ email: 'ana@correo.com' });
    await tras(() => peticion.flush({ mensaje: 'texto del servidor' }, { status: 202, statusText: 'Accepted' }));
    expect(raiz().querySelector('ns-alert')?.textContent).toContain(MENSAJE_RECUPERACION);
    expect(raiz().textContent).not.toContain('texto del servidor');
  });

  it('429: tiempo de espera y botón desactivado', async () => {
    await harness.navigateByUrl('/recuperar-password');
    escribir(raiz().querySelector('input[type=email]')!, 'ana@correo.com');
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    await estable();
    const { cuerpo, opciones } = problema(429, 'LIMITE_EXCEDIDO', 'Demasiadas solicitudes');
    await tras(() =>
      http
        .expectOne('/api/v1/auth/recuperar-password')
        .flush(cuerpo, { ...opciones, headers: { 'Retry-After': '3600' } }),
    );
    expect(raiz().querySelector('ns-alert')?.textContent).toContain('Inténtalo de nuevo en 1 hora.');
    expect((raiz().querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('RestablecerPasswordComponent', () => {
  async function rellenarYGuardar(): Promise<void> {
    const [nueva, confirmar] = raiz().querySelectorAll('ns-campo-password input');
    escribir(nueva, 'Zpkm#lwtr9vbnh');
    escribir(confirmar, 'Zpkm#lwtr9vbnh');
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    await estable();
  }

  it('cambia la contraseña, cierra la sesión local, avisa y va a /login', async () => {
    await iniciarSesion();
    await harness.navigateByUrl('/restablecer-password#token=rec');
    expect(raiz().querySelector('ns-password-strength')).not.toBeNull();
    await rellenarYGuardar();

    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/auth/restablecer-password' });
    expect(peticion.request.body).toEqual({ token: 'rec', nuevaPassword: 'Zpkm#lwtr9vbnh' });
    await tras(() => peticion.flush(null, { status: 204, statusText: 'No Content' }));

    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    const toast = TestBed.inject(NsToastService).visibles()[0];
    expect([toast.titulo, toast.mensaje]).toEqual(['Contraseña cambiada', 'Inicia sesión con la nueva.']);
    expect(url()).toBe('/login');
  });

  it('TOKEN_NO_VALIDO: enlace caducado con acceso a /recuperar-password', async () => {
    await harness.navigateByUrl('/restablecer-password#token=viejo');
    await rellenarYGuardar();
    const { cuerpo, opciones } = problema(400, 'TOKEN_NO_VALIDO', 'El enlace no es válido');
    await tras(() => http.expectOne('/api/v1/auth/restablecer-password').flush(cuerpo, opciones));

    expect(raiz().textContent).toContain('El enlace ha caducado o ya se ha usado');
    expect(raiz().querySelector('a[href="/recuperar-password"]')).not.toBeNull();
  });

  it('400 VALIDACION: el error de nuevaPassword va a su campo', async () => {
    await harness.navigateByUrl('/restablecer-password#token=rec');
    await rellenarYGuardar();
    const { cuerpo, opciones } = problema(400, 'VALIDACION', 'Datos no válidos', [
      { campo: 'nuevaPassword', mensaje: 'La contraseña es demasiado común' },
    ]);
    await tras(() => http.expectOne('/api/v1/auth/restablecer-password').flush(cuerpo, opciones));
    expect(raiz().querySelector('ns-form-field')?.textContent).toContain('La contraseña es demasiado común');
  });

  it('no envía si las contraseñas no coinciden', async () => {
    await harness.navigateByUrl('/restablecer-password#token=rec');
    const [nueva, confirmar] = raiz().querySelectorAll('ns-campo-password input');
    escribir(nueva, 'Zpkm#lwtr9vbnh');
    escribir(confirmar, 'Otra#lwtr9vbnh');
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    await estable();
    http.expectNone('/api/v1/auth/restablecer-password');
    expect(raiz().textContent).toContain('Las contraseñas no coinciden.');
  });
});

describe('CuentaService', () => {
  it('obtener() actualiza la cuenta de AuthService', async () => {
    await iniciarSesion();
    let recibida: CuentaResponse | undefined;
    TestBed.inject(CuentaService)
      .obtener()
      .subscribe((cuenta) => (recibida = cuenta));
    http.expectOne({ method: 'GET', url: '/api/v1/cuenta' }).flush({ ...CUENTA, nombre: 'Ana María' });
    expect(recibida?.nombre).toBe('Ana María');
    expect(TestBed.inject(AuthService).cuenta()?.nombre).toBe('Ana María');
  });
});
