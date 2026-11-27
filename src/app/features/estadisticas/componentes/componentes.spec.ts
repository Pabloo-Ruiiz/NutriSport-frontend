import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import type { InsightResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { environment } from '@env/environment';
import { ICONOS_APP } from '@shared/design/iconos';
import { PatronDetectadoComponent } from '../../dashboard/componentes/patron-detectado.component';
import { type FiltrosEstadisticas, leerFiltros } from '../estadisticas';
import { FiltrosPeriodoComponent } from './filtros-periodo.component';

const HOY = '2026-11-27';

describe('FiltrosPeriodoComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] }));

  function crear(filtros: FiltrosEstadisticas = leerFiltros({}, HOY)) {
    const f = TestBed.createComponent(FiltrosPeriodoComponent);
    f.componentRef.setInput('filtros', filtros);
    f.componentRef.setInput('hoy', HOY);
    const emitidos: FiltrosEstadisticas[] = [];
    f.componentInstance.cambiar.subscribe((v) => emitidos.push(v));
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const opcion = (texto: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((b) => b.textContent!.trim() === texto)!;
    return { f, el, emitidos, opcion };
  }

  function escribir(input: HTMLInputElement, valor: string): void {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('un periodo rápido emite su rango y la agrupación por defecto', () => {
    const { emitidos, opcion } = crear();
    opcion('7 días').click();
    expect(emitidos).toEqual([{ periodo: '7d', desde: '2026-11-21', hasta: HOY, agrupacion: 'DIA', comparar: false }]);
  });

  it('agrupación y comparar cambian solo su campo', () => {
    const { el, emitidos, opcion } = crear();
    opcion('Mes').click();
    (el.querySelector('[role="switch"]') as HTMLButtonElement).click();
    expect(emitidos.map((e) => [e.agrupacion, e.comparar])).toEqual([
      ['MES', false],
      ['DIA', true],
    ]);
  });

  it('Personalizado: con más de 366 días muestra el error y no emite; con un rango válido, sí', async () => {
    const { f, el, emitidos, opcion } = crear();
    opcion('Personalizado').click();
    f.detectChanges();
    // ngModel escribe el valor inicial de las fechas de forma asíncrona.
    await f.whenStable();
    expect(emitidos).toEqual([]);
    const [desde, hasta] = [...el.querySelectorAll<HTMLInputElement>('input[type="date"]')];
    escribir(desde, '2025-01-01');
    escribir(hasta, HOY);
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    f.detectChanges();
    await f.whenStable();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('366 días');
    expect(emitidos).toEqual([]);

    escribir(desde, '2026-11-01');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    f.detectChanges();
    await f.whenStable();
    expect(emitidos).toEqual([
      { periodo: 'personalizado', desde: '2026-11-01', hasta: HOY, agrupacion: 'DIA', comparar: false },
    ]);
  });
});

describe('PatronDetectadoComponent (dashboard)', () => {
  const insight = (id: string): InsightResponse => ({
    id,
    tipo: 'PROTEINA_BAJA',
    severidad: 'INFO',
    titulo: `Insight ${id}`,
    texto: 'Texto',
    periodoDesde: null,
    periodoHasta: null,
    creadoEn: '2026-11-27T03:00:00+01:00',
  });

  function configurar(insightsActivos: boolean): HttpTestingController {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: AuthService, useValue: { cuenta: signal({ insightsActivos }) } },
      ],
    });
    return TestBed.inject(HttpTestingController);
  }

  it('muestra solo el más reciente y se oculta si no hay ninguno', async () => {
    const http = configurar(true);
    const f = TestBed.createComponent(PatronDetectadoComponent);
    f.detectChanges();
    http.expectOne(`${environment.apiUrl}/seguimiento/insights`).flush([insight('a'), insight('b')]);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.hidden).toBe(false);
    expect(el.textContent).toContain('Patrón detectado');
    expect(el.textContent).toContain('Insight a');
    expect(el.textContent).not.toContain('Insight b');
  });

  it('con los insights desactivados no los pide y queda oculta', async () => {
    const http = configurar(false);
    const f = TestBed.createComponent(PatronDetectadoComponent);
    f.detectChanges();
    await f.whenStable();
    http.expectNone(`${environment.apiUrl}/seguimiento/insights`);
    expect((f.nativeElement as HTMLElement).hidden).toBe(true);
  });
});
