import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import type { EChartsOption } from 'echarts';

import type { PesoResponse, SeriePesoResponse } from '@core/models';
import { SeguimientoService } from '@core/services/seguimiento.service';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { TOKENS } from '@shared/design/tokens';
import { formatearFecha, formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsChartComponent } from '@shared/ui/data/chart.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import {
  type DatosRegistrarPeso,
  RegistrarPesoDialogComponent,
} from '../../perfil/componentes/registrar-peso-dialog.component';

/** Días de la serie de peso del dashboard. */
export const DIAS_PESO = 30;

/** Pesajes (puntos) y media móvil de 7 días (línea) en un eje de fechas. */
export function opcionesPeso(serie: SeriePesoResponse): EChartsOption {
  const fechas = serie.puntos.map((p) => formatearFecha(p.fecha, 'diaMes'));
  return {
    grid: { top: 12, bottom: 4, left: 4, right: 8 },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: unknown) => (typeof v === 'number' ? `${formatearNumero(v, 1)} kg` : '—'),
    },
    xAxis: { type: 'category', data: fechas, boundaryGap: false, axisLabel: { interval: 'auto', hideOverlap: true } },
    yAxis: {
      type: 'value',
      scale: true,
      // ±2 kg alrededor de los datos: con un solo pesaje, ECharts abría el eje de 20 a 120 kg y la línea quedaba plana.
      min: (v: { min: number }) => Math.floor(v.min - 2),
      max: (v: { max: number }) => Math.ceil(v.max + 2),
      splitNumber: 3,
      axisLabel: { formatter: (v: number) => formatearNumero(v, 1) },
    },
    series: [
      {
        name: 'Pesaje',
        type: 'line',
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { width: 0 },
        itemStyle: { color: TOKENS.textTertiary },
        data: serie.puntos.map((p) => p.pesoKg),
      },
      {
        name: 'Media móvil 7 días',
        type: 'line',
        connectNulls: true,
        itemStyle: { color: TOKENS.peso },
        data: serie.puntos.map((p) => p.mediaMovil7),
      },
    ],
  };
}

/**
 * Peso (DESIGN.md §7.4): último pesaje, variación de los últimos 30 días (en tono neutro) y
 * gráfico de pesajes con su media móvil de 7 días. "Registrar peso" abre el diálogo del perfil;
 * al guardar recarga la serie y emite `registrado` (el peso cambia los objetivos).
 */
@Component({
  selector: 'app-tarjeta-peso',
  imports: [NS_CARD, NsAlertComponent, NsButtonComponent, NsChartComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Peso</h3>
      <p nsCardSubtitulo>Media móvil 7 días</p>
      <button nsCardAcciones nsButton type="button" variant="secondary" size="sm" icon="plus" (click)="registrar()">
        Registrar peso
      </button>

      @if (error()) {
        <ns-alert type="error">
          No hemos podido cargar tu peso.
          <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="cargar()">
            Reintentar
          </button>
        </ns-alert>
      } @else if (serie(); as serie) {
        @if (ultimo(); as ultimo) {
          <div class="ns-peso__cifra">
            <p class="ns-peso__valor">
              <span class="ns-text-metric-xl ns-tnum">{{ n(ultimo.pesoKg, 1) }}</span>
              <span class="ns-peso__u">kg</span>
            </p>
            @if (serie.variacion !== null) {
              <p class="ns-peso__variacion ns-tnum">{{ variacion() }} en {{ dias }} días</p>
            }
          </div>
          <ns-chart [options]="opciones()" [ariaLabel]="resumen()" [altura]="150">
            <table>
              <caption>
                Pesajes de los últimos
                {{
                  dias
                }}
                días
              </caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Peso</th>
                  <th scope="col">Media 7 días</th>
                </tr>
              </thead>
              <tbody>
                @for (p of serie.puntos; track p.fecha) {
                  <tr>
                    <th scope="row">{{ fecha(p.fecha) }}</th>
                    <td>{{ n(p.pesoKg, 1) }} kg</td>
                    <td>{{ p.mediaMovil7 === null ? '—' : n(p.mediaMovil7, 1) + ' kg' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </ns-chart>
        } @else {
          <p class="ns-peso__vacio">Aún no hay pesajes en los últimos {{ dias }} días.</p>
        }
      } @else {
        <ns-chart [options]="{}" ariaLabel="Cargando tu peso" [altura]="190" loading />
      }
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-peso__cifra {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--ns-space-2);
      margin-bottom: var(--ns-space-2);
    }
    .ns-peso__valor,
    .ns-peso__variacion,
    .ns-peso__vacio {
      margin: 0;
    }
    .ns-peso__u {
      margin-left: var(--ns-space-1);
      color: var(--ns-text-secondary);
    }
    .ns-peso__variacion {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .ns-peso__vacio {
      color: var(--ns-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaPesoComponent {
  private readonly seguimiento = inject(SeguimientoService);
  private readonly dialogos = inject(NsDialogService);

  readonly registrado = output<PesoResponse>();

  protected readonly dias = DIAS_PESO;
  protected readonly n = formatearNumero;
  protected readonly serie = signal<SeriePesoResponse | null>(null);
  protected readonly error = signal(false);

  protected readonly ultimo = computed(() => this.serie()?.puntos.at(-1) ?? null);
  protected readonly opciones = computed(() => opcionesPeso(this.serie() ?? { puntos: [], variacion: null }));
  /** "−0,6 kg", "+0,3 kg" o "Sin cambios". */
  protected readonly variacion = computed(() => {
    const v = this.serie()?.variacion ?? 0;
    if (Math.abs(v) < 0.05) return 'Sin cambios';
    return `${v > 0 ? '+' : '−'}${formatearNumero(Math.abs(v), 1)} kg`;
  });
  protected readonly resumen = computed(() => {
    const puntos = this.serie()?.puntos ?? [];
    const ultimo = this.ultimo();
    if (!ultimo) return 'Sin pesajes';
    return (
      `Peso de los últimos ${DIAS_PESO} días: ${puntos.length} pesajes, el último de ${formatearNumero(ultimo.pesoKg, 1)} kg` +
      (this.serie()?.variacion !== null ? ` (${this.variacion()}).` : '.')
    );
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    const hoy = hoyLocal();
    this.error.set(false);
    this.seguimiento.seriePeso(sumarDias(hoy, -(DIAS_PESO - 1)), hoy).subscribe({
      next: (serie) => this.serie.set(serie),
      error: () => this.error.set(true),
    });
  }

  protected registrar(): void {
    this.dialogos
      .open<RegistrarPesoDialogComponent, PesoResponse, DatosRegistrarPeso>(RegistrarPesoDialogComponent, {
        titulo: 'Registrar peso',
        size: 'sm',
        data: { pesoKg: this.ultimo()?.pesoKg ?? null },
      })
      .closed.subscribe((pesaje) => {
        if (!pesaje) return;
        this.cargar();
        this.registrado.emit(pesaje);
      });
  }

  protected fecha(f: string): string {
    return formatearFecha(f, 'diaMes');
  }
}
