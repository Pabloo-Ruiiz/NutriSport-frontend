import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Signal,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';

import { TEMA_ECHARTS, TEXTO_GRAFICO_PX } from '@shared/design/echarts-theme';
import { NsSkeletonComponent } from '../feedback/skeleton.component';

/**
 * Copia de las opciones con todo `fontSize` por debajo de 12 px subido a 12 (DESIGN.md §5.12:
 * ningún texto de un gráfico por debajo de 12 px). No toca funciones ni el objeto original.
 */
export function conTextoMinimo<T>(valor: T, minimo = TEXTO_GRAFICO_PX): T {
  if (Array.isArray(valor)) return valor.map((v) => conTextoMinimo(v, minimo)) as T;
  if (valor === null || typeof valor !== 'object' || Object.getPrototypeOf(valor) !== Object.prototype) return valor;
  const copia: Record<string, unknown> = {};
  for (const [clave, v] of Object.entries(valor)) {
    copia[clave] = clave === 'fontSize' && typeof v === 'number' && v < minimo ? minimo : conTextoMinimo(v, minimo);
  }
  return copia as T;
}

/**
 * Gráfico de ECharts con el tema `nutrisport` (DESIGN.md §5.12), sobre la directiva de ngx-echarts.
 * ECharts se carga bajo demanda la primera vez (provideEchartsCore en app.config.ts).
 *
 *   <ns-chart [options]="opciones()" ariaLabel="Kcal de los últimos 7 días: media 2.150" [loading]="cargando()">
 *     <table>…los mismos datos en una tabla…</table>
 *   </ns-chart>
 *
 * Accesibilidad: el lienzo es una imagen (role="img") con `ariaLabel` como resumen, y el contenido
 * proyectado (una tabla o un párrafo con los datos) queda solo para lectores de pantalla
 * (ns-sr-only). Ningún texto por debajo de 12 px: se corrige en las opciones.
 */
@Component({
  selector: 'ns-chart',
  imports: [NgxEchartsDirective, NsSkeletonComponent],
  template: `
    <div
      class="ns-chart__marco"
      role="img"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-busy]="loading() || null"
      [style.height]="alto()"
    >
      @if (loading()) {
        <ns-skeleton class="ns-chart__skeleton" shape="rect" width="100%" height="100%" />
      } @else {
        <div class="ns-chart__lienzo" echarts [options]="opciones()" [theme]="tema" [autoResize]="true"></div>
      }
    </div>
    <div class="ns-sr-only"><ng-content /></div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .ns-chart__marco {
      position: relative;
      width: 100%;
    }
    .ns-chart__lienzo,
    .ns-chart__skeleton {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsChartComponent {
  readonly options = input.required<EChartsOption>();
  /** Resumen del gráfico para lectores de pantalla ("Peso de las últimas 8 semanas: de 74 a 72,4 kg"). */
  readonly ariaLabel = input.required<string>();
  /** Alto del gráfico: número en px o medida CSS. */
  readonly altura = input<number | string>(280);
  /** Muestra un skeleton con el mismo alto mientras llegan los datos. */
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly tema = TEMA_ECHARTS;
  protected readonly alto = computed(() => {
    const a = this.altura();
    return typeof a === 'number' ? `${a}px` : a;
  });
  /**
   * Si el usuario pide reducir el movimiento (DESIGN.md §10). ECharts anima por JavaScript, así que
   * la regla global de CSS no le afecta: hay que apagarlo en las opciones.
   */
  private readonly reducirMovimiento = reducirMovimiento();

  /**
   * Las del usuario con aria de ECharts activado, el texto a 12 px como mínimo y, con
   * prefers-reduced-motion, sin animaciones.
   */
  protected readonly opciones = computed<EChartsOption>(() => {
    const opciones = conTextoMinimo(this.options());
    return {
      ...opciones,
      aria: { enabled: true, ...(opciones.aria as object | undefined) },
      ...(this.reducirMovimiento() ? { animation: false } : {}),
    };
  });
}

/** prefers-reduced-motion: reduce como signal (sigue el ajuste del sistema si cambia). */
function reducirMovimiento(): Signal<boolean> {
  const consulta = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;
  const valor = signal(consulta?.matches ?? false);
  if (consulta) {
    const alCambiar = (evento: MediaQueryListEvent) => valor.set(evento.matches);
    consulta.addEventListener?.('change', alCambiar);
    inject(DestroyRef).onDestroy(() => consulta.removeEventListener?.('change', alCambiar));
  }
  return valor.asReadonly();
}
