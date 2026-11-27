import { ChangeDetectionStrategy, Component, booleanAttribute, computed, forwardRef, input } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsControlCampo, idUnico } from './control-campo';
import { NsComparador, NsControlValor, NsOpcion } from './control-valor';

/**
 * Grupo de chips seleccionables (restricciones, deportes; DESIGN.md §5.4).
 *
 * - `multiple` (varias a la vez): el valor es un array, [] si no hay ninguno.
 * - Sin `multiple` (una sola): el valor es la opción elegida o null; pulsar la marcada la desmarca.
 *
 * Cada chip es un botón con aria-pressed y un check visible cuando está marcado (el estado no
 * depende solo del color).
 *
 *   <ns-form-field label="Restricciones alimentarias">
 *     <ns-chip-group formControlName="restricciones" [opciones]="restricciones" multiple />
 *   </ns-form-field>
 *
 * Con `desplazable`, los chips van en una sola fila con scroll horizontal (categorías de recetas).
 */
@Component({
  selector: 'ns-chip-group',
  imports: [LucideDynamicIcon],
  template: `
    <div
      role="group"
      class="ns-chip-group__lista"
      [id]="idControl()"
      [attr.aria-labelledby]="idEtiqueta()"
      [attr.aria-label]="idEtiqueta() ? null : etiqueta()"
      [attr.aria-describedby]="describedBy()"
    >
      @for (opcion of opciones(); track $index) {
        @let marcada = estaMarcada(opcion.valor);
        <button
          type="button"
          class="ns-chip"
          [class.ns-chip--marcado]="marcada"
          [attr.aria-pressed]="marcada"
          [disabled]="deshabilitado() || !!opcion.deshabilitada"
          (click)="alternar(opcion.valor)"
          (blur)="tocar()"
        >
          @if (marcada) {
            <svg lucideIcon="check" [size]="16" aria-hidden="true"></svg>
          } @else if (opcion.icono) {
            <svg [lucideIcon]="opcion.icono" [size]="16" aria-hidden="true"></svg>
          }
          {{ opcion.etiqueta }}
        </button>
      }
    </div>
  `,
  styleUrl: './chip-group.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NsChipGroupComponent), multi: true },
    { provide: NsControlCampo, useExisting: forwardRef(() => NsChipGroupComponent) },
  ],
  host: { class: 'ns-chip-group', '[class.ns-chip-group--desplazable]': 'desplazable()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsChipGroupComponent<T = unknown> extends NsControlValor<T | T[]> {
  readonly opciones = input.required<readonly NsOpcion<T>[]>();
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Una sola fila con scroll horizontal en lugar de varias líneas. */
  readonly desplazable = input(false, { transform: booleanAttribute });
  /** Nombre accesible del grupo cuando no está dentro de ns-form-field. */
  readonly etiqueta = input<string>();
  readonly compararCon = input<NsComparador<T>>(Object.is);

  readonly etiquetable = false;
  private readonly idGrupo = idUnico('ns-chip-group');
  readonly idControl = computed(() => this.idGrupo);

  /** Valores marcados, como lista en los dos modos. */
  private readonly marcados = computed<readonly T[]>(() => {
    const valor = this.valor();
    if (valor === null) return [];
    if (this.multiple()) return Array.isArray(valor) ? valor : [];
    return [valor as T];
  });

  protected estaMarcada(valor: T): boolean {
    const comparar = this.compararCon();
    return this.marcados().some((marcado) => comparar(marcado, valor));
  }

  protected alternar(valor: T): void {
    if (this.deshabilitado()) return;
    const comparar = this.compararCon();
    const marcada = this.estaMarcada(valor);

    if (this.multiple()) {
      const actuales = this.marcados();
      // Se mantiene el orden de las opciones, no el de los clics.
      const siguientes = this.opciones()
        .map((opcion) => opcion.valor)
        .filter((v) => (comparar(v, valor) ? !marcada : actuales.some((a) => comparar(a, v))));
      this.emitir(siguientes);
    } else {
      this.emitir(marcada ? null : valor);
    }
  }
}
