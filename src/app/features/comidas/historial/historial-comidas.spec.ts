import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { LayoutService } from '@core/layout/layout.service';
import type { ComidasDiaResponse, RegistroComidaResponse } from '@core/models';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { environment } from '@env/environment';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { peticionDesdeRespuesta } from '../componentes/comida-util';
import { errorRango } from './filtros-historial.component';
import { HistorialComidasComponent } from './historial-comidas.component';
import { HistorialComidasStore } from './historial-comidas.store';

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, textarea, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

const URL = `${environment.apiUrl}/comidas`;
const HOY = hoyLocal();
const AYER = sumarDias(HOY, -1);

function comida(id: string, fecha: string, cambios: Partial<RegistroComidaResponse> = {}): RegistroComidaResponse {
  return {
    id,
    fecha,
    hora: '08:30:00',
    tipoComida: 'DESAYUNO',
    origen: 'MANUAL',
    notas: 'Antes de entrenar',
    alimentos: [
      {
        id: `${id}-a`,
        alimentoId: 'avena',
        nombre: 'Avena',
        cantidad: 60,
        unidad: 'g',
        gramos: 60,
        kcal: 230,
        proteina: 8,
        carbohidratos: 40,
        grasa: 4,
        origenIa: false,
        confianzaIa: null,
      },
    ],
    totales: { kcal: 400, proteina: 8, carbohidratos: 40, grasa: 4 },
    avisos: [],
    ...cambios,
  };
}

function dia(fecha: string, comidas: RegistroComidaResponse[]): ComidasDiaResponse {
  return {
    fecha,
    comidas,
    totales: { kcal: comidas.reduce((s, c) => s + c.totales.kcal, 0), proteina: 0, carbohidratos: 0, grasa: 0 },
  };
}

const esMovil = signal(false);
let http: HttpTestingController;

function historial(): TestRequest[] {
  return http.match((r) => r.method === 'GET' && r.url === URL);
}

async function crear(dias: ComidasDiaResponse[] = []): Promise<ComponentFixture<HistorialComidasComponent>> {
  const fixture = TestBed.createComponent(HistorialComidasComponent);
  fixture.detectChanges();
  const [req] = historial();
  expect(req.request.params.get('desde')).toBe(sumarDias(HOY, -29));
  expect(req.request.params.get('hasta')).toBe(HOY);
  expect(req.request.params.has('tipo')).toBe(false);
  req.flush(dias);
  await fixture.whenStable();
  return fixture;
}

function texto(fixture: ComponentFixture<unknown>): string {
  return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
}

