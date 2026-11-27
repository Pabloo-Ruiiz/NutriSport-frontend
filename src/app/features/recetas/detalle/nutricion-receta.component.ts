import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import type { Alergeno, RecetaResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAllergenListComponent } from '@shared/ui/data/allergen-list.component';
import { NsCalcStatusComponent } from '@shared/ui/data/calc-status.component';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { DesgloseNutricionComponent, type DesgloseNutricionData } from './desglose-nutricion.component';

interface Cifra {
  clave: 'kcal' | 'protein' | 'carbs' | 'fat';
  valor: string;
  etiqueta: string;
}

/**
 * Nutrición calculada de una receta (DESIGN.md §7.22): kcal, proteínas, hidratos y grasas por
 * ración ("≈" si el cálculo es aproximado; sin cifras si es incompleto), estado y completitud del
 * cálculo, compatibilidad con las restricciones, alérgenos derivados de los ingredientes, aviso
 * orientativo y enlace al desglose por ingrediente.
 */
@Component({
  selector: 'app-nutricion-receta',
  imports: [
    NsAlertComponent,
    NsAllergenListComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsCalcStatusComponent,
    NsDisclaimerComponent,
    NsProgressBarComponent,
  ],
  templateUrl: './nutricion-receta.component.html',
  styleUrl: './nutricion-receta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NutricionRecetaComponent {
  private readonly dialogos = inject(NsDialogService);

  readonly receta = input.required<RecetaResponse>();
  /** Nivel de los títulos según la jerarquía de la página. */
  readonly nivelTitulo = input<2 | 3>(2);

  protected readonly aproximado = computed(() => this.receta().estadoNutricional === 'APROXIMADO');
  protected readonly incompleto = computed(() => this.receta().estadoNutricional === 'INCOMPLETO');

  protected readonly cifras = computed<Cifra[] | null>(() => {
    const n = this.receta().nutricionRacion;
    if (!n || this.incompleto()) return null;
    const prefijo = this.aproximado() ? '≈ ' : '';
    const g = (v: number) => prefijo + formatearNumero(v, v < 10 && !Number.isInteger(v) ? 1 : 0);
    return [
      { clave: 'kcal', valor: g(n.kcal), etiqueta: 'kcal' },
      { clave: 'protein', valor: g(n.proteinas), etiqueta: 'Proteínas (g)' },
      { clave: 'carbs', valor: g(n.carbohidratos), etiqueta: 'Hidratos (g)' },
      { clave: 'fat', valor: g(n.grasas), etiqueta: 'Grasas (g)' },
    ];
  });

  protected readonly subtitulo = computed(() => {
    const { raciones, racionesSupuestas } = this.receta();
    const texto = `${raciones} ${raciones === 1 ? 'ración' : 'raciones'}`;
    return `Por ración · ${texto}${racionesSupuestas ? ' supuestas' : ''}`;
  });

  protected readonly completitud = computed(() => this.receta().completitudPct);
  protected readonly resueltos = computed(() => {
    const ingredientes = this.receta().ingredientes;
    const conDatos = ingredientes.filter((i) => i.estadoConversion !== 'SIN_DATOS').length;
    return `${conDatos} de ${ingredientes.length} ingredientes resueltos`;
  });

  protected readonly alergenos = computed(() => this.receta().alergenos as Alergeno[]);

  protected verDesglose(): void {
    const { id, raciones } = this.receta();
    this.dialogos.open<DesgloseNutricionComponent, unknown, DesgloseNutricionData>(DesgloseNutricionComponent, {
      titulo: 'Cómo se calcula',
      size: 'lg',
      data: { id, raciones },
    });
  }
}
