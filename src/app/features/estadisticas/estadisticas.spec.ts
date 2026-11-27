import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

import { LayoutService } from '@core/layout/layout.service';
import type { EstadisticasResponse, InsightResponse, Nutrientes } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { environment } from '@env/environment';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsInsightCardComponent, textoPeriodoInsight } from '@shared/ui/data/insight-card.component';
import {
  agrupacionPorDefecto,
  aParametros,
  calcularKpis,
  comoComparar,
  errorRango,
  leerFiltros,
  mediaAnteriorKcal,
  rangoAnterior,
  rangoDePeriodo,
  textoRango,
  variacionPct,
} from './estadisticas';
import { EstadisticasComponent } from './estadisticas.component';

const API = environment.apiUrl;
const n = (kcal: number, proteina = 0, carbohidratos = 0, grasa = 0): Nutrientes => ({
  kcal,
  proteina,
  carbohidratos,
  grasa,
});

function est(o: Partial<EstadisticasResponse> = {}): EstadisticasResponse {
  return {
    desde: '2026-10-31',
    hasta: '2026-11-27',
    agrupacion: 'DIA',
    serie: [],
    mediaDiaria: n(2236, 138, 255, 76),
    objetivoMedio: n(2380, 150, 310, 78),
    diasConRegistro: 27,
    diasEnObjetivo: 19,
    porcentajeAdherencia: 70,
    repartoMacrosPct: { proteina: 24, carbohidratos: 45, grasa: 31 },
    kcalPorTipoComida: { DESAYUNO: 450 },
    top: [],
    ...o,
  };
}

describe('periodos y filtros', () => {
  const HOY = '2026-11-27';

  it('rangos de los periodos rápidos, terminando hoy', () => {
    expect(rangoDePeriodo('7d', HOY)).toEqual({ desde: '2026-11-21', hasta: HOY });
    expect(rangoDePeriodo('4s', HOY)).toEqual({ desde: '2026-10-31', hasta: HOY });
    expect(rangoDePeriodo('3m', HOY)).toEqual({ desde: '2026-08-28', hasta: HOY });
  });

  it('agrupación por defecto según la duración', () => {
    expect(agrupacionPorDefecto('2026-10-31', HOY)).toBe('DIA');
    expect(agrupacionPorDefecto('2026-08-28', HOY)).toBe('SEMANA');
    expect(agrupacionPorDefecto('2026-01-01', HOY)).toBe('MES');
  });

  it('valida el rango personalizado: fechas, orden, futuro y 366 días', () => {
    expect(errorRango('2026-01-01', '2026-11-27', HOY)).toBeNull();
    expect(errorRango('2025-11-27', '2026-11-27', HOY)).toBeNull(); // 366 días
    expect(errorRango('2025-11-26', '2026-11-27', HOY)).toMatch(/366/);
    expect(errorRango('2026-11-20', '2026-11-10', HOY)).toMatch(/anterior/);
    expect(errorRango('2026-11-20', '2026-11-28', HOY)).toMatch(/posterior a hoy/);
    expect(errorRango('2026-02-30', '2026-03-01', HOY)).toMatch(/válidas/);
    expect(errorRango(null, HOY, HOY)).toMatch(/válidas/);
  });

  it('lee los filtros de la URL y vuelve a 4 semanas si no valen', () => {
    expect(leerFiltros({}, HOY)).toEqual({
      periodo: '4s',
      desde: '2026-10-31',
      hasta: HOY,
      agrupacion: 'DIA',
      comparar: false,
    });
    expect(leerFiltros({ periodo: '3m', comparar: '1' }, HOY)).toMatchObject({
      periodo: '3m',
      agrupacion: 'SEMANA',
      comparar: true,
    });
    expect(
      leerFiltros({ periodo: 'personalizado', desde: '2026-11-01', hasta: '2026-11-10', agrupacion: 'SEMANA' }, HOY),
    ).toEqual({
      periodo: 'personalizado',
      desde: '2026-11-01',
      hasta: '2026-11-10',
      agrupacion: 'SEMANA',
      comparar: false,
    });
    expect(leerFiltros({ periodo: 'personalizado', desde: '2024-01-01', hasta: HOY }, HOY).periodo).toBe('4s');
    expect(leerFiltros({ periodo: 'anual', agrupacion: 'HORA' }, HOY)).toMatchObject({
      periodo: '4s',
      agrupacion: 'DIA',
    });
  });

  it('a query params: desde y hasta solo en el personalizado, comparar solo si está activo', () => {
    expect(aParametros(leerFiltros({ periodo: '7d' }, HOY))).toEqual({
      periodo: '7d',
      desde: null,
      hasta: null,
      agrupacion: 'DIA',
      comparar: null,
    });
    const personalizado = leerFiltros(
      { periodo: 'personalizado', desde: '2026-11-01', hasta: '2026-11-10', comparar: 'true' },
      HOY,
    );
    expect(aParametros(personalizado)).toMatchObject({ desde: '2026-11-01', hasta: '2026-11-10', comparar: '1' });
  });

  it('periodo anterior: comparativa para 7 días y 4 semanas, rango anterior para el resto', () => {
    expect(rangoAnterior('2026-11-01', '2026-11-10')).toEqual({ desde: '2026-10-22', hasta: '2026-10-31' });
    expect(comoComparar(leerFiltros({ periodo: '7d' }, HOY))).toMatchObject({ tipo: 'comparativa', periodo: 'SEMANA' });
    expect(comoComparar(leerFiltros({ periodo: '4s' }, HOY))).toMatchObject({ tipo: 'comparativa', periodo: 'MES' });
    expect(comoComparar(leerFiltros({ periodo: '3m' }, HOY))).toMatchObject({
      tipo: 'rango',
      hasta: '2026-08-27',
      texto: 'los 3 meses anteriores',
    });
    expect(
      comoComparar(leerFiltros({ periodo: 'personalizado', desde: '2026-11-01', hasta: '2026-11-10' }, HOY)),
    ).toEqual({ tipo: 'rango', desde: '2026-10-22', hasta: '2026-10-31', texto: 'los 10 días anteriores' });
  });

  it('texto del rango con el año solo si cambia', () => {
    expect(textoRango('2026-10-26', '2026-11-21')).toBe('26 oct – 21 nov 2026');
    expect(textoRango('2025-12-20', '2026-01-10')).toBe('20 dic 2025 – 10 ene 2026');
  });
});

