import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  booleanAttribute,
  computed,
  contentChildren,
  input,
  model,
  numberAttribute,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsTableSeleccionComponent } from './table-selection-bar.component';
import { NsEmptyStateComponent } from '../feedback/empty-state.component';
import { NsCheckboxComponent } from '../form/checkbox.component';
import { NsOpcion } from '../form/control-valor';
import { NsFormFieldComponent } from '../form/form-field.component';
import { NsSelectComponent } from '../form/select.component';
import { NsSkeletonComponent } from '../feedback/skeleton.component';
import { NsCeldaContexto, NsCeldaDirective } from './table-cell.directive';

export type NsAlineacion = 'start' | 'center' | 'end';
export type NsDireccionOrden = 'asc' | 'desc';

/** Columna de `ns-table`. */
export interface NsColumna {
  /** Identifica la columna: nombre de la propiedad (celda por defecto y campo de `sort`) y de su `nsCelda`. */
  clave: string;
  titulo: string;
  /** Si se puede ordenar por ella (la cabecera pasa a ser un botón). */
  ordenable?: boolean;
  /** Ancho CSS ("12rem", "20%"). */
  ancho?: string;
  /** Las cifras van a la derecha ('end', DESIGN.md §5.9). Por defecto 'start'. */
  alinear?: NsAlineacion;
}

/** `sort` de la API ("campo,asc") separado en sus partes. */
export function leerOrden(sort: string | null | undefined): { campo: string; direccion: NsDireccionOrden } | null {
  if (!sort) return null;
  const [campo, dir] = sort.split(',');
  if (!campo) return null;
  return { campo, direccion: dir?.toLowerCase() === 'desc' ? 'desc' : 'asc' };
}

/**
 * Tabla de datos (DESIGN.md §5.9): cabecera surface-muted, filas de 52 px, ordenación por columna,
 * estado de carga (filas skeleton) y vacío y, en móvil (< 768 px), cada fila como tarjeta apilada
 * con "Título: valor".
 *
 *   <ns-table [columns]="columnas" [data]="usuarios()" [(sort)]="orden" [cargando]="cargando()"
 *             etiqueta="Usuarios" textoVacio="No hay usuarios con estos filtros">
 *     <ng-template nsCelda="estado" [nsCeldaDe]="usuarios()" let-u>
 *       <ns-badge>{{ u.estado }}</ns-badge>
 *     </ng-template>
 *   </ns-table>
 *
 * - Sin `nsCelda` para una columna, la celda muestra `fila[clave]` (o "—" si no hay valor).
 * - `sort` sigue el formato de la API ("campo,asc" | "campo,desc"; null = orden por defecto). Al
 *   pulsar una cabecera ordenable: ascendente → descendente → sin orden. La tabla no ordena: quien
 *   la usa vuelve a pedir los datos al cambiar `sort`.
 * - El contenido proyectado con el atributo `nsTablaVacia` se muestra bajo el estado vacío
 *   (p. ej. un botón "Limpiar filtros").
 * - En móvil la cabecera no se ve: si hay columnas ordenables, encima de las tarjetas aparece un
 *   selector "Ordenar por" con el mismo `sort`.
 *
 * Selección (`seleccionable`): una casilla por fila y "seleccionar todo" (las filas de la página)
 * en la cabecera. `seleccion` guarda las claves de `claveFila` (por defecto el `id`) y se conserva
 * al cambiar de página; quien usa la tabla la vacía cuando lo necesite (p. ej. al filtrar). Con
 * algo seleccionado aparece la barra contextual con el número, las acciones proyectadas con
 * `nsTablaAcciones` y "Quitar selección":
 *
 *   <ns-table seleccionable [(seleccion)]="marcados" [etiquetaSeleccion]="nombreDe" …>
 *     <button nsTablaAcciones nsButton size="sm" variant="danger" (click)="bloquear()">Bloquear</button>
 *   </ns-table>
 */
