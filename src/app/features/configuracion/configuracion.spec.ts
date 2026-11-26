import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type { CuentaResponse, TokenResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { RUTAS_CONFIGURACION } from './configuracion.routes';

@Component({ template: '<p>Destino</p>' })
class Destino {}

const CUENTA: CuentaResponse = {
  id: 'c-1',
  nombre: 'Ana López',
  email: 'ana@correo.com',
  roles: ['DEPORTISTA'],
  estado: 'ACTIVO',
  emailVerificado: true,
  consentimientoSaludVigente: true,
  unidades: 'METRICO',
  insightsActivos: true,
};

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

const layout = { esMovil: signal(false), esTablet: signal(false), esEscritorio: signal(true) };
let harness: RouterTestingHarness;
let http: HttpTestingController;
let auth: AuthService;
let confirmar: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  layout.esMovil.set(false);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'configuracion', children: RUTAS_CONFIGURACION },
        { path: '**', component: Destino },
      ]),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: layout },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  auth = TestBed.inject(AuthService);
  confirmar = vi.spyOn(TestBed.inject(NsConfirmService), 'confirmar');
  await entrar(CUENTA);
  harness = await RouterTestingHarness.create();
});

afterEach(() => {
  http.verify();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

async function entrar(cuenta: CuentaResponse): Promise<void> {
  const login = firstValueFrom(auth.login({ email: cuenta.email, password: 'x', mantenerSesion: false }));
  const token: TokenResponse = { accessToken: 'abc', tipo: 'Bearer', expiraEn: 900, cuenta };
  http.expectOne('/api/v1/auth/login').flush(token);
  await login;
}

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const url = () => TestBed.inject(Router).url;
const esperar = async () => {
  await harness.fixture.whenStable();
  await new Promise((resolver) => setTimeout(resolver));
  await harness.fixture.whenStable();
};
const boton = (texto: string) =>
  [...raiz().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(texto))!;
function escribir(input: Element, valor: string): void {
  (input as HTMLInputElement).value = valor;
  input.dispatchEvent(new Event('input'));
}
const titulosToast = () =>
  TestBed.inject(NsToastService)
    .visibles()
    .map((t) => t.titulo);
const errorValidacion = (campo: string, mensaje: string) => ({
  cuerpo: {
    status: 400,
    codigo: 'VALIDACION',
    title: 'Datos no válidos',
    detail: 'No válidos',
    errors: [{ campo, mensaje }],
  },
  opciones: { status: 400, statusText: 'Bad Request' },
});

describe('Configuración · navegación', () => {
  it('en escritorio /configuracion abre Cuenta con la navegación lateral', async () => {
    await harness.navigateByUrl('/configuracion');
    expect(url()).toBe('/configuracion/cuenta');
    const enlaces = [...raiz().querySelectorAll('.ns-config__enlace')].map((e) => e.textContent?.trim());
    expect(enlaces).toEqual(['Cuenta', 'Seguridad', 'Privacidad y datos', 'Uso de IA']);
    expect(raiz().querySelector('.ns-config__enlace--activo')?.getAttribute('aria-current')).toBe('page');
  });

  it('en móvil /configuracion es la lista y cada sección tiene "Volver"', async () => {
    layout.esMovil.set(true);
    await harness.navigateByUrl('/configuracion');
    expect(url()).toBe('/configuracion');
    expect(raiz().querySelectorAll('.ns-config__fila').length).toBe(4);

    await harness.navigateByUrl('/configuracion/seguridad');
    expect(raiz().querySelector('.ns-config__fila')).toBeNull();
    expect(raiz().querySelector('.ns-config__volver')?.getAttribute('href')).toBe('/configuracion');
  });
});

describe('CuentaDatosComponent', () => {
  it('envía en PATCH solo lo que cambia; unidades está deshabilitado', async () => {
    await harness.navigateByUrl('/configuracion/cuenta');
    expect((raiz().querySelector('select') as HTMLSelectElement).disabled).toBe(true);
    escribir(raiz().querySelector('input[autocomplete=name]')!, 'Ana María');
    (raiz().querySelector('[role=switch]') as HTMLButtonElement).click();
    await esperar();
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne({ method: 'PATCH', url: '/api/v1/cuenta' });
    expect(peticion.request.body).toStrictEqual({ nombre: 'Ana María', insightsActivos: false });
    peticion.flush({ ...CUENTA, nombre: 'Ana María', insightsActivos: false });
    await esperar();
    expect(auth.cuenta()?.nombre).toBe('Ana María');
    expect(titulosToast()).toContain('Cambios guardados');
  });
});

describe('SeguridadComponent', () => {
  beforeEach(() => harness.navigateByUrl('/configuracion/seguridad'));
  const formulario = (i: number) => raiz().querySelectorAll('form')[i];

  it('cambiar la contraseña cierra la sesión, avisa y va a /login', async () => {
    const [actual, nueva, confirmarPw] = formulario(0).querySelectorAll('ns-campo-password input');
    escribir(actual, 'vieja12345');
    escribir(nueva, 'Zpkm#lwtr9vbnh');
    escribir(confirmarPw, 'Zpkm#lwtr9vbnh');
    formulario(0).dispatchEvent(new Event('submit'));

    const peticion = http.expectOne({ method: 'PUT', url: '/api/v1/cuenta/password' });
    expect(peticion.request.body).toStrictEqual({ passwordActual: 'vieja12345', nuevaPassword: 'Zpkm#lwtr9vbnh' });
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    await esperar();
    expect(auth.autenticado()).toBe(false);
    expect(titulosToast()).toContain('Contraseña cambiada');
    expect(url()).toBe('/login');
  });

  it('la contraseña actual incorrecta se muestra en su campo', async () => {
    const [actual, nueva, confirmarPw] = formulario(0).querySelectorAll('ns-campo-password input');
    escribir(actual, 'mal1234567');
    escribir(nueva, 'Zpkm#lwtr9vbnh');
    escribir(confirmarPw, 'Zpkm#lwtr9vbnh');
    formulario(0).dispatchEvent(new Event('submit'));
    const { cuerpo, opciones } = errorValidacion('passwordActual', 'La contraseña no es correcta');
    http.expectOne('/api/v1/cuenta/password').flush(cuerpo, opciones);
    await esperar();
    expect(formulario(0).querySelector('ns-form-field')?.textContent).toContain('La contraseña no es correcta');
    expect(auth.autenticado()).toBe(true);
  });

  it('cambiar el email muestra el mensaje genérico de la respuesta', async () => {
    escribir(formulario(1).querySelector('input[type=email]')!, 'nuevo@correo.com');
    escribir(formulario(1).querySelector('ns-campo-password input')!, 'secreta1234');
    formulario(1).dispatchEvent(new Event('submit'));
    const peticion = http.expectOne({ method: 'PUT', url: '/api/v1/cuenta/email' });
    expect(peticion.request.body).toStrictEqual({ nuevoEmail: 'nuevo@correo.com', password: 'secreta1234' });
    peticion.flush(
      { mensaje: 'Si el email es válido, te hemos enviado un enlace.' },
      { status: 202, statusText: 'Accepted' },
    );
    await esperar();
    expect(raiz().querySelector('ns-alert.ns-alert--success')?.textContent).toContain('te hemos enviado un enlace');
  });

  it('la contraseña incorrecta al cambiar el email va al campo password', async () => {
    escribir(formulario(1).querySelector('input[type=email]')!, 'nuevo@correo.com');
    escribir(formulario(1).querySelector('ns-campo-password input')!, 'mal');
    formulario(1).dispatchEvent(new Event('submit'));
    const { cuerpo, opciones } = errorValidacion('password', 'La contraseña no es correcta');
    http.expectOne('/api/v1/cuenta/email').flush(cuerpo, opciones);
    await esperar();
    const campos = [...formulario(1).querySelectorAll('ns-form-field')];
    expect(campos[1].textContent).toContain('La contraseña no es correcta');
  });

  it('"Cerrar sesión en todos los dispositivos" pide confirmación y llama a logout-todas', async () => {
    confirmar.mockResolvedValueOnce(false);
    boton('Cerrar sesión en todos').click();
    await esperar();
    http.expectNone('/api/v1/auth/logout-todas');

    confirmar.mockResolvedValueOnce(true);
    boton('Cerrar sesión en todos').click();
    await esperar();
    http.expectOne({ method: 'POST', url: '/api/v1/auth/logout-todas' }).flush(null, { status: 204, statusText: '' });
    await esperar();
    expect(auth.autenticado()).toBe(false);
    expect(url()).toBe('/login');
  });
});

describe('PrivacidadComponent', () => {
  beforeEach(() => harness.navigateByUrl('/configuracion/privacidad'));

  it('revocar pide confirmación (peligro) y recarga la cuenta', async () => {
    expect(raiz().textContent).toContain('Vigente');
    expect(raiz().textContent).toContain('sin metadatos');

    confirmar.mockResolvedValueOnce(true);
    boton('Revocar consentimiento').click();
    await esperar();
    expect(confirmar.mock.calls[0][0]).toMatchObject({ peligro: true });
    expect(confirmar.mock.calls[0][0].mensaje).toContain('no se borran');

    http
      .expectOne({ method: 'DELETE', url: '/api/v1/cuenta/consentimiento-salud' })
      .flush(null, { status: 204, statusText: '' });
    await esperar();
    http.expectOne({ method: 'GET', url: '/api/v1/cuenta' }).flush({ ...CUENTA, consentimientoSaludVigente: false });
    await esperar();
    expect(raiz().textContent).toContain('Revocado');
    expect(boton('Volver a dar el consentimiento')).toBeTruthy();
  });

  it('"Volver a dar el consentimiento" hace POST sin confirmación', async () => {
    auth.actualizarCuenta({ ...CUENTA, consentimientoSaludVigente: false });
    await esperar();
    boton('Volver a dar el consentimiento').click();
    await esperar();
    expect(confirmar).not.toHaveBeenCalled();
    http
      .expectOne({ method: 'POST', url: '/api/v1/cuenta/consentimiento-salud' })
      .flush(null, { status: 204, statusText: '' });
    await esperar();
    http.expectOne('/api/v1/cuenta').flush(CUENTA);
    await esperar();
    expect(auth.consentimientoVigente()).toBe(true);
  });

  it('la zona de peligro tiene el borde de error y "Exportar" está desactivado', () => {
    expect(raiz().querySelector('.ns-bloque--peligro')).not.toBeNull();
    expect(boton('Exportar mis datos').disabled).toBe(true);
  });

  it('eliminar la cuenta pide la contraseña, envía inmediata y va a /login', async () => {
    (raiz().querySelector('ns-checkbox input') as HTMLInputElement).click();
    confirmar.mockResolvedValueOnce('secreta1234');
    boton('Eliminar mi cuenta').click();
    await esperar();
    expect(confirmar.mock.calls[0][0]).toMatchObject({ pedirPassword: true, peligro: true });

    const peticion = http.expectOne({ method: 'DELETE', url: '/api/v1/cuenta' });
    expect(peticion.request.body).toStrictEqual({ password: 'secreta1234', inmediata: true });
    peticion.flush(null, { status: 204, statusText: '' });
    await esperar();
    expect(auth.autenticado()).toBe(false);
    expect(titulosToast()).toContain('Cuenta eliminada');
    expect(url()).toBe('/login');
  });

  it('con la contraseña incorrecta muestra el error y no cierra la sesión', async () => {
    confirmar.mockResolvedValueOnce('mal');
    boton('Eliminar mi cuenta').click();
    await esperar();
    const { cuerpo, opciones } = errorValidacion('password', 'La contraseña no es correcta');
    const peticion = http.expectOne({ method: 'DELETE', url: '/api/v1/cuenta' });
    expect(peticion.request.body.inmediata).toBe(false);
    peticion.flush(cuerpo, opciones);
    await esperar();
    expect(raiz().querySelector('ns-alert.ns-alert--error')?.textContent).toContain('La contraseña no es correcta');
    expect(auth.autenticado()).toBe(true);
  });
});

describe('UsoIaComponent', () => {
  it('muestra los límites, el estado del email y el disclaimer', async () => {
    await harness.navigateByUrl('/configuracion/uso-ia');
    const texto = raiz().textContent!;
    expect(texto).toContain('20 análisis al día');
    expect(texto).toContain('50 mensajes al día');
    expect(texto).toContain('Verificado');
    expect(raiz().querySelector('ns-disclaimer')).not.toBeNull();
  });

  it('con el email sin verificar ofrece reenviar el correo', async () => {
    auth.actualizarCuenta({ ...CUENTA, emailVerificado: false });
    await harness.navigateByUrl('/configuracion/uso-ia');
    expect(raiz().textContent).toContain('Sin verificar');
    expect(boton('Reenviar correo de verificación')).toBeTruthy();
  });
});
