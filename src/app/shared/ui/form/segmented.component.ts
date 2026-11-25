import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  viewChildren,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsControlCampo, idUnico } from './control-campo';
import { NsComparador, NsControlValor, NsOpcion } from './control-valor';

/**
 * Control segmentado para 2–4 opciones excluyentes (Día/Semana/Mes; DESIGN.md §5.4).
 *
 * Sigue el patrón ARIA de radiogroup: solo la opción marcada está en el orden de tabulación, las
 * flechas mueven el foco y la selección (con vuelta al principio), e Inicio/Fin van a los extremos.
 *
 *   <ns-segmented formControlName="periodo" [opciones]="periodos" etiqueta="Periodo" />
 *
 * Dentro de ns-form-field toma su etiqueta con aria-labelledby; fuera, usa `etiqueta`.
 */
@Component({
  selector: 'ns-segmented',
  imports: [LucideDynamicIcon],
  template: `
    <div
      role="radiogroup"
      class="ns-segmented__grupo"
      [id]="idControl()"
      [attr.aria-labelledby]="idEtiqueta()"
      [attr.aria-label]="idEtiqueta() ? null : etiqueta()"
      [attr.aria-describedby]="describedBy()"
      [attr.aria-disabled]="deshabilitado() || null"
    >
      @for (opcion of opciones(); track $index; let i = $index) {
        <button
          #opcionBoton
          type="button"
          role="radio"
          class="ns-segmented__opcion"
          [class.ns-segmented__opcion--activa]="i === indice()"
          [attr.aria-checked]="i === indice()"
          [tabIndex]="i === indiceEnfocable() ? 0 : -1"
          [disabled]="deshabilitado() || !!opcion.deshabilitada"
          (click)="seleccionar(i)"
          (keydown)="alTeclear($event, i)"
          (blur)="tocar()"
        >
          @if (opcion.icono) {
            <svg [lucideIcon]="opcion.icono" [size]="16" aria-hidden="true"></svg>
          }
          {{ opcion.etiqueta }}
        </button>
      }
    </div>
  `,
  styleUrl: './segmented.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NsSegmentedComponent), multi: true },
    { provide: NsControlCampo, useExisting: forwardRef(() => NsSegmentedComponent) },
  ],
  host: { class: 'ns-segmented' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsSegmentedComponent<T = unknown> extends NsControlValor<T> {
  readonly opciones = input.required<readonly NsOpcion<T>[]>();
  /** Nombre accesible del grupo cuando no está dentro de ns-form-field. */
  readonly etiqueta = input<string>();
  readonly compararCon = input<NsComparador<T>>(Object.is);

  readonly etiquetable = false;
  private readonly idGrupo = idUnico('ns-segmented');
  readonly idControl = computed(() => this.idGrupo);

  private readonly botones = viewChildren<ElementRef<HTMLButtonElement>>('opcionBoton');

  protected readonly indice = computed(() => {
    const valor = this.valor();
    if (valor === null) return -1;
    const comparar = this.compararCon();
    return this.opciones().findIndex((opcion) => comparar(opcion.valor, valor));
  });

  /** La marcada o, si no hay ninguna, la primera habilitada: la que recibe el Tab. */
  protected readonly indiceEnfocable = computed(() => {
    const indice = this.indice();
    return indice >= 0 ? indice : this.opciones().findIndex((opcion) => !opcion.deshabilitada);
  });

  protected seleccionar(indice: number): void {
    const opcion = this.opciones()[indice];
    if (!opcion || opcion.deshabilitada || this.deshabilitado()) return;
    if (indice !== this.indice()) this.emitir(opcion.valor);
  }

  protected alTeclear(evento: KeyboardEvent, actual: number): void {
    const destino = this.destinoTeclado(evento.key, actual);
    if (destino === null) return;
    evento.preventDefault();
    this.seleccionar(destino);
    this.botones()[destino]?.nativeElement.focus();
  }

  /** Índice al que lleva la tecla, saltando opciones deshabilitadas; null si no es de navegación. */
  private destinoTeclado(tecla: string, actual: number): number | null {
    const total = this.opciones().length;
    const habilitada = (i: number) => !this.opciones()[i].deshabilitada;
    const buscar = (desde: number, paso: 1 | -1): number => {
      for (let n = 1; n <= total; n++) {
        const i = (desde + paso * n + total * n) % total;
        if (habilitada(i)) return i;
      }
      return actual;
    };

    switch (tecla) {
      case 'ArrowRight':
      case 'ArrowDown':
        return buscar(actual, 1);
      case 'ArrowLeft':
      case 'ArrowUp':
        return buscar(actual, -1);
      case 'Home':
        return buscar(-1, 1);
      case 'End':
        return buscar(total, -1);
      default:
        return null;
    }
  }
}
