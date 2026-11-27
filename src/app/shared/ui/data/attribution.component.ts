import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { FuenteResponse } from '@core/models';
@Component({
  selector: 'ns-attribution',
  templateUrl: './attribution.component.html',
  styleUrl: './attribution.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsAttributionComponent {
  readonly fuente = input.required<FuenteResponse>();
}
