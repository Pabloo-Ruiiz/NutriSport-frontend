import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Proveedores externos que piden atribución visible (README › Licencias y atribuciones). */
export type NsFuenteExterna = 'THEMEALDB' | 'USDA' | 'OPEN_FOOD_FACTS';

interface DatosFuente {
  nombre: string;
  url: string;
  detalle: string;
}

const FUENTES: Record<NsFuenteExterna, DatosFuente> = {
  OPEN_FOOD_FACTS: {
    nombre: 'Open Food Facts',
    url: 'https://world.openfoodfacts.org',
    detalle: 'productos, bajo licencia ODbL',
  },
  THEMEALDB: { nombre: 'TheMealDB', url: 'https://www.themealdb.com', detalle: 'recetas e imágenes' },
  USDA: { nombre: 'USDA FoodData Central', url: 'https://fdc.nal.usda.gov', detalle: 'datos nutricionales' },
};

/** Orden fijo, sin repetidos, solo los proveedores conocidos. */
const ORDEN: readonly NsFuenteExterna[] = ['OPEN_FOOD_FACTS', 'THEMEALDB', 'USDA'];

/**
 * Atribución de las fuentes externas que aparecen en una lista (Open Food Facts, TheMealDB, USDA).
 * Para un único producto con su FuenteResponse se usa ns-attribution; esta nota va al pie de las
 * listas, una sola vez. Acepta cualquier texto de fuente u origen y se queda con los externos; si
 * no hay ninguno, no pinta nada.
 *
 *   <ns-sources-note [fuentes]="recetas().map((r) => r.origen)" />
 */
@Component({
  selector: 'ns-sources-note',
  template: `
    @if (presentes().length) {
      <p>
        Datos de
        @for (f of presentes(); track f.nombre; let i = $index, total = $count) {
          <a [href]="f.url" target="_blank" rel="noopener"
            >{{ f.nombre }}<span class="ns-sr-only"> (se abre en una pestaña nueva)</span></a
          >
          ({{ f.detalle }}){{ i === total - 1 ? '.' : i === total - 2 ? ' y' : ',' }}
        }
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
      font-size: 0.75rem;
      color: var(--ns-text-secondary);
    }
    :host:empty {
      display: none;
    }
    p {
      margin: 0;
    }
    a {
      color: var(--ns-text-link);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsSourcesNoteComponent {
  readonly fuentes = input.required<readonly (string | null | undefined)[]>();

  protected readonly presentes = computed(() => {
    const dadas = new Set(this.fuentes());
    return ORDEN.filter((f) => dadas.has(f)).map((f) => FUENTES[f]);
  });
}
