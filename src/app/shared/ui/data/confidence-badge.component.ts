import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { NsBadgeComponent, type NsBadgeVariant } from '../feedback/badge.component';

export type NsNivelConfianza = 'alta' | 'media' | 'baja';

/** Nivel de una confianza 0–1: alta ≥ 0,8, media ≥ 0,5, baja < 0,5 (DESIGN.md §7.8). */
export function nivelConfianza(confianza: number): NsNivelConfianza {
  if (confianza >= 0.8) return 'alta';
  if (confianza >= 0.5) return 'media';
  return 'baja';
}

const VARIANTES: Record<NsNivelConfianza, NsBadgeVariant> = { alta: 'success', media: 'warning', baja: 'error' };

/**
 * Confianza de la IA en un alimento detectado (DESIGN.md §7.8): "Confianza alta · 94 %". El nivel
 * va siempre en el texto, no solo en el color. Sin confianza no muestra nada.
 *
 *   <ns-confidence-badge [confianza]="0.94" />
 */
@Component({
  selector: 'ns-confidence-badge',
  imports: [NsBadgeComponent],
  template: `
    @if (nivel(); as nivel) {
      <ns-badge [variant]="variante()">Confianza {{ nivel }} · {{ porcentaje() }}</ns-badge>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    :host:empty {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsConfidenceBadgeComponent {
  /** Confianza de 0 a 1, o null. */
  readonly confianza = input<number | null>(null);

  protected readonly nivel = computed(() => {
    const c = this.confianza();
    return c === null || !Number.isFinite(c) ? null : nivelConfianza(c);
  });
  protected readonly variante = computed(() => VARIANTES[this.nivel() ?? 'alta']);
  protected readonly porcentaje = computed(() => `${Math.round((this.confianza() ?? 0) * 100)} %`);
}
