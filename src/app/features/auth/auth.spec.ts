import { InteractivityChecker } from '@angular/cdk/a11y';
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
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { LoginComponent, destinoInterno } from './login/login.component';
import { RegistroComponent } from './registro/registro.component';
import { RevisaTuEmailComponent } from './registro/revisa-tu-email.component';

@Component({ template: '<p>Destino</p>' })
class Destino {}

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
const TOKEN: TokenResponse = { accessToken: 'abc', tipo: 'Bearer', expiraEn: 900, cuenta: CUENTA };

function problema(status: number, codigo: string, detail: string, errors: { campo: string; mensaje: string }[] = []) {
  return {
    cuerpo: { type: `urn:nutrisport:error:${codigo.toLowerCase()}`, title: codigo, status, detail, codigo, errors },
    opciones: { status, statusText: String(status) },
  };
}

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
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
          { path: 'login', component: LoginComponent },
          { path: 'registro', component: RegistroComponent },
          { path: 'registro/revisa-tu-email', component: RevisaTuEmailComponent },
          { path: '**', component: Destino },
        ],
        withComponentInputBinding(),
      ),
      provideLucideIcons(...ICONOS_APP),
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  harness = await RouterTestingHarness.create();
});

afterEach(() => {
  http.verify();
  vi.useRealTimers();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const url = () => TestBed.inject(Router).url;
const estable = () => harness.fixture.whenStable();

function escribir(selector: string, valor: string): void {
  const input = raiz().querySelector(selector) as HTMLInputElement;
  input.value = valor;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

function marcar(texto: string): void {
  const casilla = [...raiz().querySelectorAll('ns-checkbox')].find((c) => c.textContent?.includes(texto));
  (casilla!.querySelector('input') as HTMLInputElement).click();
}

async function enviar(): Promise<void> {
  (raiz().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  await estable();
}

/** Espera a que termine lo que dispara la respuesta (await en el componente y navegación). */
async function tras(accion: () => void): Promise<void> {
  accion();
  await estable();
  await new Promise((resolver) => setTimeout(resolver));
  await estable();
}

describe('destinoInterno', () => {
  it('solo acepta rutas internas', () => {
    expect(destinoInterno('/comidas?desde=2026-11-01')).toBe('/comidas?desde=2026-11-01');
    expect(destinoInterno('//malicioso.com')).toBeNull();
    expect(destinoInterno('/\\malicioso.com')).toBeNull();
    expect(destinoInterno('https://malicioso.com')).toBeNull();
    expect(destinoInterno('comidas')).toBeNull();
    expect(destinoInterno('')).toBeNull();
    expect(destinoInterno(undefined)).toBeNull();
  });
});

describe('LoginComponent', () => {
  async function rellenarYEnviar(url = '/login'): Promise<void> {
    await harness.navigateByUrl(url);
    escribir('input[type=email]', ' ana@correo.com ');
    escribir('ns-campo-password input', 'secreta1234');
    await enviar();
  }

  it('envía mantenerSesion=false por defecto y navega a volver', async () => {
    await rellenarYEnviar('/login?volver=%2Fcomidas%3Fdesde%3D2026-11-01');
    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/auth/login' });
    expect(peticion.request.body).toEqual({ email: 'ana@correo.com', password: 'secreta1234', mantenerSesion: false });

    await tras(() => peticion.flush(TOKEN));
    expect(url()).toBe('/comidas?desde=2026-11-01');
  });

  it('envía mantenerSesion=true si se marca y, sin volver, va a /inicio', async () => {
    await harness.navigateByUrl('/login');
    escribir('input[type=email]', 'ana@correo.com');
    escribir('ns-campo-password input', 'secreta1234');
    marcar('Mantener la sesión iniciada');
    await enviar();
    const peticion = http.expectOne('/api/v1/auth/login');
    expect(peticion.request.body.mantenerSesion).toBe(true);

    await tras(() => peticion.flush(TOKEN));
    expect(url()).toBe('/inicio');
  });

  it('ignora un volver externo', async () => {
    await rellenarYEnviar('/login?volver=%2F%2Fmalicioso.com');
    await tras(() => http.expectOne('/api/v1/auth/login').flush(TOKEN));
    expect(url()).toBe('/inicio');
  });

  it('no envía un formulario incompleto', async () => {
    await harness.navigateByUrl('/login');
    await enviar();
    http.expectNone('/api/v1/auth/login');
    expect(raiz().textContent).toContain('Este campo es obligatorio.');
  });

  it('401 → muestra el detail del servidor', async () => {
    await rellenarYEnviar();
    const { cuerpo, opciones } = problema(401, 'NO_AUTENTICADO', 'Email o contraseña incorrectos');
    await tras(() => http.expectOne('/api/v1/auth/login').flush(cuerpo, opciones));

    const alerta = raiz().querySelector('ns-alert') as HTMLElement;
    expect(alerta.classList).toContain('ns-alert--error');
    expect(alerta.textContent).toContain('Email o contraseña incorrectos');
    expect(url()).toBe('/login');
  });

  it('429 → aviso con el tiempo de espera y el botón desactivado hasta que pasa', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    await rellenarYEnviar();
    const { cuerpo, opciones } = problema(429, 'LIMITE_EXCEDIDO', 'Demasiados intentos');
    await tras(() =>
      http.expectOne('/api/v1/auth/login').flush(cuerpo, { ...opciones, headers: { 'Retry-After': '720' } }),
    );

    const boton = raiz().querySelector('button[type=submit]') as HTMLButtonElement;
    expect(raiz().querySelector('ns-alert.ns-alert--warning')?.textContent).toContain(
      'Inténtalo de nuevo en 12 minutos.',
    );
    expect(boton.disabled).toBe(true);

    vi.advanceTimersByTime(720_000);
    await estable();
    expect(boton.disabled).toBe(false);
    expect(raiz().querySelector('ns-alert')).toBeNull();
  });

  it('400 → errores en los campos', async () => {
    await rellenarYEnviar();
    const { cuerpo, opciones } = problema(400, 'VALIDACION', 'Los datos enviados no son válidos', [
      { campo: 'email', mensaje: 'Debe ser un email válido' },
    ]);
    await tras(() => http.expectOne('/api/v1/auth/login').flush(cuerpo, opciones));
    expect(raiz().querySelector('ns-form-field')?.textContent).toContain('Debe ser un email válido');
    expect(raiz().querySelector('ns-alert')).toBeNull();
  });
});

describe('RegistroComponent', () => {
  async function rellenar(): Promise<void> {
    await harness.navigateByUrl('/registro');
    escribir('input[autocomplete=name]', ' Ana López ');
    escribir('input[type=email]', 'ana@correo.com');
    const [password, confirmar] = raiz().querySelectorAll('ns-campo-password input');
    for (const input of [password, confirmar] as HTMLInputElement[]) {
      input.value = 'Zpkm#lwtr9vbnh';
      input.dispatchEvent(new Event('input'));
    }
    marcar('mayor de 18');
    marcar('términos de uso');
    marcar('datos de salud');
    await estable();
  }

  it('envía RegistroRequest con los tres booleanos y sin confirmarPassword', async () => {
    await rellenar();
    await enviar();
    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/auth/registro' });
    expect(peticion.request.body).toEqual({
      nombre: 'Ana López',
      email: 'ana@correo.com',
      password: 'Zpkm#lwtr9vbnh',
      mayorDeEdad: true,
      aceptaTerminos: true,
      consentimientoSalud: true,
    });
    expect(peticion.request.body).not.toHaveProperty('confirmarPassword');

    await tras(() =>
      peticion.flush({ mensaje: 'Si los datos son correctos…' }, { status: 202, statusText: 'Accepted' }),
    );
    expect(url()).toBe('/registro/revisa-tu-email');
    expect(raiz().textContent).toContain('Revisa tu email');
  });

  it('asigna los errores del servidor a sus campos', async () => {
    await rellenar();
    await enviar();
    const { cuerpo, opciones } = problema(400, 'VALIDACION', 'Los datos enviados no son válidos', [
      { campo: 'password', mensaje: 'La contraseña es demasiado común' },
      { campo: 'mayorDeEdad', mensaje: 'Debes declarar que eres mayor de edad' },
    ]);
    await tras(() => http.expectOne('/api/v1/auth/registro').flush(cuerpo, opciones));

    const campos = [...raiz().querySelectorAll('ns-form-field')];
    expect(campos.find((c) => c.textContent?.includes('Contraseña'))?.textContent).toContain(
      'La contraseña es demasiado común',
    );
    expect(raiz().querySelector('.ns-auth-form__error:not([hidden])')?.textContent).toBe(
      'Debes declarar que eres mayor de edad',
    );
    expect(raiz().querySelector('ns-alert')).toBeNull();
    expect(url()).toBe('/registro');
  });

  it('no envía si las contraseñas no coinciden o falta una casilla', async () => {
    await rellenar();
    const confirmar = raiz().querySelectorAll('ns-campo-password input')[1] as HTMLInputElement;
    confirmar.value = 'Otra#lwtr9vbnh';
    confirmar.dispatchEvent(new Event('input'));
    marcar('datos de salud');
    await enviar();
    http.expectNone('/api/v1/auth/registro');
    expect(raiz().textContent).toContain('Las contraseñas no coinciden.');
    expect(raiz().textContent).toContain('Debes marcar esta casilla para continuar.');
  });

  it('"Qué datos tratamos y por qué" abre el diálogo', async () => {
    await harness.navigateByUrl('/registro');
    (raiz().querySelector('.ns-auth-form__enlace-boton') as HTMLButtonElement).click();
    await estable();
    const dialogo = document.querySelector('app-datos-salud-dialog') as HTMLElement;
    expect(dialogo.textContent).toContain('sin metadatos');
    expect(dialogo.textContent).toContain('Configuración › Privacidad');
  });
});

describe('RevisaTuEmailComponent', () => {
  it('reenvía al email del estado de navegación y muestra un toast', async () => {
    const toasts = TestBed.inject(NsToastService);
    await TestBed.inject(Router).navigateByUrl('/registro/revisa-tu-email', { state: { email: 'ana@correo.com' } });
    await estable();
    expect(raiz().querySelector('input[type=email]')).toBeNull();

    (raiz().querySelector('button') as HTMLButtonElement).click();
    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/auth/reenviar-verificacion' });
    expect(peticion.request.body).toEqual({ email: 'ana@correo.com' });
    await tras(() => peticion.flush({ mensaje: 'ok' }, { status: 202, statusText: 'Accepted' }));
    expect(toasts.visibles().map((t) => t.titulo)).toEqual(['Enlace reenviado']);
  });

  it('sin estado pide el email y respeta el 429', async () => {
    await harness.navigateByUrl('/registro/revisa-tu-email');
    escribir('input[type=email]', 'ana@correo.com');
    const boton = [...raiz().querySelectorAll('button')].find((b) => b.textContent?.includes('Reenviar'))!;
    boton.click();
    const { cuerpo, opciones } = problema(429, 'LIMITE_EXCEDIDO', 'Demasiados envíos');
    await tras(() =>
      http
        .expectOne('/api/v1/auth/reenviar-verificacion')
        .flush(cuerpo, { ...opciones, headers: { 'Retry-After': '1800' } }),
    );
    expect(raiz().querySelector('ns-alert')?.textContent).toContain('Inténtalo de nuevo en 30 minutos.');
    expect(boton.disabled).toBe(true);
  });
});
