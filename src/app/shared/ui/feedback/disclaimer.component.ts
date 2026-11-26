import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

export type NsDisclaimerContext = 'analisis' | 'menu' | 'asistente' | 'receta' | 'objetivos' | 'ia';

/**
 * Textos orientativos por contexto. NutriSport AI no sustituye a un dietista-nutricionista ni
 * ofrece diagnósticos médicos (PROJECT_PROPOSAL.md); el aviso es obligatorio en análisis, menús
 * y asistente (DESIGN.md §5.11), y en la nutrición calculada de las recetas (§7.22).
 */
export const TEXTOS_DISCLAIMER: Record<NsDisclaimerContext, string> = {
  analisis:
    'Estimación orientativa a partir de la foto: revisa los alimentos y las cantidades antes de guardar. ' +
    'No sustituye el consejo de un profesional sanitario o dietista-nutricionista.',
  menu:
    'Menú orientativo generado a partir de tu perfil y tus objetivos. ' +
    'No sustituye el consejo de un profesional sanitario o dietista-nutricionista.',
  asistente:
    'El asistente ofrece información orientativa y puede equivocarse. ' +
    'No sustituye el consejo de un profesional sanitario o dietista-nutricionista.',
  receta:
    'Valores estimados a partir de los ingredientes, no medidos. ' +
    'Estimación orientativa: no sustituye el consejo de un profesional sanitario o dietista-nutricionista.',
  objetivos:
    'Objetivos orientativos calculados con fórmulas estándar a partir de tu perfil. ' +
    'No sustituyen el consejo de un profesional sanitario o dietista-nutricionista.',
  ia:
    'Las funciones de IA ofrecen estimaciones y respuestas orientativas, y pueden equivocarse: revisa siempre el resultado. ' +
    'No sustituyen el consejo de un profesional sanitario o dietista-nutricionista.',
};

/**
 * Aviso orientativo (DESIGN.md §5.11): texto caption con icono info en text-tertiary.
 *
 *   <ns-disclaimer context="analisis" />
 */
@Component({
  selector: 'ns-disclaimer',
  imports: [LucideDynamicIcon],
  template: `
    <svg class="ns-disclaimer__icono" lucideIcon="info" [size]="14" aria-hidden="true"></svg>
    <p class="ns-disclaimer__texto">{{ texto() }}</p>
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      gap: var(--ns-space-2);
      color: var(--ns-text-tertiary);
      font: 500 0.75rem/1rem var(--ns-font-body);
    }
    .ns-disclaimer__icono {
      flex-shrink: 0;
      margin-top: 1px;
    }
  `,
  host: { class: 'ns-disclaimer', role: 'note' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsDisclaimerComponent {
  readonly context = input.required<NsDisclaimerContext>();
  protected readonly texto = computed(() => TEXTOS_DISCLAIMER[this.context()]);
}
