import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';

/**
 * Sustituto de las pantallas que aún no existen. La ruta indica en qué paso de la guía llega:
 *
 *   { path: 'actividad', title: 'Actividad', ...pendiente(17) }
 *
 * `paso` llega de `data` gracias a withComponentInputBinding().
 */
@Component({
  selector: 'app-pagina-pendiente',
  imports: [NsEmptyStateComponent],
  template: ` <ns-empty-state icon="info" [titulo]="titulo" [descripcion]="descripcion()" [nivelTitulo]="2" /> `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 50vh;
      padding: var(--ns-space-6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginaPendienteComponent {
  readonly paso = input<number>();

  protected readonly titulo = inject(ActivatedRoute).snapshot.title ?? 'NutriSport AI';
  protected readonly descripcion = computed(() => {
    const paso = this.paso();
    return paso ? `Pantalla en construcción (paso ${paso})` : 'Pantalla en construcción';
  });
}
