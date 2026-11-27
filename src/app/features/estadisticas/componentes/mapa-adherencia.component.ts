import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import type { EstadisticasResponse } from '@core/models';
import { SeguimientoService } from '@core/services/seguimiento.service';
import { desdeFechaApi, diasEntre } from '@core/util/fechas';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsChartComponent } from '@shared/ui/data/chart.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { CELDA_ADHERENCIA_PX, diasAdherencia, opcionesAdherencia, tablaAdherencia } from '../opciones-graficos';
import { TablaGraficoComponent } from './tabla-grafico.component';

/** Margen del calendario a la izquierda (etiquetas L–D) y a la derecha, en px (ver opcionesAdherencia). */
const MARGEN_X = 40;
/** Alto: etiquetas de los meses + 7 filas + leyenda. */
const ALTO = 28 + 7 * CELDA_ADHERENCIA_PX + 56;

/**
 * Mapa de adherencia (DESIGN.md §7.14): calendario con cada día en objetivo, fuera o sin registro.
 * Necesita la serie por día: si la página agrupa por semana o mes, pide las estadísticas del mismo
 * rango por DIA (solo cuando la tarjeta se ve, porque va en un @defer). En móvil, scroll horizontal.
 */
@Component({
  selector: 'app-mapa-adherencia',
  imports: [NS_CARD, NsAlertComponent, NsChartComponent, TablaGraficoComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Adherencia diaria</h3>
      <p nsCardSubtitulo>Energía respecto al objetivo (±10 %)</p>
      @if (porDia.error()) {
        <ns-alert type="error">No hemos podido cargar el detalle por días.</ns-alert>
      } @else {
        <div class="ns-mapa__scroll" tabindex="0" role="region" aria-label="Mapa de adherencia (desplazable)">
          <div [style.min-width.px]="ancho()">
            <ns-chart [options]="opciones()" [ariaLabel]="resumen()" [altura]="alto" [loading]="!estDia()">
              @if (tabla(); as t) {
                <app-tabla-grafico [tabla]="t" />
              }
            </ns-chart>
          </div>
        </div>
      }
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-mapa__scroll {
      overflow-x: auto;
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaAdherenciaComponent {
  readonly estadisticas = input.required<EstadisticasResponse>();

  private readonly seguimiento = inject(SeguimientoService);
  protected readonly alto = ALTO;

  /** Las mismas estadísticas si ya vienen por día; si no, las del rango por DIA. */
  protected readonly porDia = rxResource({
    params: () => this.estadisticas(),
    stream: ({ params: e }) =>
      e.agrupacion === 'DIA' ? of(e) : this.seguimiento.estadisticas(e.desde, e.hasta, 'DIA'),
  });
  protected readonly estDia = computed(() => (this.porDia.hasValue() ? this.porDia.value() : null));

  protected readonly opciones = computed(() => {
    const e = this.estDia();
    return e ? opcionesAdherencia(e) : {};
  });
  protected readonly tabla = computed(() => {
    const e = this.estDia();
    return e ? tablaAdherencia(e) : null;
  });
  /** Semanas que ocupa el rango (de lunes a domingo) por el tamaño de la celda. */
  protected readonly ancho = computed(() => {
    const e = this.estadisticas();
    const desfase = (desdeFechaApi(e.desde).getDay() + 6) % 7;
    const semanas = Math.ceil((diasEntre(e.desde, e.hasta) + 1 + desfase) / 7);
    return semanas * CELDA_ADHERENCIA_PX + MARGEN_X;
  });
  protected readonly resumen = computed(() => {
    const e = this.estDia();
    if (!e) return 'Cargando la adherencia diaria';
    const dias = diasAdherencia(e);
    const en = dias.filter((d) => d.estado === 'EN_OBJETIVO').length;
    const fuera = dias.filter((d) => d.estado === 'FUERA').length;
    return (
      `Adherencia diaria: ${en} días en objetivo, ${fuera} fuera y ${dias.length - en - fuera} sin registro ` +
      `de ${dias.length}. Detalle en la tabla.`
    );
  });
}