describe('KPIs', () => {
  const peso = {
    puntos: [
      { fecha: '2026-11-01', pesoKg: 72, mediaMovil7: null },
      { fecha: '2026-11-27', pesoKg: 71.4, mediaMovil7: 71.6 },
    ],
    variacion: -0.6,
  };

  it('sin comparar: medias, % del objetivo, g/kg, adherencia y peso, sin variaciones', () => {
    const k = calcularKpis(est(), null, peso);
    expect(k).toMatchObject({
      kcal: 2236,
      kcalPctObjetivo: 94,
      proteina: 138,
      proteinaObjetivo: 150,
      adherencia: 70,
      diasEnObjetivo: 19,
      diasConRegistro: 27,
      pesoActual: 71.4,
      variacionPeso: -0.6,
    });
    expect(k.proteinaGKg).toBeCloseTo(1.93, 2);
    expect(k.deltaKcalPct).toBeUndefined();
  });

  it('con el periodo anterior: % de las medias y puntos de adherencia', () => {
    const anterior = est({ mediaDiaria: n(2171, 130), porcentajeAdherencia: 61 });
    const k = calcularKpis(est(), anterior, null);
    expect(k.deltaKcalPct).toBe(3);
    expect(k.deltaProteinaPct).toBe(6);
    expect(k.deltaAdherenciaPts).toBe(9);
    expect(k.pesoActual).toBeNull();
    expect(k.proteinaGKg).toBeNull();
  });

  it('un periodo anterior sin registros no da variaciones ni media', () => {
    const vacio = est({ diasConRegistro: 0, mediaDiaria: n(0) });
    expect(calcularKpis(est(), vacio, null).deltaKcalPct).toBeUndefined();
    expect(mediaAnteriorKcal(vacio)).toBeNull();
    expect(mediaAnteriorKcal(est())).toBe(2236);
    expect(variacionPct(110, 0)).toBeUndefined();
  });
});

