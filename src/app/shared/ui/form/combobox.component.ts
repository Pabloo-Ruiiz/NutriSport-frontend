import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  contentChild,
  forwardRef,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { Observable } from 'rxjs';

import { BusquedaReactiva } from './busqueda';
import { NsControlCampo, idUnico } from './control-campo';

/** Contexto de la plantilla de opción: el elemento, su índice y el texto buscado. */
export interface NsComboboxContexto<T> {
  $implicit: T;
  indice: number;
  consulta: string;
}

/**
 * Plantilla de cada opción de ns-combobox:
 *
 *   <ng-template nsComboboxOpcion let-alimento let-consulta="consulta">…</ng-template>
 */
@Directive({ selector: 'ng-template[nsComboboxOpcion]' })
export class NsComboboxOpcionDirective<T> {
  readonly plantilla = inject<TemplateRef<NsComboboxContexto<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(_dir: NsComboboxOpcionDirective<T>, ctx: unknown): ctx is NsComboboxContexto<T> {
    return true;
  }
}

/** Partes de un texto con las que coinciden con la consulta marcadas (sin distinguir tildes ni mayúsculas). */
export function partesResaltadas(texto: string, consulta: string): { texto: string; coincide: boolean }[] {
  const q = normalizar(consulta.trim());
  if (!q) return [{ texto, coincide: false }];
  const base = normalizar(texto);
  const partes: { texto: string; coincide: boolean }[] = [];
  let desde = 0;
  for (let i = base.indexOf(q); i !== -1; i = base.indexOf(q, i + q.length)) {
    if (i > desde) partes.push({ texto: texto.slice(desde, i), coincide: false });
    partes.push({ texto: texto.slice(i, i + q.length), coincide: true });
    desde = i + q.length;
  }
  if (desde < texto.length) partes.push({ texto: texto.slice(desde), coincide: false });
  return partes.length ? partes : [{ texto, coincide: false }];
}

/** Minúsculas y sin tildes, conservando la longitud (para que los índices sirvan en el original). */
function normalizar(texto: string): string {
  // split('') y no [...texto]: los índices tienen que coincidir con los de slice() (UTF-16).
  return texto
    .split('')
    .map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-ES')[0] ?? c)
    .join('');
}