beforeEach(() => {
  esMovil.set(false);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

describe('HistorialComidasComponent', () => {
  it('carga los últimos 30 días, agrupa por día (el más reciente primero) y resume el periodo', async () => {
    const fixture = await crear([
      dia(AYER, [comida('c1', AYER)]),
      dia(HOY, [
        comida('c2', HOY),
        comida('c3', HOY, {
          hora: '14:00:00',
          tipoComida: 'COMIDA',
          totales: { kcal: 800, proteina: 0, carbohidratos: 0, grasa: 0 },
        }),
      ]),
    ]);
    const fechas = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.ns-historial__fecha')].map((h) =>
      h.textContent!.trim(),
    );
    expect(fechas[0]).toMatch(/^Hoy · /);
    expect(fechas[1]).toMatch(/^Ayer · /);
    expect(texto(fixture)).toContain('1.200 kcal');
    // (1.200 + 400) / 2 días
    expect(texto(fixture)).toMatch(/800 ?kcal por día con comidas/);
    expect(fixture.nativeElement.querySelectorAll('app-meal-card').length).toBe(3);
  });

  it('muestra el estado vacío con "Registrar comida" y el error con "Reintentar"', async () => {
    const fixture = await crear([]);
    expect(texto(fixture)).toContain('Aún no hay comidas en estas fechas');
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/comidas/nueva"]')).not.toBeNull();

    fixture.debugElement.injector.get(HistorialComidasStore).cargar();
    historial()[0].flush({ title: 'Error', detail: 'Servidor caído' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(texto(fixture)).toContain('No hemos podido cargar tus comidas');
    expect(texto(fixture)).toContain('Reintentar');
  });

  it('el tipo se pide al servidor; el origen se filtra en el cliente', async () => {
    const fixture = await crear([dia(HOY, [comida('c1', HOY), comida('c2', HOY, { origen: 'FOTO' })])]);
    const store = fixture.debugElement.injector.get(HistorialComidasStore);

    store.aplicarFiltros({ ...store.filtros(), origenes: ['FOTO'] });
    expect(historial().length).toBe(0);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-meal-card').length).toBe(1);

    store.aplicarFiltros({ ...store.filtros(), tipo: 'CENA' });
    const [req] = historial();
    expect(req.request.params.get('tipo')).toBe('CENA');
    req.flush([]);
    await fixture.whenStable();
    expect(texto(fixture)).toContain('Ninguna comida coincide con los filtros');
  });

  it('"Cargar 30 días más" pide los 30 días anteriores y los añade', async () => {
    const fixture = await crear([dia(HOY, [comida('c1', HOY)])]);
    const boton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Cargar 30 días más'),
    )!;
    boton.click();
    const [req] = historial();
    expect(req.request.params.get('desde')).toBe(sumarDias(HOY, -59));
    expect(req.request.params.get('hasta')).toBe(sumarDias(HOY, -30));
    const antiguo = sumarDias(HOY, -40);
    req.flush([dia(antiguo, [comida('c0', antiguo)])]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-meal-card').length).toBe(2);
  });

  it('eliminar quita la tarjeta al momento; "Deshacer" la vuelve a registrar con POST /comidas', async () => {
    const original = comida('c1', HOY);
    const fixture = await crear([dia(HOY, [original])]);
    const store = fixture.debugElement.injector.get(HistorialComidasStore);
    const componente = fixture.componentInstance as unknown as { eliminar(c: RegistroComidaResponse): void };

    componente.eliminar(original);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-meal-card').length).toBe(0);
    const borrar = http.expectOne(`${URL}/c1`);
    expect(borrar.request.method).toBe('DELETE');
    borrar.flush(null, { status: 204, statusText: 'No Content' });

    const toast = TestBed.inject(NsToastService).visibles().at(-1)!;
    expect(toast.titulo).toBe('Comida eliminada');
    expect(toast.accion?.texto).toBe('Deshacer');
    toast.accion!.ejecutar();

    const registrar = http.expectOne((r) => r.method === 'POST' && r.url === URL);
    expect(registrar.request.body).toEqual({
      fecha: HOY,
      hora: '08:30:00',
      tipoComida: 'DESAYUNO',
      notas: 'Antes de entrenar',
      alimentos: [{ alimentoId: 'avena', cantidad: 60, unidad: 'g' }],
    });
    registrar.flush(comida('c9', HOY), { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(store.diasVisibles()[0].comidas.map((c) => c.id)).toEqual(['c9']);
  });

  it('si el DELETE falla, la comida vuelve a su sitio', async () => {
    const original = comida('c1', HOY);
    const fixture = await crear([dia(HOY, [original])]);
    (fixture.componentInstance as unknown as { eliminar(c: RegistroComidaResponse): void }).eliminar(original);
    http.expectOne(`${URL}/c1`).flush({ title: 'Error' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-meal-card').length).toBe(1);
    expect(TestBed.inject(NsToastService).visibles().at(-1)!.tipo).toBe('error');
  });

  it('en móvil los filtros se abren en un bottom sheet', async () => {
    esMovil.set(true);
    const fixture = await crear([]);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-filtros-historial')).toBeNull();
    [...host.querySelectorAll('button')].find((b) => b.textContent!.includes('Filtros'))!.click();
    await new Promise((r) => setTimeout(r));
    expect(document.querySelector('.cdk-overlay-container app-filtros-historial')).not.toBeNull();
  });
});

describe('HistorialComidasStore', () => {
  it('parte en tramos de 92 días los rangos más largos', () => {
    const store = TestBed.runInInjectionContext(() => new HistorialComidasStore());
    store.filtros.set({ desde: '2026-01-01', hasta: '2026-12-31', tipo: null, origenes: [] });
    store.cargar();
    const reqs = historial();
    expect(reqs.map((r) => [r.request.params.get('desde'), r.request.params.get('hasta')])).toEqual([
      ['2026-10-01', '2026-12-31'],
      ['2026-07-01', '2026-09-30'],
      ['2026-03-31', '2026-06-30'],
      ['2026-01-01', '2026-03-30'],
    ]);
    reqs.forEach((r) => r.flush([]));
    expect(store.estado()).toBe('listo');
  });
});

describe('errorRango', () => {
  it('valida orden, máximo mañana y 92 días', () => {
    const max = sumarDias(HOY, 1);
    expect(errorRango(sumarDias(HOY, -91), HOY, max)).toBeNull();
    expect(errorRango(sumarDias(HOY, -92), HOY, max)).toContain('92 días');
    expect(errorRango(HOY, AYER, max)).toContain('anterior');
    expect(errorRango(HOY, sumarDias(HOY, 2), max)).toContain('mañana');
  });
});

describe('peticionDesdeRespuesta', () => {
  it('omite los alimentos sin alimentoId y usa OTRO si no hay tipo', () => {
    const c = comida('c1', HOY, { tipoComida: null, hora: null, notas: null });
    c.alimentos.push({ ...c.alimentos[0], id: 'x', alimentoId: null, nombre: 'Salsa' });
    expect(peticionDesdeRespuesta(c)).toEqual({
      peticion: { fecha: HOY, tipoComida: 'OTRO', alimentos: [{ alimentoId: 'avena', cantidad: 60, unidad: 'g' }] },
      omitidos: ['Salsa'],
    });
  });
});
