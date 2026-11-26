import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { EChartsOption } from 'echarts';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

import { TEMA_ECHARTS, nutrisportTheme } from '@shared/design/echarts-theme';
import { NsChartComponent, conTextoMinimo } from './chart.component';

/** ECharts simulado: jsdom no tiene canvas. */
const grafico = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  isDisposed: () => false,
  on: vi.fn(),
  off: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
};
const init = vi.fn(() => grafico);

@Component({
  imports: [NsChartComponent],
  template: `
    <ns-chart [options]="opciones" ariaLabel="Kcal de la semana: media 2.150" [altura]="200" [loading]="cargando()">
      <table>
        <caption>
          Kcal por día
        </caption>
      </table>
    </ns-chart>
  `,
})
class Anfitrion {
  readonly cargando = signal(false);
  readonly opciones: EChartsOption = {
    xAxis: { type: 'category', data: ['L', 'M'], axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [2000, 2300], label: { show: true, fontSize: 9 } }],
  };
}

describe('NsChartComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;

  // jsdom no tiene ResizeObserver (lo usa autoResize de ngx-echarts).
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

  beforeEach(async () => {
    init.mockClear();
    grafico.setOption.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => Promise.resolve({ init }) } }],
    });
    fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
  });

  const el = () => fixture.nativeElement as HTMLElement;

  it('es una imagen con su aria-label, el alto pedido y la tabla solo para lectores de pantalla', () => {
    const marco = el().querySelector<HTMLElement>('[role="img"]')!;
    expect(marco.getAttribute('aria-label')).toBe('Kcal de la semana: media 2.150');
    expect(marco.style.height).toBe('200px');
    expect(el().querySelector('.ns-sr-only table caption')!.textContent!.trim()).toBe('Kcal por día');
    expect(marco.querySelector('table')).toBeNull();
  });

  it('inicia ECharts con el tema nutrisport, aria activado y ningún texto por debajo de 12 px', () => {
    expect(init).toHaveBeenCalledWith(expect.any(HTMLElement), TEMA_ECHARTS, undefined);
    const opciones = grafico.setOption.mock.calls.at(-1)![0] as EChartsOption;
    expect(opciones.aria).toEqual({ enabled: true });
    expect((opciones.xAxis as { axisLabel: { fontSize: number } }).axisLabel.fontSize).toBe(12);
    expect((opciones.series as { label: { fontSize: number } }[])[0].label.fontSize).toBe(12);
  });

  it('mientras carga muestra un skeleton y lo indica con aria-busy', async () => {
    fixture.componentInstance.cargando.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el().querySelector('ns-skeleton')).not.toBeNull();
    expect(el().querySelector('[echarts]')).toBeNull();
    expect(el().querySelector('[role="img"]')!.getAttribute('aria-busy')).toBe('true');
  });

  it('anima por defecto y, con prefers-reduced-motion, pasa animation: false', async () => {
    const opciones = () => grafico.setOption.mock.calls.at(-1)![0] as EChartsOption;
    expect(opciones().animation).toBeUndefined();

    // jsdom no tiene matchMedia.
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: NGX_ECHARTS_CONFIG, useValue: { echarts: () => Promise.resolve({ init }) } }],
    });
    fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    expect(opciones().animation).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('Tema y texto mínimo', () => {
  it('conTextoMinimo sube los tamaños pequeños sin tocar el original', () => {
    const original = { a: { fontSize: 8 }, b: [{ fontSize: 14 }, { textStyle: { fontSize: 11 } }], f: () => 1 };
    const copia = conTextoMinimo(original);
    expect(copia).toEqual({
      a: { fontSize: 12 },
      b: [{ fontSize: 14 }, { textStyle: { fontSize: 12 } }],
      f: original.f,
    });
    expect(original.a.fontSize).toBe(8);
  });

  it('el tema no tiene ningún texto por debajo de 12 px', () => {
    const tamanos: number[] = [];
    const recorrer = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(recorrer);
      else if (v && typeof v === 'object')
        for (const [k, x] of Object.entries(v)) k === 'fontSize' ? tamanos.push(x as number) : recorrer(x);
    };
    recorrer(nutrisportTheme);
    expect(tamanos.length).toBeGreaterThan(0);
    expect(Math.min(...tamanos)).toBeGreaterThanOrEqual(12);
  });
});