@Component({
  selector: 'ns-table',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    LucideDynamicIcon,
    NsTableSeleccionComponent,
    NsCheckboxComponent,
    NsEmptyStateComponent,
    NsFormFieldComponent,
    NsSelectComponent,
    NsSkeletonComponent,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  host: {
    class: 'ns-table',
    '[class.ns-table--stack]': 'stackOnMobile()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsTableComponent<T> {
  readonly columns = input.required<readonly NsColumna[]>();
  readonly data = input<readonly T[] | null | undefined>([]);
  /** Orden actual "campo,asc|desc"; admite [(sort)] y emite sortChange. */
  readonly sort = model<string | null>(null);
  /** En móvil, filas como tarjetas apiladas (DESIGN.md §5.9). */
  readonly stackOnMobile = input(true, { transform: booleanAttribute });
  readonly cargando = input(false, { transform: booleanAttribute });
  /** Filas skeleton mientras carga. */
  readonly filasCarga = input(5, { transform: numberAttribute });
  /** Nombre accesible de la tabla. */
  readonly etiqueta = input<string>();
  readonly textoVacio = input('No hay resultados');
  readonly descripcionVacio = input<string>();
  readonly iconoVacio = input('search');
  /** Identidad de cada fila para el `track`; por defecto `fila.id` si existe, o la propia fila. */
  readonly claveFila = input<(fila: T) => unknown>((fila) => (fila as { id?: unknown })?.id ?? fila);
  /** Filas pulsables (clic, Intro o Espacio) → `filaPulsada`. Cada fila entra en el orden de tabulación. */
  readonly filasPulsables = input(false, { transform: booleanAttribute });
  readonly filaPulsada = output<T>();

  // ---- Selección
  /** Añade la columna de casillas y la barra de acciones (DESIGN.md §5.9). */
  readonly seleccionable = input(false, { transform: booleanAttribute });
  /** Claves (`claveFila`) de las filas marcadas; admite [(seleccion)]. */
  readonly seleccion = model<readonly unknown[]>([]);
  /** Nombre de la fila para su casilla ("Seleccionar Ana López"); por defecto "fila N". */
  readonly etiquetaSeleccion = input<(fila: T) => string>();

  private readonly celdas = contentChildren(NsCeldaDirective);

  protected readonly plantillas = computed(() => {
    const mapa = new Map<string, TemplateRef<NsCeldaContexto<T>>>();
    for (const celda of this.celdas()) mapa.set(celda.clave(), celda.template as TemplateRef<NsCeldaContexto<T>>);
    return mapa;
  });

  protected readonly filas = computed(() => this.data() ?? []);
  protected readonly orden = computed(() => leerOrden(this.sort()));
  protected readonly vacia = computed(() => !this.cargando() && this.filas().length === 0);
  protected readonly filasSkeleton = computed(() => Array.from({ length: Math.max(1, this.filasCarga()) }, (_, i) => i));

  /** Columnas de la tabla contando la de selección (colspan del estado vacío). */
  protected readonly totalColumnas = computed(() => this.columns().length + (this.seleccionable() ? 1 : 0));

  // ---- Selección
  private readonly marcadas = computed(() => new Set(this.seleccion()));
  private readonly clavesPagina = computed(() => this.filas().map((fila) => this.rastrear(fila)));
  protected readonly todasMarcadas = computed(() => {
    const claves = this.clavesPagina();
    return claves.length > 0 && claves.every((clave) => this.marcadas().has(clave));
  });
  protected readonly algunaMarcada = computed(
    () => !this.todasMarcadas() && this.clavesPagina().some((clave) => this.marcadas().has(clave)),
  );
  protected readonly textoSeleccion = computed(() => {
    const n = this.seleccion().length;
    return n === 1 ? '1 seleccionada' : `${n} seleccionadas`;
  });

  protected estaMarcada(fila: T): boolean {
    return this.marcadas().has(this.rastrear(fila));
  }

  protected nombreFila(fila: T, indice: number): string {
    return this.etiquetaSeleccion()?.(fila) ?? `fila ${indice + 1}`;
  }

  protected marcarFila(fila: T, marcada: boolean | null): void {
    const clave = this.rastrear(fila);
    const resto = this.seleccion().filter((c) => c !== clave);
    this.seleccion.set(marcada ? [...resto, clave] : resto);
  }

  /** Marca o desmarca las filas de esta página; las de otras páginas se quedan como estén. */
  protected marcarPagina(marcada: boolean | null): void {
    const pagina = new Set(this.clavesPagina());
    const resto = this.seleccion().filter((c) => !pagina.has(c));
    this.seleccion.set(marcada ? [...resto, ...pagina] : resto);
  }

  protected quitarSeleccion(): void {
    this.seleccion.set([]);
  }

  // ---- Orden en móvil
  protected readonly opcionesOrden = computed<NsOpcion<string | null>[]>(() => [
    { valor: null, etiqueta: 'Orden por defecto' },
    ...this.columns()
      .filter((col) => col.ordenable)
      .flatMap((col) => [
        { valor: `${col.clave},asc`, etiqueta: `${col.titulo}: ascendente` },
        { valor: `${col.clave},desc`, etiqueta: `${col.titulo}: descendente` },
      ]),
  ]);
  protected readonly hayOrdenables = computed(() => this.columns().some((col) => col.ordenable));
  /** `sort` normalizado ("campo,asc") para que coincida con una opción del selector. */
  protected readonly ordenNormalizado = computed(() => {
    const orden = this.orden();
    return orden ? `${orden.campo},${orden.direccion}` : null;
  });

  protected cambiarOrden(sort: string | null): void {
    if (sort !== this.ordenNormalizado()) this.sort.set(sort);
  }

  protected direccion(col: NsColumna): NsDireccionOrden | null {
    const orden = this.orden();
    return orden?.campo === col.clave ? orden.direccion : null;
  }

  protected ariaSort(col: NsColumna): 'ascending' | 'descending' | 'none' | null {
    if (!col.ordenable) return null;
    const dir = this.direccion(col);
    return dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none';
  }

  protected icono(col: NsColumna): string {
    const dir = this.direccion(col);
    return dir === 'asc' ? 'arrow-up' : dir === 'desc' ? 'arrow-down' : 'arrow-up-down';
  }

  protected ordenar(col: NsColumna): void {
    if (!col.ordenable) return;
    const dir = this.direccion(col);
    this.sort.set(dir === null ? `${col.clave},asc` : dir === 'asc' ? `${col.clave},desc` : null);
  }

  protected rastrear(fila: T): unknown {
    return this.claveFila()(fila);
  }

  protected valor(fila: T, clave: string): string {
    const valor = (fila as Record<string, unknown> | null)?.[clave];
    return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
  }

  protected pulsar(fila: T, evento: Event): void {
    if (!this.filasPulsables()) return;
    // Un botón o enlace dentro de la celda hace lo suyo, no abre la fila.
    const origen = evento.target as HTMLElement | null;
    if (origen?.closest('.ns-table__celda-seleccion')) return;
    const interactivo = origen?.closest('button, a, input, select, textarea, label, [role="button"]');
    if (interactivo && interactivo !== evento.currentTarget) return;
    if (evento.type === 'keydown') {
      if (origen !== evento.currentTarget) return;
      evento.preventDefault();
    }
    this.filaPulsada.emit(fila);
  }

  protected contexto(fila: T, indice: number): NsCeldaContexto<T> {
    return { $implicit: fila, fila, indice };
  }
}
