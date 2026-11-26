import { Directive, TemplateRef, inject, input } from '@angular/core';

/** Contexto de la plantilla de una celda de `ns-table`. */
export interface NsCeldaContexto<T> {
  /** La fila (`let-fila`). */
  $implicit: T;
  fila: T;
  /** Posición de la fila en `data`, desde 0. */
  indice: number;
}

/**
 * Plantilla de las celdas de una columna de `ns-table`: `nsCelda` es la `clave` de la columna.
 *
 *   <ng-template nsCelda="estado" [nsCeldaDe]="usuarios()" let-u>
 *     <ns-badge>{{ u.estado | etiqueta: 'estadoUsuario' }}</ns-badge>
 *   </ng-template>
 *
 * `nsCeldaDe` solo sirve para tipar `let-u` en la plantilla (pásale los mismos datos que a la
 * tabla); sin él la fila llega como `any`.
 */
@Directive({ selector: 'ng-template[nsCelda]' })
export class NsCeldaDirective<T = any> {
  readonly clave = input.required<string>({ alias: 'nsCelda' });
  /** Solo para inferir el tipo de la fila. */
  readonly de = input<readonly T[] | null | undefined>(undefined, { alias: 'nsCeldaDe' });

  readonly template = inject<TemplateRef<NsCeldaContexto<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(_dir: NsCeldaDirective<T>, ctx: unknown): ctx is NsCeldaContexto<T> {
    return true;
  }
}
