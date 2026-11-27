import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type {
  AnalisisResponse,
  CuentaResponse,
  CandidatoAnalisis,
  RegistroComidaResponse,
  TokenResponse,
} from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { ResultadoAnalisisComponent } from '../features/analisis/revision/resultado-analisis.component';

const API = '/api/v1';
const FECHA = '2026-11-27';
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

const SALMON: CandidatoAnalisis = {
  nombreDetectado: 'Salmón',
  preparacion: 'PLANCHA',
  gramosEstimados: 150,
  confianza: 0.94,
  nivelConfianza: 'Alta',
  estimado: true,
  coincidencias: [
    {
      alimentoId: 'salmon',
      nombre: 'Salmón a la plancha',
      similitud: 0.92,
      estimados: { kcal: 300, proteina: 30, carbohidratos: 0, grasa: 19.5 },
      fuente: 'BEDCA',
    },
    {
      alimentoId: 'salmon-ahumado',
      nombre: 'Salmón ahumado',
      similitud: 0.71,
      estimados: { kcal: 270, proteina: 37.5, carbohidratos: 0, grasa: 13.5 },
      fuente: 'BEDCA',
    },
  ],
};

function sesion(accessToken: string): TokenResponse {
  return { accessToken, tipo: 'Bearer', expiraEn: 900, cuenta: CUENTA };
}

function analisisCompletado(): AnalisisResponse {
  return {
    id: 'analisis-1',
    tipo: 'COMIDA',
    estado: 'COMPLETADO',
    tipoComida: 'CENA',
    candidatos: [SALMON],
    totalEstimado: { kcal: 300, proteina: 30, carbohidratos: 0, grasa: 19.5 },
    errorMensaje: null,
    creadoEn: '2026-11-27T14:30:00+01:00',
    completadoEn: '2026-11-27T14:30:05+01:00',
  };
}

function comidaGuardada(): RegistroComidaResponse {
  return {
    id: 'comida-foto-1',
    fecha: FECHA,
    hora: '14:30:00',
    tipoComida: 'CENA',
    origen: 'FOTO',
    notas: null,
    alimentos: [],
    totales: { kcal: 300, proteina: 30, carbohidratos: 0, grasa: 19.5 },
    avisos: [],
  };
}

@Component({ template: '<p>Inicio</p>' })
class InicioComponent {}

describe('Flujo de confirmación de análisis', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter(
          [
            { path: 'comidas/foto/:id', component: ResultadoAnalisisComponent },
            { path: 'inicio', component: InicioComponent },
          ],
          withComponentInputBinding(),
        ),
        provideLucideIcons(...ICONOS_APP),
        { provide: LayoutService, useValue: { esMovil: signal(false), esTablet: signal(false) } },
        { provide: NsConfirmService, useValue: { confirmar: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  it('confirma un análisis COMPLETADO con el alimento corregido y envía el cuerpo exacto', async () => {
    TestBed.inject(AuthService)
      .login({ email: CUENTA.email, password: 'clavePrueba123', mantenerSesion: false })
      .subscribe();
    http.expectOne(`${API}/auth/login`).flush(sesion('token-analisis'));

    await harness.navigateByUrl(`/comidas/foto/analisis-1?fecha=${FECHA}&hora=14:30`);
    const consulta = http.expectOne(`${API}/analisis/analisis-1`);
    expect(consulta.request.headers.get('Authorization')).toBe('Bearer token-analisis');
    consulta.flush(analisisCompletado());
    await harness.fixture.whenStable();

    http
      .expectOne(`${API}/analisis/analisis-1/imagen`)
      .flush({ url: 'http://localhost:9000/foto.jpg', expiraEn: '2026-11-27T14:35:00+01:00' });
    await harness.fixture.whenStable();

    const fila = harness.routeNativeElement!.querySelector<HTMLElement>('app-candidato-item')!;
    const gramos = fila.querySelector<HTMLInputElement>('ns-quantity-input input[role="spinbutton"]')!;
    gramos.value = '180';
    gramos.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();

    [...fila.querySelectorAll<HTMLButtonElement>('button')]
      .find((boton) => boton.textContent?.includes('Cambiar alimento'))!
      .click();
    await harness.fixture.whenStable();
    [...fila.querySelectorAll<HTMLButtonElement>('.ns-cambiar__opcion')]
      .find((boton) => boton.textContent?.includes('Salmón ahumado'))!
      .click();
    await harness.fixture.whenStable();

    [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button')]
      .find((boton) => boton.textContent?.includes('Confirmar y guardar'))!
      .click();
    const confirmar = http.expectOne({
      method: 'POST',
      url: `${API}/analisis/analisis-1/confirmar`,
    });
    expect(confirmar.request.body).toStrictEqual({
      fecha: FECHA,
      hora: '14:30:00',
      tipoComida: 'CENA',
      alimentos: [{ alimentoId: 'salmon-ahumado', gramos: 180, indiceCandidato: 0 }],
    });
    confirmar.flush(comidaGuardada(), { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));

    expect(TestBed.inject(NsToastService).visibles()[0].titulo).toBe('Cena guardada · 300 kcal');
    expect(TestBed.inject(Router).url).toBe('/inicio');
  });
});
