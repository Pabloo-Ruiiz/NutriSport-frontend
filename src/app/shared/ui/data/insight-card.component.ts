import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  numberAttribute,
  output,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { InsightResponse, SeveridadInsight, TipoInsight } from '@core/models';
import { ETIQUETAS_SEVERIDAD_INSIGHT } from '@core/models/etiquetas';
import { formatearFecha } from '@shared/pipes/formato';
import { NsButtonComponent } from '../button/button.component';

/** Icono de cada severidad (el texto de la severidad siempre lo acompaña). */
export const ICONOS_SEVERIDAD_INSIGHT: Record<SeveridadInsight, string> = {
  INFO: 'info',
  POSITIVO: 'circle-check',
  ADVERTENCIA: 'triangle-exclamation-point',
};

/** Título si el insight no trae uno. */
export const TITULOS_TIPO_INSIGHT: Record<TipoInsight, string> = {
  PROTEINA_BAJA: 'Proteína por debajo de tu objetivo',
  CARBOHIDRATOS_ENTRENO_BAJOS: 'Pocos carbohidratos en los días de entreno',
  REPARTO_PROTEINA_BUENO: 'Buen reparto de la proteína',
  DIAS_SIN_REGISTRO: 'Días con menos registros',
  TENDENCIA_PESO: 'Tendencia del peso',
};

/** "Del 1 nov al 28 nov 2026", "Desde el 1 nov 2026"… o null sin periodo. */
export function textoPeriodoInsight(desde: string | null, hasta: string | null): string | null {
  if (desde && hasta) return `Del ${formatearFecha(desde, 'diaMes')} al ${formatearFecha(hasta, 'diaMesAnio')}`;
  if (desde) return `Desde el ${formatearFecha(desde, 'diaMesAnio')}`;
  if (hasta) return `Hasta el ${formatearFecha(hasta, 'diaMesAnio')}`;
  return null;
}

/**
 * Patrón detectado (insight, DESIGN.md §7.14): icono y texto de la severidad, título, texto, periodo
 * y "Preguntar al asistente". Es una fila dentro de una tarjeta `ai` (la lista de estadísticas o la
 * tarjeta "Patrón detectado" del dashboard), así que no lleva su propio borde.
 *
 *   <ns-insight-card [insight]="i" [nivelTitulo]="3" (preguntar)="abrirAsistente($event)" />
 *
 * El botón se muestra deshabilitado hasta que el asistente esté disponible (`asistenteDisponible`).
 */
@Component({
  selector: 'ns-insight-card',
  imports: [LucideDynamicIcon, NsButtonComponent],
  template: `
    <span class="ns-insight__icono" [class]="'ns-insight__icono ns-insight__icono--' + clase()" aria-hidden="true">
      <svg [lucideIcon]="icono()" [size]="18"></svg>
    </span>
    <div class="ns-insight__cuerpo">
      <p class="ns-insight__severidad" [class]="'ns-insight__severidad ns-insight__severidad--' + clase()">
        {{ severidad() }}
      </p>
      <p class="ns-insight__titulo" role="heading" [attr.aria-level]="nivelTitulo()">{{ titulo() }}</p>
      <p class="ns-insight__texto">{{ insight().texto }}</p>
      @if (periodo()) {
        <p class="ns-insight__periodo">{{ periodo() }}</p>
      }
      <div class="ns-insight__acciones">
        <button
          nsButton
          type="button"
          variant="ai"
          size="sm"
          icon="sparkles"
          [disabled]="!asistenteDisponible()"
          [attr.title]="asistenteDisponible() ? null : 'Disponible próximamente'"
          (click)="preguntar.emit(insight())"
        >
          Preguntar al asistente
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      gap: var(--ns-space-3);
      align-items: flex-start;
    }
    .ns-insight__icono {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--ns-radius-md);
    }
    .ns-insight__icono--info {
      background: var(--ns-info-bg);
      color: var(--ns-info);
    }
    .ns-insight__icono--positivo {
      background: var(--ns-success-bg);
      color: var(--ns-success);
    }
    .ns-insight__icono--advertencia {
      background: var(--ns-warning-bg);
      color: var(--ns-warning);
    }
    .ns-insight__cuerpo {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
      min-width: 0;
    }
    .ns-insight__cuerpo p {
      margin: 0;
    }
    .ns-insight__severidad {
      font: 600 0.75rem/1rem var(--ns-font-body);
    }
    .ns-insight__severidad--info {
      color: var(--ns-info);
    }
    .ns-insight__severidad--positivo {
      color: var(--ns-success);
    }
    .ns-insight__severidad--advertencia {
      color: var(--ns-warning);
    }
    .ns-insight__titulo {
      color: var(--ns-text);
      font: 600 0.9375rem/1.375rem var(--ns-font-body);
    }
    .ns-insight__texto {
      color: var(--ns-text-secondary);
      font: 400 0.875rem/1.25rem var(--ns-font-body);
    }
    .ns-insight__periodo {
      color: var(--ns-text-tertiary);
      font: 500 0.75rem/1rem var(--ns-font-body);
    }
    .ns-insight__acciones {
      margin-top: var(--ns-space-2);
    }
  `,
  host: { class: 'ns-insight' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsInsightCardComponent {
  readonly insight = input.required<InsightResponse>();
  /** Nivel del título en la página (por defecto 3). */
  readonly nivelTitulo = input(3, { transform: numberAttribute });
  /** Paso 35: el asistente IA. Hasta entonces, el botón está deshabilitado. */
  readonly asistenteDisponible = input(false, { transform: booleanAttribute });
  readonly preguntar = output<InsightResponse>();

  protected readonly clase = computed(() => this.insight().severidad.toLowerCase());
  protected readonly icono = computed(() => ICONOS_SEVERIDAD_INSIGHT[this.insight().severidad] ?? 'info');
  protected readonly severidad = computed(
    () => ETIQUETAS_SEVERIDAD_INSIGHT[this.insight().severidad] ?? this.insight().severidad,
  );
  protected readonly titulo = computed(
    () => this.insight().titulo || TITULOS_TIPO_INSIGHT[this.insight().tipo] || 'Patrón detectado',
  );
  protected readonly periodo = computed(() =>
    textoPeriodoInsight(this.insight().periodoDesde, this.insight().periodoHasta),
  );
}
