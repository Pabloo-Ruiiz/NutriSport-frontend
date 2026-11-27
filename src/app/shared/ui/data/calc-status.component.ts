import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { EstadoNutricional } from '@core/models';
import { NsBadgeComponent, type NsBadgeVariant } from '../feedback/badge.component';

/** Estado del cálculo de una receta, o 'PENDIENTE' si aún no está importada (sin cálculo). */
export type NsEstadoCalculo = EstadoNutricional | 'PENDIENTE';

const ESTADOS: Record<NsEstadoCalculo, { texto: string; variante: NsBadgeVariant; icono: string }> = {
  COMPLETO: { texto: 'Calculado', variante: 'info', icono: 'circle-check' },
  APROXIMADO: { texto: 'Aproximado', variante: 'warning', icono: 'triangle-exclamation-point' },
  INCOMPLETO: { texto: 'Cálculo incompleto', variante: 'neutral', icono: 'circle-exclamation-point' },
  PENDIENTE: { texto: 'Cálculo pendiente', variante: 'neutral', icono: 'circle-dashed' },
};

/** Normaliza el estado que llega de la API (en el resumen es un string libre o null). */
export function estadoCalculo(estado: string | null | undefined): NsEstadoCalculo {
  return estado === 'COMPLETO' || estado === 'APROXIMADO' || estado === 'INCOMPLETO' ? estado : 'PENDIENTE';
}

/**
 * Estado del cálculo nutricional de una receta (DESIGN.md §5.16): `info` "Calculado", `warning`
 * "Aproximado · 97 % de la masa", `neutral` "Cálculo incompleto" o "Cálculo pendiente" (no
 * importada). Siempre con icono y texto, nunca solo color. La completitud se añade si llega y el
 * cálculo no es completo.
 *
 *   <ns-calc-status [estado]="receta.estadoNutricional" [completitud]="receta.completitudPct" />
 */
@Component({
  selector: 'ns-calc-status',
  imports: [NsBadgeComponent],
  template: `<ns-badge [variant]="info().variante" [icon]="info().icono">{{ texto() }}</ns-badge>`,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsCalcStatusComponent {
  /** COMPLETO, APROXIMADO, INCOMPLETO; cualquier otro valor (PENDIENTE, null) es "pendiente". */
  readonly estado = input<string | null>(null);
  /** Completitud del cálculo, 0–100: porcentaje de la masa de los ingredientes con nutrientes. */
  readonly completitud = input<number | null>(null);

  protected readonly info = computed(() => ESTADOS[estadoCalculo(this.estado())]);
  protected readonly texto = computed(() => {
    const estado = estadoCalculo(this.estado());
    const pct = this.completitud();
    const conPct = (estado === 'APROXIMADO' || estado === 'INCOMPLETO') && pct !== null && Number.isFinite(pct);
    return conPct ? `${this.info().texto} · ${Math.round(pct)} % de la masa` : this.info().texto;
  });
}
