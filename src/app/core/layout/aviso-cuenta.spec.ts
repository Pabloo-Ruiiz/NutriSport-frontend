import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { errorInterceptor } from '../interceptors/error.interceptor';
import type { CuentaResponse, TokenResponse } from '../models';
import { AuthService } from '../services/auth.service';
import { AvisoCuentaComponent } from './aviso-cuenta.component';

const CUENTA: CuentaResponse = {
  id: 'cuenta-1',
  nombre: 'Ana',
  email: 'ana@correo.com',
  roles: ['DEPORTISTA'],
  estado: 'ACTIVO',
  emailVerificado: false,
  consentimientoSaludVigente: true,
  unidades: 'METRICO',
  insightsActivos: true,
};

let http: HttpTestingController;
let auth: AuthService;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
      provideLucideIcons(...ICONOS_APP),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  auth = TestBed.inject(AuthService);
});

afterEach(() => {
  http.verify();
  vi.useRealTimers();
});

/** Abre una sesión real (login contra HttpTestingController) con la cuenta indicada. */
function entrar(cuenta: CuentaResponse): void {
  auth.login({ email: cuenta.email, password: 'x', mantenerSesion: false }).subscribe();
  const token: TokenResponse = { accessToken: 'abc', tipo: 'Bearer', expiraEn: 900, cuenta };
  http.expectOne('/api/v1/auth/login').flush(token);
}

async function crear(): Promise<ComponentFixture<AvisoCuentaComponent>> {
  const fixture = TestBed.createComponent(AvisoCuentaComponent);
  await fixture.whenStable();
  return fixture;
}

const alerta = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).querySelector('ns-alert');
const boton = (f: ComponentFixture<unknown>, texto: string) =>
  [...(f.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
    (b.getAttribute('aria-label') ?? b.textContent)?.includes(texto),
  ) as HTMLButtonElement;

describe('AvisoCuentaComponent', () => {
  it('con el email sin verificar muestra el aviso', async () => {
    entrar(CUENTA);
    const fixture = await crear();
    expect(alerta(fixture)?.classList).toContain('ns-alert--info');
    expect(alerta(fixture)?.textContent).toContain('Verifica tu email para usar el análisis de fotos y el asistente');
  });

  it('con el email verificado o sin sesión no muestra nada', async () => {
    const sinSesion = await crear();
    expect(alerta(sinSesion)).toBeNull();

    entrar({ ...CUENTA, emailVerificado: true });
    const verificado = await crear();
    expect(alerta(verificado)).toBeNull();
  });

  it('desaparece en cuanto la cuenta pasa a verificada', async () => {
    entrar(CUENTA);
    const fixture = await crear();
    auth.actualizarCuenta({ ...CUENTA, emailVerificado: true });
    await fixture.whenStable();
    expect(alerta(fixture)).toBeNull();
  });

  it('"Reenviar correo" usa el email de la cuenta y muestra un toast', async () => {
    entrar(CUENTA);
    const fixture = await crear();
    boton(fixture, 'Reenviar correo').click();

    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/auth/reenviar-verificacion' });
    expect(peticion.request.body).toEqual({ email: 'ana@correo.com' });
    peticion.flush({ mensaje: 'ok' }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));

    expect(
      TestBed.inject(NsToastService)
        .visibles()
        .map((t) => t.titulo),
    ).toEqual(['Correo reenviado']);
  });

  it('respeta el 429: muestra la espera y desactiva el botón hasta que pasa', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    entrar(CUENTA);
    const fixture = await crear();
    boton(fixture, 'Reenviar correo').click();
    http
      .expectOne('/api/v1/auth/reenviar-verificacion')
      .flush(
        { status: 429, codigo: 'LIMITE_EXCEDIDO', title: 'Límite', detail: 'Demasiados envíos', errors: [] },
        { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '1800' } },
      );
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();

    expect(alerta(fixture)?.textContent).toContain('Inténtalo de nuevo en 30 minutos.');
    expect(boton(fixture, 'Reenviar correo').disabled).toBe(true);

    vi.advanceTimersByTime(1_800_000);
    await fixture.whenStable();
    expect(boton(fixture, 'Reenviar correo').disabled).toBe(false);
  });

  it('se cierra durante la sesión y vuelve a salir para otra cuenta', async () => {
    entrar(CUENTA);
    const fixture = await crear();
    boton(fixture, 'Ocultar el aviso de verificación').click();
    await fixture.whenStable();
    expect(alerta(fixture)).toBeNull();

    // Sigue cerrado aunque el componente se vuelva a crear (p. ej. al pasar al layout de admin).
    const otraVez = await crear();
    expect(alerta(otraVez)).toBeNull();

    auth.cerrarSesionLocal();
    entrar({ ...CUENTA, id: 'cuenta-2', email: 'luis@correo.com' });
    await otraVez.whenStable();
    expect(alerta(otraVez)).not.toBeNull();
  });
});
