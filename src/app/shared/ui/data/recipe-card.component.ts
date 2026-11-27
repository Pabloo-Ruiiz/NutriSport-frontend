import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { RecetaResumenResponse } from '@core/models';
import { NsBadgeComponent } from '../feedback/badge.component';
import { NsSpinnerComponent } from '../feedback/spinner.component';
import { NsCalcStatusComponent, estadoCalculo } from './calc-status.component';
import { NsSourceBadgeComponent } from './source-badge.component';

const ENTERO = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

/**
 * Tarjeta de receta del catálogo (DESIGN.md §5.16 y §7.21): imagen 16:9, nombre, categoría y
 * cocina, procedencia, estado del cálculo, compatibilidad con las restricciones del usuario, kcal y
 * proteína por ración ("≈" si el cálculo es aproximado) y botón de favorita.
 *
 *   <ns-recipe-card [receta]="r" (abrir)="abrir(r)" (favoritaCambiada)="alternar(r, $event)" />
 *
 * Toda la tarjeta abre la receta (el nombre es un botón que se extiende sobre ella); el corazón
 * queda por encima y emite el nuevo valor deseado sin cambiar nada por sí mismo: la página llama
 * a RecetasService y actualiza `receta.favorita`. Las de TheMealDB sin importar (id null) muestran
 * "Cálculo pendiente": sus nutrientes se calculan al abrirlas.
 */
@Component({
  selector: 'ns-recipe-card',
  imports: [LucideDynamicIcon, NsBadgeComponent, NsCalcStatusComponent, NsSourceBadgeComponent, NsSpinnerComponent],
  templateUrl: './recipe-card.component.html',
  styleUrl: './recipe-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsRecipeCardComponent {
  readonly receta = input.required<RecetaResumenResponse>();
  /** Nivel del título según la jerarquía de la página. */
  readonly nivelTitulo = input<2 | 3 | 4>(3);
  /** Spinner sobre la imagen mientras se abre (o se importa de TheMealDB). */
  readonly abriendo = input(false);
  /** Desactiva el corazón mientras se guarda el cambio. */
  readonly guardandoFavorita = input(false);

  /** El usuario quiere abrir la receta. */
  readonly abrir = output<void>();
  /** Nuevo valor deseado de favorita (true = marcar, false = quitar). */
  readonly favoritaCambiada = output<boolean>();

  protected readonly estado = computed(() => estadoCalculo(this.receta().estadoNutricional));
  protected readonly aproximado = computed(() => this.estado() === 'APROXIMADO');
  protected readonly deTheMealDb = computed(() => this.receta().origen === 'THEMEALDB');

  protected readonly meta = computed(() => {
    const { categoria, area } = this.receta();
    const partes = [categoria, area].filter((p): p is string => !!p?.trim());
    if (this.deTheMealDb()) partes.push('receta en inglés');
    return partes.join(' · ');
  });

  /** kcal y proteína por ración, o null si no hay nutrición (pendiente o incompleta). */
  protected readonly cifras = computed(() => {
    const n = this.receta().nutricionRacion;
    if (!n || this.estado() === 'PENDIENTE' || this.estado() === 'INCOMPLETO') return null;
    return { kcal: ENTERO.format(n.kcal), proteina: ENTERO.format(n.proteinas) };
  });

  protected alternarFavorita(evento: Event): void {
    evento.stopPropagation();
    this.favoritaCambiada.emit(!this.receta().favorita);
  }
}
