import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InteractivityChecker } from '@angular/cdk/a11y';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

import type { CuentaResponse, ResumenDiarioResponse, TokenResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { hoyLocal, lunesDeLaSemana, rangoDias, sumarDias } from '@core/util/fechas';
import { LayoutService } from '@core/layout/layout.service';
import { appConfig } from '../app.config';

const API = '/api/v1';
const HOY = hoyLocal();
const SEMANA = rangoDias(lunesDeLaSemana(HOY), sumarDias(lunesDeLaSemana(HOY), 6));

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

function sesion(accessToken: string): TokenResponse {
  return { accessToken, tipo: 'Bearer', expiraEn: 900, cuenta: CUENTA };
}

function resumen(fecha: string): ResumenDiarioResponse {
  return {
    fecha,
    objetivo: { kcal: 2400, proteina: 140, carbohidratos: 300, grasa: 75 },
    kcalEntreno: 0,
    consumido: { kcal: 420, proteina: 25, carbohidratos: 60, grasa: 12 },
    restante: { kcal: 1980, proteina: 115, carbohidratos: 240, grasa: 63 },
    excesoKcal: null,
    porcentajes: { kcal: 18, proteina: 18, carbohidratos: 20, grasa: 16 },
    comidas: [],
    entrenamientos: [],
    comidasPlanificadasPendientes: [],
  };
}

const grafico = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  isDisposed: () => false,
  on: vi.fn(),
  off: vi.fn(),
};

const global = globalThis as { ResizeObserver?: unknown };
const resizeObserverOriginal = global.ResizeObserver;

beforeAll(() => {
  global.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
});

afterAll(() => {
  global.ResizeObserver = resizeObserverOriginal;
});

describe('Flujo de sesión', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private readonly alCambiar: (entradas: { isIntersecting: boolean; target: Element }[]) => void) {}
        observe(target: Element): void {
          this.alCambiar([{ isIntersecting: true, target }]);
        }
        unobserve(): void {}
        disconnect(): void {}
      },
    );

    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        {
          provide: LayoutService,
          useValue: { esMovil: signal(false), esTablet: signal(false), esEscritorio: signal(true) },
        },
        { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => Promise.resolve({ init: () => grafico }) } },
        {
          provide: InteractivityChecker,
          useValue: { isFocusable: () => true, isTabbable: () => true, isVisible: () => true, isDisabled: () => false },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it('restaura la sesión al arrancar, abre /inicio y renueva/reintenta una petición con 401', async () => {
    const inicio = TestBed.inject(ApplicationInitStatus);
    const arranque = inicio.donePromise;

    const refreshInicial = http.expectOne(`${API}/auth/refresh`);
    expect(refreshInicial.request.withCredentials).toBe(true);
    refreshInicial.flush(sesion('token-inicial'));
    await arranque;
    expect(TestBed.inject(AuthService).tokenActual()).toBe('token-inicial');

    const harness = await RouterTestingHarness.create();
    const navegacion = harness.navigateByUrl('/');
    await new Promise((resolver) => setTimeout(resolver));
    const perfil = http.expectOne(`${API}/perfil`);
    expect(perfil.request.headers.get('Authorization')).toBe('Bearer token-inicial');
    perfil.flush({});
    await navegacion;
    expect(TestBed.inject(Router).url).toBe('/inicio');

    const resumenes = http.match((peticion) => peticion.url === `${API}/seguimiento/resumen`);
    const delDia = resumenes.find((peticion) => peticion.request.params.get('fecha') === HOY);
    expect(resumenes).toHaveLength(7);
    expect(delDia).toBeDefined();
    expect(delDia!.request.headers.get('Authorization')).toBe('Bearer token-inicial');
    delDia!.flush(
      {
        status: 401,
        codigo: 'NO_AUTENTICADO',
        title: 'No autenticado',
        detail: 'La sesión ha caducado',
        errors: [],
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    const refresh = http.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush(sesion('token-renovado'));

    const reintento = http.expectOne(
      (peticion) => peticion.url === `${API}/seguimiento/resumen` && peticion.params.get('fecha') === HOY,
    );
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer token-renovado');
    reintento.flush(resumen(HOY));

    for (const peticion of resumenes) {
      if (peticion !== delDia) peticion.flush(resumen(peticion.request.params.get('fecha')!));
    }

    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
    http
      .match((peticion) => peticion.url === `${API}/seguimiento/peso`)
      .forEach((peticion) => {
        peticion.flush({ puntos: [], variacion: null });
      });
    await harness.fixture.whenStable();

    expect(TestBed.inject(AuthService).tokenActual()).toBe('token-renovado');
    expect(harness.fixture.nativeElement.textContent).toContain('Restantes');
  });
});
