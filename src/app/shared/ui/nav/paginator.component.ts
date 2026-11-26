import { ChangeDetectionStrategy, Component, computed, input, model, numberAttribute } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NsButtonComponent } from '../button/button.component';
import { NsOpcion } from '../form/control-valor';
import { NsSelectComponent } from '../form/select.component';

/**
 * Paginación simple: "Anterior" · "Página 2 de 7" · "Siguiente". `page` empieza en 0, como en la
 * API (NutriSport_API.md, respuestas paginadas); el texto la muestra desde 1.
 *
 *   <ns-paginator [(page)]="pagina" [totalPages]="respuesta.totalPages" />
 *   <ns-paginator [page]="pagina()" [totalPages]="7" (pageChange)="cargar($event)" />
 *
 * Con `tamanos` añade el selector de tamaño de página (DESIGN.md §5.9) enlazado a `size`:
 *
 *   <ns-paginator [page]="p.page" [totalPages]="p.totalPages" [size]="p.size" [tamanos]="[10, 20, 50]"
 *                 (pageChange)="irA($event)" (sizeChange)="cambiarTamano($event)" />
 *
 * Cambiar el tamaño no toca `page`: quien lo usa decide (lo normal es volver a la página 0).
 * Sin selector, con una sola página (o ninguna) no se pinta.
 */
@Component({
  selector: 'ns-paginator',
  imports: [FormsModule, NsButtonComponent, NsSelectComponent],
  template: `
    @if (totalPages() > 1 || conTamanos()) {
      <nav class="ns-paginator" [attr.aria-label]="etiqueta()">
        @if (totalPages() > 1) {
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
        }
        @if (conTamanos()) {
          <ns-select
            class="ns-paginator__tamano"
            [etiqueta]="etiquetaTamano()"
            [opciones]="opcionesTamano()"
            [ngModel]="size()"
            (ngModelChange)="cambiarTamano($event)"
          />
        }
      </nav>
    }
  `,
  styles: `
    .ns-paginator {
      display: flex;
      flex-wrap: wrap;
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
    .ns-paginator__tamano {
      width: 150px;
      margin-inline-start: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsPaginatorComponent {
  /** Página actual, desde 0; admite [(page)] y emite pageChange. */
  readonly page = model(0);
  readonly totalPages = input(0, { transform: numberAttribute });
  readonly etiqueta = input('Paginación');
  /** Tamaño de página; admite [(size)] y emite sizeChange. Solo se usa con `tamanos`. */
  readonly size = model<number | null>(null);
  /** Tamaños que se ofrecen (10, 20, 50…). Vacío = sin selector. */
  readonly tamanos = input<readonly number[]>([]);
  readonly etiquetaTamano = input('Elementos por página');

  protected readonly conTamanos = computed(() => this.tamanos().length > 0);
  protected readonly opcionesTamano = computed<NsOpcion<number>[]>(() => {
    const actual = this.size();
    // Si llega un tamaño que no está en la lista, se ofrece igualmente para no mostrar el select vacío.
    const tamanos = actual && !this.tamanos().includes(actual) ? [...this.tamanos(), actual].sort((a, b) => a - b) : this.tamanos();
    return tamanos.map((n) => ({ valor: n, etiqueta: `${n} por página` }));
  });

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

  protected cambiarTamano(tamano: number | null): void {
    if (tamano !== null && tamano !== this.size()) this.size.set(tamano);
  }
}