/** Texto con la coincidencia en negrita (DESIGN.md §5.4). `<ns-resaltado [texto]="a.nombre" [consulta]="consulta" />` */
@Component({
  selector: 'ns-resaltado',
  // Cada parte va en su elemento: así los espacios entre ellas (saltos de línea de la plantilla) se
  // descartan y no se cuelan dentro de la palabra ("Plát ano").
  template: `
    @for (p of partes(); track $index) {
      @if (p.coincide) {
        <strong>{{ p.texto }}</strong>
      } @else {
        <span>{{ p.texto }}</span>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsResaltadoComponent {
  readonly texto = input.required<string>();
  readonly consulta = input('');
  protected readonly partes = computed(() => partesResaltadas(this.texto(), this.consulta()));
}

/**
 * Buscador con lista de resultados (DESIGN.md §5.4, patrón ARIA combobox con listbox):
 *
 *   <ns-form-field label="Alimento">
 *     <ns-combobox [buscar]="buscarAlimentos" [textoOpcion]="nombre" (seleccionado)="anadir($event)">
 *       <ng-template nsComboboxOpcion let-a let-consulta="consulta">
 *         <ns-resaltado [texto]="a.nombre" [consulta]="consulta" /> · {{ a.kcal100 }} kcal
 *       </ng-template>
 *     </ns-combobox>
 *   </ns-form-field>
 *
 * - Busca con debounce (250 ms), distinctUntilChanged y switchMap: una búsqueda nueva cancela la
 *   anterior. Con menos de `minCaracteres` no busca.
 * - Estados anunciados (aria-live): buscando, n resultados, sin resultados, error (con reintento).
 * - ↓ ↑ mueven la opción activa (aria-activedescendant), Enter la elige, Escape cierra la lista
 *   (y la segunda vez borra el texto).
 * - No es un control de formulario: emite `seleccionado` y, por defecto, se vacía.
 */
@Component({
  selector: 'ns-combobox',
  imports: [NgTemplateOutlet, LucideDynamicIcon],
  templateUrl: './combobox.component.html',
  styleUrl: './combobox.component.scss',
  providers: [{ provide: NsControlCampo, useExisting: forwardRef(() => NsComboboxComponent) }],
  host: { class: 'ns-combobox' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsComboboxComponent<T> extends NsControlCampo {
  /** Búsqueda: recibe el texto ya recortado y devuelve los resultados. */
  readonly buscar = input.required<(texto: string) => Observable<T[]>>();
  /** Texto de una opción si no hay plantilla (y nombre accesible de la opción elegida). */
  readonly textoOpcion = input<(item: T) => string>((item) => String(item));
  readonly minCaracteres = input(2, { transform: numberAttribute });
  readonly debounceMs = input(250, { transform: numberAttribute });
  readonly placeholder = input('');
  /** Nombre accesible si no está dentro de ns-form-field. */
  readonly etiqueta = input('Buscar');
  /** Vacía el campo al elegir (por defecto). */
  readonly limpiarAlElegir = input(true, { transform: booleanAttribute });
  readonly deshabilitado = input(false, { transform: booleanAttribute });
  readonly id = input<string>();

  readonly seleccionado = output<T>();

  readonly etiquetable = true;
  private readonly idGenerado = idUnico('ns-combobox');
  readonly idControl = computed(() => this.id() || this.idGenerado);
  protected readonly idLista = computed(() => `${this.idControl()}-lista`);
  protected readonly idEstado = computed(() => `${this.idControl()}-estado`);

  protected readonly plantilla = contentChild<NsComboboxOpcionDirective<T>>(NsComboboxOpcionDirective);
  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');

  protected readonly busqueda = new BusquedaReactiva<T>((texto) => this.buscar()(texto), {
    minCaracteres: () => this.minCaracteres(),
    debounceMs: () => this.debounceMs(),
  });

  protected readonly abierto = signal(false);
  protected readonly activo = signal(-1);

  protected readonly listaVisible = computed(
    () => this.abierto() && this.busqueda.estado() === 'resultados' && this.busqueda.resultados().length > 0,
  );

  protected readonly textoEstado = computed(() => {
    switch (this.busqueda.estado()) {
      case 'cargando':
        return 'Buscando…';
      case 'vacia':
        return `Sin resultados para «${this.busqueda.consulta()}».`;
      case 'error':
        return 'No hemos podido buscar.';
      case 'resultados': {
        const n = this.busqueda.resultados().length;
        return n === 1 ? '1 resultado.' : `${n} resultados.`;
      }
      default:
        return this.busqueda.texto().trim().length > 0 ? `Escribe al menos ${this.minCaracteres()} caracteres.` : '';
    }
  });

  /** Lleva el foco al campo de texto. */
  enfocar(): void {
    this.campo().nativeElement.focus();
  }

  protected idOpcion(indice: number): string {
    return `${this.idControl()}-op-${indice}`;
  }

  protected contexto(item: T, indice: number): NsComboboxContexto<T> {
    return { $implicit: item, indice, consulta: this.busqueda.consulta() };
  }

  protected alEscribir(evento: Event): void {
    this.busqueda.escribir((evento.target as HTMLInputElement).value);
    this.abierto.set(true);
    this.activo.set(-1);
  }

  protected alTeclear(evento: KeyboardEvent): void {
    const n = this.busqueda.resultados().length;
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.abierto.set(true);
        if (n) this.activo.set((this.activo() + 1) % n);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.abierto.set(true);
        if (n) this.activo.set(this.activo() <= 0 ? n - 1 : this.activo() - 1);
        break;
      case 'Enter':
        if (this.listaVisible() && this.activo() >= 0) {
          evento.preventDefault();
          this.elegir(this.busqueda.resultados()[this.activo()]);
        }
        break;
      case 'Escape':
        if (this.listaVisible()) {
          evento.preventDefault();
          this.abierto.set(false);
        } else if (this.busqueda.texto()) {
          evento.preventDefault();
          this.vaciar();
        }
        break;
    }
  }

  protected alSalir(evento: FocusEvent): void {
    // Un clic en una opción no cierra la lista antes de elegirla.
    const destino = evento.relatedTarget as Node | null;
    if (!destino || !(evento.currentTarget as HTMLElement).parentElement?.contains(destino)) this.abierto.set(false);
  }

  protected elegir(item: T): void {
    this.seleccionado.emit(item);
    if (this.limpiarAlElegir()) {
      this.vaciar();
    } else {
      this.campo().nativeElement.value = this.textoOpcion()(item);
      this.abierto.set(false);
    }
  }

  protected reintentar(): void {
    this.busqueda.reintentar();
    this.enfocar();
  }

  private vaciar(): void {
    this.campo().nativeElement.value = '';
    this.busqueda.limpiar();
    this.abierto.set(false);
    this.activo.set(-1);
  }
}
