import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { EstadisticasResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsChartComponent } from '@shared/ui/data/chart.component';
import type { NsColorDato } from '@shared/ui/data/colores';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { MACROS, opcionesReparto, tablaReparto } from '../opciones-graficos';
import { TablaGraficoComponent } from './tabla-grafico.component';

const COLOR_BARRA: Record<(typeof MACROS)[number]['clave'], NsColorDato> = {
  proteina: 'protein',
  carbohidratos: 'carbs',
  grasa: 'fat',
};

/**
 * Reparto medio de macronutrientes (DESIGN.md §7.14): anillo con el % de la energía de cada macro y
 * las kcal medias en el centro, y debajo la media de cada macro frente a su objetivo medio.
 */
@Component({
  selector: 'app-reparto-macros',
  imports: [NS_CARD, NsChartComponent, NsProgressBarComponent, TablaGraficoComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Reparto de macronutrientes</h3>
      <p nsCardSubtitulo>Media diaria del periodo</p>
      <div class="ns-reparto__anillo">
        <ns-chart [options]="opciones()" [ariaLabel]="resumen()" [altura]="220">
          <app-tabla-grafico [tabla]="tabla()" />
        </ns-chart>
        <p class="ns-reparto__centro" aria-hidden="true">
          <span class="ns-reparto__kcal ns-tnum">{{ n(estadisticas().mediaDiaria.kcal) }}</span>
          <span class="ns-reparto__unidad">kcal/día</span>
        </p>
      </div>

      <h4 class="ns-reparto__titulo ns-text-overline">Media frente a objetivo</h4>
      <div class="ns-reparto__barras">
        @for (m of barras(); track m.clave) {
          <div class="ns-reparto__fila">
            <span class="ns-reparto__nombre" aria-hidden="true">{{ m.nombre }}</span>
            <ns-progress-bar
              [value]="m.valor"
              [max]="m.objetivo"
              [color]="m.color"
              [etiqueta]="m.nombre"
              unidad="g"
              showLabel
            />
          </div>
        }
      </div>
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-reparto__anillo {
      position: relative;
    }
    .ns-reparto__centro {
      position: absolute;
      top: 45%;
      left: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .ns-reparto__kcal {
      color: var(--ns-text);
      font: 700 1.5rem/1.75rem var(--ns-font-display);
    }
    .ns-reparto__unidad {
      color: var(--ns-text-tertiary);
      font: 500 0.75rem/1rem var(--ns-font-body);
    }
    .ns-reparto__titulo {
      margin: var(--ns-space-4) 0 var(--ns-space-2);
      padding-top: var(--ns-space-4);
      border-top: 1px solid var(--ns-border);
      color: var(--ns-text-tertiary);
    }
    .ns-reparto__barras {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
    }
    .ns-reparto__fila {
      display: grid;
      grid-template-columns: 7.5rem minmax(0, 1fr);
      gap: var(--ns-space-3);
      align-items: center;
    }
    // La barra ya lleva el nombre como etiqueta accesible: el visible es solo visual.
    .ns-reparto__nombre {
      color: var(--ns-text-secondary);
      font: 500 0.875rem/1.25rem var(--ns-font-body);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepartoMacrosComponent {
  readonly estadisticas = input.required<EstadisticasResponse>();

  protected readonly n = formatearNumero;
  protected readonly opciones = computed(() => opcionesReparto(this.estadisticas()));
  protected readonly tabla = computed(() => tablaReparto(this.estadisticas()));
  protected readonly barras = computed(() => {
    const e = this.estadisticas();
    return MACROS.map((m) => ({
      clave: m.clave,
      nombre: m.nombre,
      color: COLOR_BARRA[m.clave],
      valor: Math.round(e.mediaDiaria[m.clave]),
      objetivo: Math.round(e.objetivoMedio?.[m.clave] ?? 0) || Math.max(1, Math.round(e.mediaDiaria[m.clave])),
    }));
  });
  protected readonly resumen = computed(() => {
    const r = this.estadisticas().repartoMacrosPct;
    return (
      `Reparto de la energía media: ${r['proteina'] ?? 0} % proteína, ${r['carbohidratos'] ?? 0} % carbohidratos ` +
      `y ${r['grasa'] ?? 0} % grasa. Detalle en la tabla.`
    );
  });
}
