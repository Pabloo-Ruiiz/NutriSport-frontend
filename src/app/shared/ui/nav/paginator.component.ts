import { ChangeDetectionStrategy, Component, computed, input, model, numberAttribute } from '@angular/core';

import { NsButtonComponent } from '../button/button.component';

/**
 * Paginación simple: "Anterior" · "Página 2 de 7" · "Siguiente". `page` empieza en 0, como en la
 * API (NutriSport_API.md, respuestas paginadas); el texto la muestra desde 1.
 *
 *   <ns-paginator [(page)]="pagina" [totalPages]="respuesta.totalPages" />
 *   <ns-paginator [page]="pagina()" [totalPages]="7" (pageChange)="cargar($event)" />
 *
 * Con una sola página (o ninguna) no se pinta.
 */
@Component({
  selector: 'ns-paginator',
  imports: [NsButtonComponent],
  template: `
    @if (totalPages() > 1) {
      <nav class="ns-paginator" [attr.aria-label]="etiqueta()">
        <button
          nsButton
          type="button"
          variant="secondary"
          size="sm"
          icon="chevron-left"
          [disabled]="esPrimera()"
          (click)="ir(paginaActual() - 1)"
        >
          Anterior
        </button>
        <p class="ns-paginator__texto" aria-live="polite">
          Página <strong>{{ paginaActual() + 1 }}</strong> de {{ totalPages() }}
        </p>
        <button
          nsButton
          type="button"
          variant="secondary"
          size="sm"
          icon="chevron-right"
          iconPosition="end"
          [disabled]="esUltima()"
          (click)="ir(paginaActual() + 1)"
        >
          Siguiente
        </button>
      </nav>
    }
  `,
  styles: `
    .ns-paginator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ns-space-3);
    }
    .ns-paginator__texto {
      color: var(--ns-text-secondary);
      font: 400 0.875rem/1.25rem var(--ns-font-body);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .ns-paginator__texto strong {
      color: var(--ns-text);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsPaginatorComponent {
  /** Página actual, desde 0; admite [(page)] y emite pageChange. */
  readonly page = model(0);
  readonly totalPages = input(0, { transform: numberAttribute });
  readonly etiqueta = input('Paginación');

  /** Página dentro del rango aunque llegue una fuera de él. */
  protected readonly paginaActual = computed(() =>
    Math.min(Math.max(this.page(), 0), Math.max(this.totalPages() - 1, 0)),
  );
  protected readonly esPrimera = computed(() => this.paginaActual() === 0);
  protected readonly esUltima = computed(() => this.paginaActual() >= this.totalPages() - 1);

  protected ir(pagina: number): void {
    const destino = Math.min(Math.max(pagina, 0), this.totalPages() - 1);
    if (destino !== this.page()) this.page.set(destino);
  }
}
