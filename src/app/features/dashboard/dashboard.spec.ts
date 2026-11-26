import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

import { LayoutService } from '@core/layout/layout.service';
import type { EntrenamientoResponse, RegistroComidaResponse, ResumenDiarioResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { hoyLocal, lunesDeLaSemana, rangoDias, sumarDias } from '@core/util/fechas';
import { environment } from '@env/environment';
import { ICONOS_APP } from '@shared/design/iconos';
import { aIsoConZona } from '../actividad/entrenamiento-form';
import { TarjetaEnergiaComponent } from './componentes/tarjeta-energia.component';
import { etiquetaDia, opcionesSemana } from './componentes/grafico-semana.component';
import { comidasQueMasAportan, franjasDelDia, primerNombre, saludo } from './dashboard';
import { DashboardComponent } from './dashboard.component';

const API = environment.apiUrl;
const HOY = hoyLocal();
const SEMANA = rangoDias(lunesDeLaSemana(HOY), sumarDias(lunesDeLaSemana(HOY), 6));

function comida(
  id: string,
  tipo: RegistroComidaResponse['tipoComida'],
  hora: string | null,
  p = 20,
): RegistroComidaResponse {
  return {
    id,
    fecha: HOY,
    hora,
    tipoComida: tipo,
    origen: 'MANUAL',
    notas: null,
    alimentos: [
      {
        id: `${id}-a`,
        alimentoId: 'x',
        nombre: 'Avena',
        cantidad: 60,
        unidad: 'g',
        gramos: 60,
        kcal: 230,
        proteina: p,
        carbohidratos: 40,
        grasa: 4,
        origenIa: false,
        confianzaIa: null,
      },
    ],
    totales: { kcal: 500, proteina: p, carbohidratos: 40, grasa: 4 },
    avisos: [],
  };
}

function resumen(cambios: Partial<ResumenDiarioResponse> = {}, fecha = HOY): ResumenDiarioResponse {
  return {
    fecha,
    objetivo: { kcal: 2680, proteina: 150, carbohidratos: 340, grasa: 80 },
    kcalEntreno: 670,
    consumido: { kcal: 1742, proteina: 112, carbohidratos: 205, grasa: 54 },
    restante: { kcal: 938, proteina: 38, carbohidratos: 135, grasa: 26 },
    excesoKcal: null, // como lo envía el backend cuando no se supera el objetivo
    porcentajes: { kcal: 65, proteina: 75, carbohidratos: 60, grasa: 68 },
    comidas: [],
    entrenamientos: [],
    comidasPlanificadasPendientes: [],
    ...cambios,
  };
}

function entrenamiento(cambios: Partial<EntrenamientoResponse> = {}): EntrenamientoResponse {
  return {
    id: 'e-1',
    tipoActividadCodigo: 'RUNNING',
    tipoActividadNombre: 'Rodaje',
    fechaHora: aIsoConZona(`${HOY}T00:00`)!,
    duracionMin: 65,
    intensidad: 'MEDIA',
    rpe: null,
    estado: 'PLANIFICADO',
    kcalEstimadas: 670,
    distanciaKm: 12,
    notas: null,
    ...cambios,
  };
}

describe('Funciones del dashboard', () => {
  it('saluda según la hora y usa el primer nombre', () => {
    expect(saludo(8)).toBe('Buenos días');
    expect(saludo(15)).toBe('Buenas tardes');
    expect(saludo(22)).toBe('Buenas noches');
    expect(saludo(3)).toBe('Buenas noches');
    expect(primerNombre('Álex Romero')).toBe('Álex');
  });

  it('franjas: las fijas siempre, el resto solo con comidas, en el orden del día', () => {
    const franjas = franjasDelDia([
      comida('c', 'CENA', '21:10:00'),
      comida('p', 'PRE_ENTRENO', '17:00:00'),
      comida('d', 'DESAYUNO', '08:10:00'),
    ]);
    expect(franjas.map((f) => f.tipo)).toEqual(['DESAYUNO', 'COMIDA', 'PRE_ENTRENO', 'MERIENDA', 'CENA']);
    expect(franjas[0].hora).toBe('08:10');
    expect(franjas[1].comidas).toEqual([]);
  });

  it('las 2 comidas que más aportan de un macro', () => {
    const fuentes = comidasQueMasAportan(
      [comida('a', 'DESAYUNO', null, 22), comida('b', 'COMIDA', null, 72), comida('c', 'CENA', null, 0)],
      'proteina',
    );
    expect(fuentes.map((f) => [f.etiqueta, f.gramos])).toEqual([
      ['Comida', 72],
      ['Desayuno', 22],
    ]);
  });

  it('gráfico semanal: barras solo con comidas, marca del objetivo de cada día y entrenos en el eje', () => {
    const dias = SEMANA.map((fecha, i) => ({
      fecha,
      consumido: i < 2 ? 2000 + i : 0,
      objetivo: i === 6 ? null : 2600 + i,
      entreno: i === 1,
      conComidas: i < 2,
    }));
    const o = opcionesSemana(dias, SEMANA[1]) as {
      series: { name: string; data: (number | null)[] }[];
      xAxis: { data: string[]; axisLabel: { formatter: (v: string, i: number) => string } };
    };
    expect(o.series[0].data.slice(0, 3)).toEqual([2000, 2001, null]);
    expect(o.series[1].data[6]).toBeNull();
    expect(o.xAxis.data[1]).toBe('Hoy');
    expect(o.xAxis.axisLabel.formatter('Hoy', 1)).toContain('{entreno|●}');
    expect(o.xAxis.axisLabel.formatter('Lun', 0)).toContain('{sin|●}');
    expect(etiquetaDia('2026-11-23', '2026-11-26')).toBe('Lun');
  });
});

describe('TarjetaEnergiaComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] }));

  function pintar(r: ResumenDiarioResponse): string {
    const f = TestBed.createComponent(TarjetaEnergiaComponent);
    f.componentRef.setInput('resumen', r);
    f.detectChanges();
    // Sin espacios: entre los <span> del anillo no hay texto.
    return (f.nativeElement as HTMLElement).textContent!.replace(/\s+/g, '');
  }

  it('restantes en el centro y desglose con la base (objetivo − entreno)', () => {
    const t = pintar(resumen());
    expect(t).toContain('Restantes938de2.680kcal');
    expect(t).toContain('+670kcal');
    expect(t).toContain('Base2.010kcal');
  });

  it('con exceso, "+X kcal" en tono neutro y sin repetirlo', () => {
    const t = pintar(
      resumen({
        consumido: { kcal: 2900, proteina: 0, carbohidratos: 0, grasa: 0 },
        restante: { kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0 },
        excesoKcal: 220,
      }),
    );
    expect(t).toContain('Másdeloprevisto+220kcal');
    expect(t.match(/\+220/g)!.length).toBe(1);
  });
});

