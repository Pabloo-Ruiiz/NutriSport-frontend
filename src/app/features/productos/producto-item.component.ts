import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ProductoResumenResponse } from '@core/models';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsAttributionComponent } from '@shared/ui/data/attribution.component';
import { formatearNumero } from '@shared/pipes/formato';
@Component({
  selector: 'app-producto-item',
  imports: [NsSourceBadgeComponent, NsAttributionComponent],
  templateUrl: './producto-item.component.html',
  styleUrl: './producto-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoItemComponent {
  readonly producto = input.required<ProductoResumenResponse>();
  readonly elegido = output<ProductoResumenResponse>();
  protected readonly numero = formatearNumero;
}
