import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { ProductoResumenResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';

/**
 * Un producto comercial en los resultados del buscador (DESIGN.md §7.19). Toda la tarjeta es un
 * botón que emite `elegido`; `seleccionado` la resalta mientras se ve su ficha. La atribución de
 * Open Food Facts va una vez al pie de la lista.
 */
@Component({
  selector: 'app-producto-item',
  imports: [LucideDynamicIcon, NsBadgeComponent, NsSourceBadgeComponent],
  templateUrl: './producto-item.component.html',
  styleUrl: './producto-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoItemComponent {
  readonly producto = input.required<ProductoResumenResponse>();
  readonly seleccionado = input(false);
  readonly elegido = output<ProductoResumenResponse>();

  /** La imagen no ha cargado: se muestra el icono. */
  protected readonly sinImagen = signal(false);
  protected readonly numero = formatearNumero;
}
