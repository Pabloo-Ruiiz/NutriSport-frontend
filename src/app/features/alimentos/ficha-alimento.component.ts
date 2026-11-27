import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { Alergeno, AlimentoResponse } from '@core/models';
import { ETIQUETAS_PREPARACION } from '@core/models/etiquetas';
import { formatearNumero } from '@shared/pipes/formato';
import { NsAllergenListComponent } from '@shared/ui/data/allergen-list.component';
import { NsNutritionFactsComponent } from '@shared/ui/data/nutrition-facts.component';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsSourcesNoteComponent } from '@shared/ui/data/sources-note.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';

/**
 * Ficha de un alimento (GET /alimentos/{id}): nombre, marca, categoría, preparación y fuente;
 * ficha nutricional por 100 g/ml; porciones caseras; alérgenos; y aptitudes (vegano, vegetariano,
 * pescetariano, sin lactosa).
 *
 *   <app-ficha-alimento [alimento]="detalle" [restringidos]="misAlergias" />
 */
@Component({
  selector: 'app-ficha-alimento',
  imports: [
    LucideDynamicIcon,
    NsAllergenListComponent,
    NsBadgeComponent,
    NsNutritionFactsComponent,
    NsSourceBadgeComponent,
    NsSourcesNoteComponent,
  ],
  template: `
    @let a = alimento();
    <header class="ns-ficha__cabecera">
      <p class="ns-ficha__nombre ns-text-h3" role="heading" [attr.aria-level]="nivelTitulo()">{{ a.nombre }}</p>
      @if (a.marca) {
        <p class="ns-ficha__marca">{{ a.marca }}</p>
      }
      <div class="ns-ficha__etiquetas">
        <ns-source-badge [fuente]="a.fuente" />
        @if (a.categoriaNombre) {
          <ns-badge>{{ a.categoriaNombre }}</ns-badge>
        }
        @if (preparacion(); as p) {
          <ns-badge>{{ p }}</ns-badge>
        }
        @if (a.propio && !a.validado) {
          <ns-badge variant="info">Sin validar</ns-badge>
        }
      </div>
    </header>

    <section class="ns-ficha__seccion" [attr.aria-label]="'Información nutricional de ' + a.nombre">
      <ns-nutrition-facts [valores]="a" [unidadBase]="a.unidadBase" />
      <ns-sources-note [fuentes]="[a.fuente]" />
    </section>

    @if (a.porciones.length) {
      <section class="ns-ficha__seccion">
        <p class="ns-ficha__titulo" role="heading" [attr.aria-level]="nivelTitulo() + 1">Porciones caseras</p>
        <ul class="ns-ficha__porciones" role="list">
          @for (p of a.porciones; track p.nombre) {
            <li>
              <span>1 {{ p.nombre }}</span>
              <span class="ns-tnum">{{ formatear(p.gramos) }} {{ unidad() }} · {{ kcalPorcion(p.gramos) }} kcal</span>
            </li>
          }
        </ul>
      </section>
    }

    <section class="ns-ficha__seccion">
      <p class="ns-ficha__titulo" role="heading" [attr.aria-level]="nivelTitulo() + 1">Alérgenos</p>
      <ns-allergen-list
        [contiene]="a.alergenosContiene"
        [trazas]="a.alergenosTrazas"
        [revisados]="a.alergenosRevisados"
        [restringidos]="restringidos()"
      />
    </section>

    <section class="ns-ficha__seccion">
      <p class="ns-ficha__titulo" role="heading" [attr.aria-level]="nivelTitulo() + 1">Aptitudes</p>
      <ul class="ns-ficha__aptitudes" role="list">
        @for (apt of aptitudes(); track apt.texto) {
          <li [class.ns-ficha__aptitud--no]="!apt.si">
            <svg [lucideIcon]="apt.si ? 'circle-check' : 'x'" [size]="16" aria-hidden="true"></svg>
            {{ apt.texto }}
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-5);
    }
    .ns-ficha__cabecera {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
    }
    .ns-ficha__nombre,
    .ns-ficha__marca,
    .ns-ficha__titulo {
      margin: 0;
    }
    .ns-ficha__marca {
      color: var(--ns-text-secondary);
    }
    .ns-ficha__etiquetas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      margin-top: var(--ns-space-2);
    }
    .ns-ficha__seccion {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
    }
    .ns-ficha__titulo {
      font-weight: 600;
    }
    .ns-ficha__porciones,
    .ns-ficha__aptitudes {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-ficha__porciones li {
      display: flex;
      justify-content: space-between;
      gap: var(--ns-space-4);
      padding: var(--ns-space-2) 0;
      border-bottom: 1px solid var(--ns-border);
    }
    .ns-ficha__aptitudes {
      gap: var(--ns-space-1);
      li {
        display: flex;
        align-items: center;
        gap: var(--ns-space-2);
        svg {
          color: var(--ns-success);
        }
      }
      .ns-ficha__aptitud--no {
        color: var(--ns-text-secondary);
        svg {
          color: var(--ns-text-tertiary);
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FichaAlimentoComponent {
  readonly alimento = input.required<AlimentoResponse>();
  /** Alérgenos que el usuario tiene restringidos (se destacan). */
  readonly restringidos = input<readonly Alergeno[]>([]);
  /** Nivel del nombre como encabezado (los apartados van un nivel por debajo). */
  readonly nivelTitulo = input(2, { transform: numberAttribute });

  protected readonly formatear = formatearNumero;
  protected readonly unidad = computed(() => (this.alimento().unidadBase === 'ML' ? 'ml' : 'g'));
  protected readonly preparacion = computed(() => {
    const p = this.alimento().preparacion;
    return p ? ETIQUETAS_PREPARACION[p] : null;
  });

  protected readonly aptitudes = computed(() => {
    const a = this.alimento();
    return [
      { si: a.aptoVegano, texto: a.aptoVegano ? 'Apto para veganos' : 'No apto para veganos' },
      { si: a.aptoVegetariano, texto: a.aptoVegetariano ? 'Apto para vegetarianos' : 'No apto para vegetarianos' },
      { si: a.aptoPescetariano, texto: a.aptoPescetariano ? 'Apto para pescetarianos' : 'No apto para pescetarianos' },
      { si: !a.contieneLactosa, texto: a.contieneLactosa ? 'Contiene lactosa' : 'Sin lactosa' },
    ];
  });

  protected kcalPorcion(gramos: number): string {
    return formatearNumero((this.alimento().kcal100 * gramos) / 100);
  }
}
