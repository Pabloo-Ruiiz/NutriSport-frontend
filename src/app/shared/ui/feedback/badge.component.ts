import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

export type NsBadgeVariant =
  'neutral' | 'success' | 'warning' | 'error' | 'info' | 'ai' | 'activity' | 'kcal' | 'protein' | 'carbs' | 'fat';

/**
 * Etiqueta pequeña de estado o categoría (DESIGN.md §5.10): 22 px, radio full, caption 600.
 *
 *   <ns-badge variant="protein">Proteínas</ns-badge>
 *   <ns-badge icon="shield-check">Sin gluten</ns-badge>     (restricciones: neutral + shield-check)
 *   <ns-badge variant="ai" icon="sparkles">Estimación IA</ns-badge>
 *
 * Las variantes de macro usan el tinte de fondo y su color -text (4,5:1). `ai` es solo para IA.
 * El texto siempre acompaña al color: nunca un badge vacío.
 */
@Component({
  selector: 'ns-badge',
  imports: [LucideDynamicIcon],
  template: `
    @if (icon()) {
      <svg [lucideIcon]="icon()!" [size]="12" [strokeWidth]="2.5" aria-hidden="true"></svg>
    }
    <ng-content />
  `,
  styleUrl: './badge.component.scss',
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsBadgeComponent {
  readonly variant = input<NsBadgeVariant>('neutral');
  /** Nombre de un icono de Lucide registrado en shared/design/iconos.ts. */
  readonly icon = input<string>();

  protected readonly classes = computed(() => `ns-badge ns-badge--${this.variant()}`);
}
