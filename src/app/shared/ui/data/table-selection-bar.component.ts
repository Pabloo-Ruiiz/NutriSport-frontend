import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { NsButtonComponent } from '../button/button.component';

/**
 * Barra contextual de la selección de `ns-table` (DESIGN.md §5.9): "3 seleccionadas", las acciones
 * proyectadas y "Quitar selección". La usa ns-table; no hace falta usarla sola.
 */
@Component({
  selector: 'ns-table-seleccion',
  imports: [NsButtonComponent],
  template: `
    <p class="contador" aria-live="polite">{{ texto() }}</p>
    <div class="acciones"><ng-content /></div>
    <button nsButton type="button" variant="ghost" size="sm" icon="x" (click)="quitar.emit()">Quitar selección</button>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-3);
      margin-bottom: var(--ns-space-3);
      padding: var(--ns-space-2) var(--ns-space-4);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-info-bg);
    }
    .contador {
      margin: 0;
      font: 600 0.875rem/1.25rem var(--ns-font-body);
      font-variant-numeric: tabular-nums;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      margin-inline-start: auto;
    }
    .acciones:empty {
      display: none;
    }
  `,
  host: { role: 'region', 'aria-label': 'Acciones de la selección' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsTableSeleccionComponent {
  readonly texto = input.required<string>();
  readonly quitar = output();
}
