import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ProductoResponse } from '@core/models';
import { NsNutritionFactsComponent } from '@shared/ui/data/nutrition-facts.component';
import { NsAttributionComponent } from '@shared/ui/data/attribution.component';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { AlimentoFormComponent } from '@features/alimentos/alimento-form.component';
import { AnadirAComidaComponent } from './anadir-a-comida.component';
@Component({
  selector: 'app-ficha-producto',
  imports: [
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
})
export class FichaProductoComponent {
  readonly producto = input.required<ProductoResponse>();
  protected readonly creando = signal(false);
  protected readonly creado = signal(false);
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