describe('NsInsightCardComponent', () => {
  const insight: InsightResponse = {
    id: 'i-1',
    tipo: 'CARBOHIDRATOS_ENTRENO_BAJOS',
    severidad: 'ADVERTENCIA',
    titulo: null,
    texto: 'En los días de entrenamiento consumes de media 63 g menos de carbohidratos.',
    periodoDesde: '2026-10-31',
    periodoHasta: '2026-11-27',
    creadoEn: '2026-11-27T03:00:00+01:00',
  };

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] }));

  it('severidad con texto e icono, título por tipo, texto, periodo y botón deshabilitado sin asistente', () => {
    const f = TestBed.createComponent(NsInsightCardComponent);
    f.componentRef.setInput('insight', insight);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.ns-insight__severidad')!.textContent!.trim()).toBe('A revisar');
    expect(el.querySelector('.ns-insight__icono--advertencia svg')).not.toBeNull();
    expect(el.querySelector('[role="heading"]')!.textContent).toContain('Pocos carbohidratos en los días de entreno');
    expect(el.textContent).toContain('63 g menos');
    expect(el.textContent).toContain('Del 31 oct al 27 nov 2026');
    expect(el.querySelector('button')!.disabled).toBe(true);
  });

  it('con el asistente disponible emite el insight', () => {
    const f = TestBed.createComponent(NsInsightCardComponent);
    f.componentRef.setInput('insight', { ...insight, titulo: 'Te faltan carbohidratos' });
    f.componentRef.setInput('asistenteDisponible', true);
    const emitidos: InsightResponse[] = [];
    f.componentInstance.preguntar.subscribe((i) => emitidos.push(i));
    f.detectChanges();
    (f.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(emitidos[0].id).toBe('i-1');
    expect((f.nativeElement as HTMLElement).textContent).toContain('Te faltan carbohidratos');
  });

  it('periodo del insight', () => {
    expect(textoPeriodoInsight(null, null)).toBeNull();
    expect(textoPeriodoInsight('2026-11-01', null)).toBe('Desde el 1 nov 2026');
  });
});

