import { ChangeDetectionStrategy, Component, DoCheck, computed, forwardRef, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { EstadoControl, NsControlCampo, idUnico } from './control-campo';
import { NsComparador, NsControlValor, NsOpcion } from './control-valor';

/**
 * Selector de una opción sobre un <select> nativo con el estilo del sistema (DESIGN.md §5.4).
 * El <select> nativo da gratis el teclado, la lista del sistema en móvil y la accesibilidad.
 *
 *   <ns-form-field label="Objetivo">
 *     <ns-select formControlName="objetivo" [opciones]="objetivos" placeholder="Elige tu objetivo" />
 *   </ns-form-field>
 *
 * Los valores pueden ser de cualquier tipo (no solo texto): cada <option> guarda su índice.
 */
@Component({
  selector: 'ns-select',
  imports: [LucideDynamicIcon],
  template: `
    <select
      class="ns-select__nativo"
      [class.ns-select__nativo--vacio]="indice() === -1"
      [class.ns-select__nativo--error]="conError()"
      [id]="idControl()"
      [disabled]="deshabilitado()"
      [attr.aria-invalid]="conError() || null"
      [attr.aria-describedby]="describedBy()"
      (change)="alCambiar($event)"
      (blur)="tocar()"
    >
      @if (placeholder() || indice() === -1) {
        <option value="" [selected]="indice() === -1">{{ placeholder() }}</option>
      }
      @for (opcion of opciones(); track $index) {
        <option [value]="$index" [disabled]="opcion.deshabilitada" [selected]="$index === indice()">
          {{ opcion.etiqueta }}
        </option>
      }
    </select>
    <svg class="ns-select__chevron" lucideIcon="chevron-down" [size]="18" aria-hidden="true"></svg>
  `,
  styleUrl: './select.component.scss',
  providers: [{ provide: NsControlCampo, useExisting: forwardRef(() => NsSelectComponent) }],
  host: { class: 'ns-select' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsSelectComponent<T = unknown> extends NsControlValor<T> implements DoCheck {
  readonly opciones = input<readonly NsOpcion<T>[]>([]);
  /** Texto de la opción vacía. Elegirla deja el valor a null. */
  readonly placeholder = input<string>();
  readonly compararCon = input<NsComparador<T>>(Object.is);
  /** Id del <select>; si no se indica, se genera uno. */
  readonly id = input<string>();

  readonly etiquetable = true;
  private readonly idGenerado = idUnico('ns-select');
  readonly idControl = computed(() => this.id() || this.idGenerado);

  protected readonly indice = computed(() => {
    const valor = this.valor();
    if (valor === null) return -1;
    const comparar = this.compararCon();
    return this.opciones().findIndex((opcion) => comparar(opcion.valor, valor));
  });

  // Se registra como value accessor a mano (en vez de NG_VALUE_ACCESSOR) para poder leer el
  // estado del control y pintar el error, como hace nsInput.
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly estado = new EstadoControl();
  protected readonly conError = this.estado.mostrarError;

  constructor() {
    super();
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngDoCheck(): void {
    this.estado.sincronizar(this.ngControl?.control);
  }

  protected alCambiar(evento: Event): void {
    const texto = (evento.target as HTMLSelectElement).value;
    const opcion = texto === '' ? undefined : this.opciones()[Number(texto)];
    this.emitir(opcion ? opcion.valor : null);
  }
}
