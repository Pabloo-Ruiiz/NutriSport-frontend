import { ChangeDetectionStrategy, Component, computed, effect, input, output, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { idUnico } from '@shared/ui/form/control-campo';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { formatearNumero } from '@shared/pipes/formato';
import { type LineaComida, MAX_CANTIDAD, gramosDe, unidadesDe } from './comida-editor.store';

/**
 * Un alimento de la comida en construcción (DESIGN.md §7.6): nombre, cantidad (ns-quantity-input),
 * unidad (g/ml, kg/l y las porciones del alimento), kcal estimadas y quitar. Con `error`, la línea
 * se marca y muestra el mensaje (400 en alimentos[i].cantidad o en la unidad).
 */
@Component({
  selector: 'app-linea-alimento',
  imports: [FormsModule, LucideDynamicIcon, NsQuantityInputComponent, NsSelectComponent],
  template: `
    @let l = linea();
    <div class="ns-linea" [class.ns-linea--error]="!!error()" role="group" [attr.aria-labelledby]="idNombre">
      <div class="ns-linea__cabecera">
        <span class="ns-linea__nombre" [id]="idNombre">
          {{ l.alimento.nombre }}
          @if (l.alimento.marca) {
            <span class="ns-linea__marca">{{ l.alimento.marca }}</span>
          }
        </span>
        <span class="ns-linea__kcal ns-tnum">{{ kcal() }} kcal</span>
        <button
          type="button"
          class="ns-linea__quitar"
          [attr.aria-label]="'Quitar ' + l.alimento.nombre"
          (click)="quitar.emit()"
        >
          <svg lucideIcon="x" [size]="18" aria-hidden="true"></svg>
        </button>
      </div>
      <div class="ns-linea__controles">
        <ns-quantity-input
          [ngModel]="l.cantidad"
          (ngModelChange)="cantidad.emit($event ?? 0)"
          [min]="0"
          [max]="maxCantidad"
          [step]="paso()"
          [decimales]="decimales()"
          [etiqueta]="'Cantidad de ' + l.alimento.nombre"
        />
        <ns-select
          class="ns-linea__unidad"
          [ngModel]="l.unidad"
          (ngModelChange)="unidad.emit($event)"
          [opciones]="unidades()"
          [etiqueta]="'Unidad de ' + l.alimento.nombre"
        />
        @if (gramosTexto(); as g) {
          <span class="ns-linea__gramos ns-tnum">{{ g }}</span>
        }
      </div>
      @if (error(); as mensaje) {
        <p class="ns-linea__error" role="alert" [id]="idError">
          <svg lucideIcon="circle-exclamation-point" [size]="14" aria-hidden="true"></svg>
          {{ mensaje }}
        </p>
      }
    </div>
  `,
  styleUrl: './linea-alimento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineaAlimentoComponent {
  readonly linea = input.required<LineaComida>();
  readonly error = input<string | null | undefined>(null);

  readonly cantidad = output<number>();
  readonly unidad = output<string>();
  readonly quitar = output<void>();

  protected readonly idNombre = idUnico('ns-linea');
  protected readonly idError = idUnico('ns-linea-error');
  private readonly campoCantidad = viewChild(NsQuantityInputComponent);

  constructor() {
    // El error se enlaza con la cantidad (aria-describedby), no solo se anuncia con role="alert".
    effect(() => {
      const campo = this.campoCantidad();
      if (!campo) return;
      if (this.error()) campo.anadirDescripcion(this.idError);
      else campo.quitarDescripcion(this.idError);
    });
  }
  protected readonly maxCantidad = MAX_CANTIDAD;

  protected readonly unidades = computed<NsOpcion<string>[]>(() =>
    unidadesDe(this.linea().alimento).map((u) => {
      const porcion = this.linea().alimento.porciones.find((p) => p.nombre === u);
      return { valor: u, etiqueta: porcion ? `${u} (${formatearNumero(porcion.gramos)} g)` : u };
    }),
  );

  private readonly gramos = computed(() => {
    const { alimento, cantidad, unidad } = this.linea();
    return gramosDe(alimento, cantidad, unidad);
  });

  protected readonly kcal = computed(() =>
    formatearNumero(((this.gramos() ?? 0) * this.linea().alimento.kcal100) / 100),
  );

  /** "= 250 g" cuando la unidad no es g ni ml. */
  protected readonly gramosTexto = computed(() => {
    const { unidad, alimento } = this.linea();
    const g = this.gramos();
    if (g === null || unidad === 'g' || unidad === 'ml') return null;
    return `= ${formatearNumero(g)} ${alimento.unidadBase === 'ML' ? 'ml' : 'g'}`;
  });

  /** Paso de los botones − y +: 10 g/ml; 0,1 kg/l; 0,5 porciones. */
  protected readonly paso = computed(() => {
    const u = this.linea().unidad;
    return u === 'g' || u === 'ml' ? 10 : u === 'kg' || u === 'l' ? 0.1 : 0.5;
  });
  protected readonly decimales = computed(() => (this.paso() === 10 ? 0 : 2));
}