describe('EstadisticasComponent', () => {
  let http: HttpTestingController;
  const HOY = hoyLocal();
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

  function configurar(insightsActivos: boolean): void {
    // jsdom no tiene IntersectionObserver (@defer on viewport): todo se da por visible.
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
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [
            { path: 'estadisticas', component: EstadisticasComponent },
            { path: 'configuracion/cuenta', children: [] },
            { path: 'comidas/nueva', children: [] },
          ],
          withComponentInputBinding(),
        ),
        provideLucideIcons(...ICONOS_APP),
        { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => Promise.resolve({ init: () => grafico }) } },
        { provide: LayoutService, useValue: { esMovil: signal(false) } },
        { provide: AuthService, useValue: { cuenta: signal({ nombre: 'Álex', insightsActivos }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  }

  const peticiones = (ruta: string): TestRequest[] => http.match((r) => r.url === `${API}${ruta}`);

  /** Responde las peticiones del periodo (y las que sigan llegando, como las de los @defer). */
  async function responder(harness: RouterTestingHarness, estadisticas: EstadisticasResponse): Promise<void> {
    for (let i = 0; i < 3; i++) {
      peticiones('/seguimiento/estadisticas').forEach((r) => r.flush(estadisticas));
      peticiones('/seguimiento/comparativa').forEach((r) =>
        r.flush({ actual: estadisticas, anterior: est({ mediaDiaria: n(2000, 120) }), variacionPct: {} }),
      );
      peticiones('/seguimiento/peso').forEach((r) => r.flush({ puntos: [], variacion: null }));
      peticiones('/entrenamientos/relacion-nutricion').forEach((r) => r.flush(null));
      peticiones('/seguimiento/insights').forEach((r) => r.flush([]));
      await harness.fixture.whenStable();
    }
  }

  it('sin parámetros pide las 4 últimas semanas por día y pinta KPIs, gráficos y tarjetas', async () => {
    configurar(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/estadisticas');
    const [e] = peticiones('/seguimiento/estadisticas');
    expect(e.request.params.get('desde')).toBe(sumarDias(HOY, -27));
    expect(e.request.params.get('hasta')).toBe(HOY);
    expect(e.request.params.get('agrupacion')).toBe('DIA');
    e.flush(est({ desde: sumarDias(HOY, -27), hasta: HOY }));
    await responder(harness, est({ desde: sumarDias(HOY, -27), hasta: HOY }));

    const el = harness.routeNativeElement!;
    const t = el.textContent!.replace(/\s+/g, ' ');
    expect(t).toContain('Tu progreso');
    expect(t).toContain('Energía media');
    expect(t).toContain('94 % del objetivo medio');
    expect(t).toContain('19 de 27 días');
    expect(el.querySelector('app-grafico-energia')).not.toBeNull();
    expect(el.querySelector('app-reparto-macros')).not.toBeNull();
    expect(t).toContain('Aún no hay patrones');
    // Sin comparar, ni comparativa ni variaciones.
    expect(el.querySelector('.ns-metric__delta')).toBeNull();
  });

  it('con 7 días y Comparar usa la comparativa SEMANA y muestra la variación', async () => {
    configurar(false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/estadisticas?periodo=7d&comparar=1');
    const [c] = peticiones('/seguimiento/comparativa');
    expect(c.request.params.get('periodo')).toBe('SEMANA');
    c.flush({ actual: est(), anterior: est({ mediaDiaria: n(2000, 120) }), variacionPct: {} });
    await responder(harness, est({ desde: sumarDias(HOY, -6), hasta: HOY }));

    const el = harness.routeNativeElement!;
    expect(el.textContent).toContain('comparado con la semana anterior');
    expect(el.querySelector('.ns-metric__delta')!.textContent).toMatch(/12\s%/);
    // Insights desactivados: ni petición ni lista, un enlace a Configuración.
    expect(peticiones('/seguimiento/insights')).toEqual([]);
    expect(el.querySelector('a[href="/configuracion/cuenta"]')).not.toBeNull();
  });

  it('el personalizado con Comparar pide las estadísticas del rango anterior', async () => {
    configurar(false);
    const harness = await RouterTestingHarness.create();
    const desde = sumarDias(HOY, -9);
    await harness.navigateByUrl(`/estadisticas?periodo=personalizado&desde=${desde}&hasta=${HOY}&comparar=1`);
    const pedidas = peticiones('/seguimiento/estadisticas');
    const rangos = pedidas.map((r) => [r.request.params.get('desde'), r.request.params.get('hasta')]);
    expect(rangos).toContainEqual([desde, HOY]);
    expect(rangos).toContainEqual([sumarDias(HOY, -19), sumarDias(HOY, -10)]);
    expect(peticiones('/seguimiento/comparativa')).toEqual([]);
    pedidas.forEach((r) => r.flush(est({ desde, hasta: HOY })));
    await responder(harness, est({ desde, hasta: HOY }));
    expect(harness.routeNativeElement!.textContent).toContain('comparado con los 10 días anteriores');
  });

  it('con menos de 2 días con registro muestra el estado vacío', async () => {
    configurar(false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/estadisticas');
    await responder(harness, est({ diasConRegistro: 1 }));
    const el = harness.routeNativeElement!;
    expect(el.textContent).toContain('Aún no hay suficientes datos');
    expect(el.querySelector('app-grafico-energia')).toBeNull();
    expect(el.querySelector('a[href="/comidas/nueva"]')).not.toBeNull();
  });

  it('cambiar el periodo lo guarda en la URL', async () => {
    configurar(false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/estadisticas');
    await responder(harness, est());
    const boton = [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
      (b) => b.textContent!.trim() === '3 meses',
    )!;
    boton.click();
    // La navegación es asíncrona; sin whenStable, que esperaría a las peticiones nuevas.
    await new Promise((resolver) => setTimeout(resolver));
    expect(TestBed.inject(Router).url).toBe('/estadisticas?periodo=3m&agrupacion=SEMANA');
    const [nueva] = peticiones('/seguimiento/estadisticas');
    expect(nueva.request.params.get('agrupacion')).toBe('SEMANA');
    nueva.flush(est({ agrupacion: 'SEMANA' }));
    await responder(harness, est({ agrupacion: 'SEMANA' }));
  });
});