describe('DashboardComponent', () => {
  let http: HttpTestingController;
  const grafico = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    isDisposed: () => false,
    on: vi.fn(),
    off: vi.fn(),
  };
  const global = globalThis as { ResizeObserver?: unknown };
  const original = global.ResizeObserver;

  beforeAll(() => {
    global.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });
  afterAll(() => (global.ResizeObserver = original));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'inicio', component: DashboardComponent },
          { path: 'bienvenida', children: [] },
        ]),
        provideLucideIcons(...ICONOS_APP),
        { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => Promise.resolve({ init: () => grafico }) } },
        { provide: LayoutService, useValue: { esMovil: signal(false) } },
        {
          provide: InteractivityChecker,
          useValue: { isFocusable: () => true, isTabbable: () => true, isVisible: () => true, isDisabled: () => false },
        },
        { provide: AuthService, useValue: { cuenta: signal({ nombre: 'Álex Romero' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  const resumenes = (): TestRequest[] => http.match((r) => r.url === `${API}/seguimiento/resumen`);
  const peso = () => http.match((r) => r.url === `${API}/seguimiento/peso`);

  /** Navega a /inicio, responde el resumen del día y el de la semana, y la serie de peso. */
  async function abrir(r = resumen()): Promise<{ harness: RouterTestingHarness; el: HTMLElement }> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/inicio');
    const [delDia] = resumenes();
    expect(delDia.request.params.get('fecha')).toBe(HOY);
    delDia.flush(r);
    await harness.fixture.whenStable();
    const semana = resumenes();
    expect(semana.map((q) => q.request.params.get('fecha')).sort()).toEqual(SEMANA.filter((d) => d !== HOY));
    semana.forEach((q) =>
      q.flush(resumen({ entrenamientos: q.request.params.get('fecha') === SEMANA[0] ? [entrenamiento()] : [] })),
    );
    peso().forEach((q) => q.flush({ puntos: [], variacion: null }));
    await harness.fixture.whenStable();
    return { harness, el: harness.routeNativeElement! };
  }

  it('saluda, pinta energía, macros, comidas y entreno, y pide la semana una sola vez', async () => {
    const { el } = await abrir(resumen({ comidas: [comida('d', 'DESAYUNO', '08:10:00')] }));
    const t = el.textContent!.replace(/\s+/g, ' ');
    expect(t).toMatch(/Buen(os días|as tardes|as noches), Álex/);
    expect(t.replace(/ /g, '')).toContain('Restantes938');
    expect(el.querySelectorAll('app-tarjeta-macro').length).toBe(3);
    expect(t).toContain('Hidratos');
    expect(el.querySelectorAll('app-meal-card').length).toBe(1);
    expect(t).toContain('Día de descanso');
    expect(peso()).toEqual([]);
  });

  it('sin comidas, el estado vacío; las franjas vacías enlazan al registro con tipo y fecha', async () => {
    const { el } = await abrir();
    expect(el.textContent).toContain('Aún no has registrado comidas hoy');
  });

  it('"Añadir" lleva al registro con tipoComida, fecha y vuelta', async () => {
    const { el } = await abrir(resumen({ comidas: [comida('d', 'DESAYUNO', '08:10:00')] }));
    const anadir = [...el.querySelectorAll<HTMLAnchorElement>('.ns-ch__anadir')].find((a) =>
      a.textContent!.includes('Añadir cena'),
    )!;
    expect(anadir.getAttribute('href')).toBe(`/comidas/nueva?tipoComida=CENA&fecha=${HOY}&volver=%2Finicio`);
  });

  it('"Marcar como realizado" hace el PUT y recarga el resumen', async () => {
    const { harness, el } = await abrir(resumen({ entrenamientos: [entrenamiento()] }));
    const boton = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent!.includes('Marcar como realizado'),
    )!;
    boton.click();
    const put = http.expectOne(`${API}/entrenamientos/e-1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.estado).toBe('REALIZADO');
    put.flush(entrenamiento({ estado: 'REALIZADO' }));
    await harness.fixture.whenStable();
    const [recarga] = resumenes();
    expect(recarga.request.params.get('fecha')).toBe(HOY);
    recarga.flush(resumen({ entrenamientos: [entrenamiento({ estado: 'REALIZADO' })] }));
  });

  it('elegir otro día lo lleva a la URL y pide su resumen', async () => {
    const { harness } = await abrir();
    const ayer = sumarDias(HOY, -1);
    await harness.navigateByUrl(`/inicio?fecha=${ayer}`);
    const reqs = resumenes();
    // Si ayer es de la misma semana ya está en caché.
    if (SEMANA.includes(ayer)) expect(reqs).toEqual([]);
    else expect(reqs[0].request.params.get('fecha')).toBe(ayer);
    reqs.forEach((q) => q.flush(resumen({}, q.request.params.get('fecha')!)));
    expect(TestBed.inject(Router).url).toBe(`/inicio?fecha=${ayer}`);
  });

  it('un 422 PERFIL_REQUERIDO lleva a /bienvenida', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/inicio');
    resumenes()[0].flush(
      { title: 'Perfil requerido', codigo: 'PERFIL_REQUERIDO' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/bienvenida');
    peso().forEach((q) => q.flush({ puntos: [], variacion: null }));
  });
});
