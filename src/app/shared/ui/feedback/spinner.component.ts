import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';

/**
 * Indicador de carga circular. Toma el color del texto (currentColor).
 *
 * Sin `etiqueta` es decorativo (aria-hidden): quien lo use comunica la carga de otra forma,
 * p. ej. el botón con aria-busy. Con `etiqueta` se anuncia como role="status".
 *
 *   <ns-spinner size="16" />
 *   <ns-spinner [size]="32" etiqueta="Cargando comidas" />
 */
@Component({
  selector: 'ns-spinner',
  template: `
    <svg class="ns-spinner__svg" viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
      <circle class="ns-spinner__pista" cx="12" cy="12" r="9" />
      <circle class="ns-spinner__arco" cx="12" cy="12" r="9" />
    </svg>
    @if (etiqueta()) {
      <span class="ns-sr-only">{{ etiqueta() }}</span>
    }
  `,
  styleUrl: './spinner.component.scss',
  host: {
    class: 'ns-spinner',
    '[attr.role]': 'etiqueta() ? "status" : null',
    '[attr.aria-hidden]': 'etiqueta() ? null : "true"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsSpinnerComponent {
  /** Lado en píxeles (§5.1: 16 px dentro de los botones). */
  readonly size = input(16, { transform: numberAttribute });
  /** Texto para lectores de pantalla. Si se omite, el spinner es decorativo. */
  readonly etiqueta = input<string>();
}
