import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import type { OrigenFiltroReceta } from '@core/services/recetas.service';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import {
  FILTROS_AVANZADOS_VACIOS,
  LIMITES_KCAL,
  LIMITES_PROTEINA,
  MAX_TEXTO_RECETAS,
  contarFiltrosActivos,
  leerNumero,
  leerTexto,
  type FiltrosAvanzadosRecetas,
} from './recetas-url';

/**
 * Filtros del catálogo de recetas (DESIGN.md §7.21): ingrediente principal, cocina, origen, franja
 * y los nutricionales "≤ X kcal/ración" y "≥ X g de proteína", que solo se aplican a recetas con
 * cálculo nutricional. No guarda estado: recibe los filtros de la URL y emite cada cambio; los
 * textos y las cifras se aplican al salir del campo o pulsar Intro.
 */
@Component({
  selector: 'app-filtros-recetas',
  imports: [FormsModule, NsButtonComponent, NsFormFieldComponent, NsInputDirective, NsSelectComponent],
  templateUrl: './filtros-recetas.component.html',
  styleUrl: './filtros-recetas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosRecetasComponent {
  readonly filtros = input.required<FiltrosAvanzadosRecetas>();
  /** Filtros que cambian (el resto se mantiene). */
  readonly cambio = output<Partial<FiltrosAvanzadosRecetas>>();

  protected readonly maxTexto = MAX_TEXTO_RECETAS;
  protected readonly kcal = LIMITES_KCAL;
  protected readonly proteina = LIMITES_PROTEINA;
  protected readonly activos = computed(() => contarFiltrosActivos(this.filtros()));

  protected readonly opcionesOrigen: NsOpcion<OrigenFiltroReceta>[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'propia', etiqueta: 'Propias (NutriSport)' },
    { valor: 'themealdb', etiqueta: 'TheMealDB' },
  ];
  protected readonly opcionesFranja: NsOpcion<TipoComida | null>[] = [
    { valor: null, etiqueta: 'Cualquiera' },
    ...ORDEN_TIPOS_COMIDA.map((t) => ({ valor: t, etiqueta: ETIQUETAS_TIPO_COMIDA[t] })),
  ];

  protected cambiarTexto(clave: 'ingrediente' | 'area', evento: Event): void {
    const valor = leerTexto((evento.target as HTMLInputElement).value);
    if (valor !== this.filtros()[clave]) this.cambio.emit({ [clave]: valor });
  }

  protected cambiarNumero(clave: 'maxKcal' | 'minProteina', evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const valor = leerNumero(campo.value, clave === 'maxKcal' ? LIMITES_KCAL : LIMITES_PROTEINA);
    // Un valor fuera de rango se descarta: el campo vuelve a quedar vacío.
    if (valor === null) campo.value = '';
    if (valor !== this.filtros()[clave]) this.cambio.emit({ [clave]: valor });
  }

  protected cambiarOrigen(origen: OrigenFiltroReceta | null): void {
    this.cambio.emit({ origen: origen ?? 'todas' });
  }

  protected cambiarFranja(franja: TipoComida | null): void {
    this.cambio.emit({ franja });
  }

  protected limpiar(): void {
    this.cambio.emit({ ...FILTROS_AVANZADOS_VACIOS });
  }
}
