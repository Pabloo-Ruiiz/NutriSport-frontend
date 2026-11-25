import { Directive, signal } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

import { NsControlCampo } from './control-campo';

/** Opción de ns-select, ns-segmented y ns-chip-group. */
export interface NsOpcion<T> {
  valor: T;
  etiqueta: string;
  /** Nombre de un icono de Lucide (shared/design/iconos.ts). */
  icono?: string;
  deshabilitada?: boolean;
}

/** Comparación de valores de opciones. Por defecto, identidad (Object.is). */
export type NsComparador<T> = (a: T, b: T) => boolean;

/**
 * Base de los controles propios que se usan con formControlName / ngModel: guarda el valor y el
 * estado deshabilitado en signals y avisa al formulario de los cambios hechos por el usuario.
 */
@Directive()
export abstract class NsControlValor<T> extends NsControlCampo implements ControlValueAccessor {
  protected readonly valor = signal<T | null>(null);
  protected readonly deshabilitado = signal(false);

  private alCambiarValor: (valor: T | null) => void = () => {};
  private alTocarControl: () => void = () => {};

  writeValue(valor: T | null): void {
    this.valor.set(valor ?? null);
  }

  registerOnChange(fn: (valor: T | null) => void): void {
    this.alCambiarValor = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocarControl = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  /** Cambio hecho por el usuario: actualiza la vista y el formulario. */
  protected emitir(valor: T | null): void {
    this.valor.set(valor);
    this.alCambiarValor(valor);
  }

  protected tocar(): void {
    this.alTocarControl();
  }
}
