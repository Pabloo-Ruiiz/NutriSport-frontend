import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import type { Alergeno, ProductoResponse } from '@core/models';
import { NsAllergenListComponent } from '@shared/ui/data/allergen-list.component';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsNutritionFactsComponent } from '@shared/ui/data/nutrition-facts.component';
import { NsAttributionComponent } from '@shared/ui/data/attribution.component';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { AlimentoFormComponent } from '@features/alimentos/alimento-form.component';
import { AnadirAComidaComponent } from './anadir-a-comida.component';
/**
 * Ficha de un producto comercial (DESIGN.md §7.19): imagen, nombre, marca y código de barras,
 * ns-nutrition-facts, ingredientes, ns-allergen-list y, si la información nutricional está
 * completa, el formulario para añadirlo a una comida; si no, "Crear alimento propio". Al pie,
 * la atribución de la fuente.
 */
@Component({
  selector: 'app-ficha-producto',
  imports: [
    LucideDynamicIcon,
    NsAllergenListComponent,
    NsBadgeComponent,
    NsSourceBadgeComponent,
    NsNutritionFactsComponent,
    NsAttributionComponent,
    NsButtonComponent,
    NsAlertComponent,
    AlimentoFormComponent,
    AnadirAComidaComponent,
  ],
  templateUrl: './ficha-producto.component.html',
  styleUrl: './ficha-producto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.compacta]': 'compacta()' },
})
export class FichaProductoComponent {
  readonly producto = input.required<ProductoResponse>();
  readonly compacta = input(false);
  protected readonly creando = signal(false);
  protected readonly creado = signal(false);
  /** La imagen no ha cargado: se muestra el icono. */
  protected readonly sinImagen = signal(false);
  protected readonly unidad = computed(() => (this.producto().unidadBase === 'ML' ? 'ml' : 'g'));
  // La fuente envía los alérgenos como texto: los conocidos se traducen y el resto se muestra tal cual.
  protected readonly contiene = computed(() => this.producto().alergenosContiene as Alergeno[]);
  protected readonly trazas = computed(() => this.producto().alergenosTrazas as Alergeno[]);
  protected readonly valores = computed(() => {
    const p = this.producto().por100;
    return {
      kcal100: p.kcal,
      proteinas100: p.proteinas,
      carbohidratos100: p.carbohidratos,
      grasas100: p.grasas,
      azucares100: p.azucares,
      saturadas100: p.saturadas,
      fibra100: p.fibra,
      sal100: p.sal,
    };
  });
  protected readonly racion = computed(() => {
    const r = this.producto().racion;
    return r?.gramos && r.gramos > 0 ? { nombre: r.descripcion || 'ración', gramos: r.gramos } : null;
  });
}
