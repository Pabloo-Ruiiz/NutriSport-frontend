import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, catchError, combineLatest, of, startWith, switchMap, tap } from 'rxjs';

import type { MapeoIngredienteResponse, Pagina } from '@core/models';
import { ETIQUETAS_METODO_MAPEO } from '@core/models/etiquetas';
import { AdminRecetasService } from '@core/services/admin/admin-recetas.service';
import { aApiError } from '@core/util/api-error';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsCeldaDirective } from '@shared/ui/data/table-cell.directive';
import { NsColumna, NsTableComponent } from '@shared/ui/data/table.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSourcesNoteComponent } from '@shared/ui/data/sources-note.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { NsPaginatorComponent } from '@shared/ui/nav/paginator.component';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import {
  type EmparejarIngredienteData,
  EmparejarIngredienteDialogComponent,
} from './emparejar-ingrediente-dialog.component';

export type FiltroMapeo = 'pendientes' | 'revisados' | 'todos';

/** Por debajo de esta confianza, un emparejamiento automático no se usa en los cálculos (§6). */
export const UMBRAL_CONFIANZA = 0.6;
const TAMANO_PAGINA = 20;

const REVISADO: Record<FiltroMapeo, boolean | null> = { pendientes: false, revisados: true, todos: null };

/** "Emparejado · 3 recetas recalculadas". */
export function textoEmparejado(recalculadas: number): string {
  return `${recalculadas} ${recalculadas === 1 ? 'receta recalculada' : 'recetas recalculadas'}`;
}

/**
 * Emparejamientos de ingredientes (/admin/ingredientes, docs/api/admin.md §6): qué alimento del
 * catálogo corresponde a cada ingrediente de las recetas de TheMealDB. Es lo que completa el
 * cálculo nutricional.
 *
 * - Filtro Pendientes (revisado=false, la cola; por defecto) · Revisados · Todos.
 * - Confianza < 0,6: aviso, porque ese emparejamiento automático no se usa en los cálculos.
 * - "Emparejar" abre EmparejarIngredienteDialogComponent; al guardar, toast con las recetas
 *   recalculadas. En Pendientes, el emparejado sale de la cola (se recarga la página).
 */
@Component({
  selector: 'app-mapeos-ingredientes',
  imports: [
    FormsModule,
    LucideDynamicIcon,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsCeldaDirective,
    NsPaginatorComponent,
    NsSegmentedComponent,
    NsSourcesNoteComponent,
    NsTableComponent,
  ],
  template: `
    <header class="ns-map__cabecera">
      <h2 class="ns-text-h3 ns-map__titulo">Ingredientes</h2>
      <p class="ns-map__ayuda">
        Emparejamientos de los ingredientes de las recetas con los alimentos del catálogo. Revisar la cola completa el
        cálculo nutricional.
      </p>
    </header>

    <ns-segmented
      etiqueta="Qué emparejamientos ver"
      [opciones]="filtros"
      [ngModel]="filtro()"
      (ngModelChange)="cambiarFiltro($event)"
    />

    @if (error(); as mensaje) {
      <ns-alert type="error" titulo="No hemos podido cargar los emparejamientos">
        {{ mensaje }}
        <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="recargas.next()">
          Reintentar
        </button>
      </ns-alert>
    } @else {
      <ns-table
        etiqueta="Emparejamientos de ingredientes"
        [columns]="columnas"
        [data]="filas()"
        [cargando]="cargando() && !pagina()"
        [actualizando]="cargando() && !!pagina()"
        [filasCarga]="8"
        [iconoVacio]="filtro() === 'pendientes' ? 'circle-check' : 'search'"
        [textoVacio]="
          filtro() === 'pendientes' ? 'No hay ingredientes pendientes de revisar' : 'No hay emparejamientos'
        "
      >
        <ng-template nsCelda="nombreNormalizado" [nsCeldaDe]="filas()" let-m>
          <span class="ns-map__nombre">{{ m.nombreNormalizado }}</span>
        </ng-template>
        <ng-template nsCelda="alimentoNombre" [nsCeldaDe]="filas()" let-m>
          @if (m.alimentoNombre) {
            {{ m.alimentoNombre }}
          } @else {
            <span class="ns-text-tertiary">Sin equivalente</span>
          }
        </ng-template>
        <ng-template nsCelda="metodo" [nsCeldaDe]="filas()" let-m>
          <ns-badge [variant]="m.metodo === 'MANUAL' ? 'info' : 'neutral'">{{ metodos[m.metodo] }}</ns-badge>
        </ng-template>
        <ng-template nsCelda="confianza" [nsCeldaDe]="filas()" let-m>
          @if (m.confianza === null) {
            <span class="ns-text-tertiary">—</span>
          } @else if (m.confianza < umbral) {
            <span class="ns-map__baja">
              <svg lucideIcon="triangle-exclamation-point" [size]="16" aria-hidden="true"></svg>
              <span class="ns-tnum">{{ confianza(m.confianza) }}</span>
              <span class="ns-map__nota">No se usa en los cálculos</span>
            </span>
          } @else {
            <span class="ns-tnum">{{ confianza(m.confianza) }}</span>
          }
        </ng-template>
        <ng-template nsCelda="revisado" [nsCeldaDe]="filas()" let-m>
          <ns-badge [variant]="m.revisado ? 'success' : 'warning'" [icon]="m.revisado ? 'circle-check' : undefined">
            {{ m.revisado ? 'Revisado' : 'Pendiente' }}
          </ns-badge>
        </ng-template>
        <ng-template nsCelda="acciones" [nsCeldaDe]="filas()" let-m>
          <button nsButton type="button" variant="ghost" size="sm" icon="pencil" (click)="emparejar(m)">
            Emparejar<span class="ns-sr-only"> {{ m.nombreNormalizado }}</span>
          </button>
        </ng-template>
      </ns-table>
      <ns-sources-note [fuentes]="fuentesIngredientes" />

      @if (pagina(); as p) {
        <footer class="ns-map__pie">
          <p class="ns-map__total ns-tnum" role="status">{{ total() }}</p>
          <ns-paginator
            etiqueta="Páginas de emparejamientos"
            [page]="p.page"
            [totalPages]="p.totalPages"
            (pageChange)="page.set($event)"
          />
        </footer>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--ns-space-4);
    }
    ns-segmented {
      align-self: flex-start;
    }
    .ns-map__titulo {
      margin: 0;
    }
    .ns-map__ayuda {
      margin: var(--ns-space-1) 0 0;
      color: var(--ns-text-secondary);
    }
    .ns-map__nombre {
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .ns-map__baja {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-1);
      color: var(--ns-warning);
    }
    .ns-map__nota {
      font-size: 0.75rem;
    }
    .ns-map__pie {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--ns-space-3);
    }
    .ns-map__total {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapeosIngredientesComponent {
  /** Los ingredientes vienen de las recetas de TheMealDB. */
  protected readonly fuentesIngredientes = ['THEMEALDB'];
  private readonly adminRecetas = inject(AdminRecetasService);
  private readonly dialogos = inject(NsDialogService);
  private readonly toasts = inject(NsToastService);

  protected readonly filtros: NsOpcion<FiltroMapeo>[] = [
    { valor: 'pendientes', etiqueta: 'Pendientes' },
    { valor: 'revisados', etiqueta: 'Revisados' },
    { valor: 'todos', etiqueta: 'Todos' },
  ];
  protected readonly columnas: NsColumna[] = [
    { clave: 'nombreNormalizado', titulo: 'Ingrediente' },
    { clave: 'alimentoNombre', titulo: 'Alimento emparejado' },
    { clave: 'metodo', titulo: 'Método' },
    { clave: 'confianza', titulo: 'Confianza' },
    { clave: 'revisado', titulo: 'Revisado' },
    { clave: 'acciones', titulo: 'Acciones', alinear: 'end' },
  ];
  protected readonly metodos = ETIQUETAS_METODO_MAPEO;
  protected readonly umbral = UMBRAL_CONFIANZA;

  protected readonly filtro = signal<FiltroMapeo>('pendientes');
  protected readonly page = signal(0);
  protected readonly recargas = new Subject<void>();

  protected readonly pagina = signal<Pagina<MapeoIngredienteResponse> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filas = computed(() => this.pagina()?.content ?? []);
  protected readonly total = computed(() => {
    const n = this.pagina()?.totalElements ?? 0;
    return n === 1 ? '1 ingrediente' : `${formatearNumero(n, 0)} ingredientes`;
  });

  constructor() {
    combineLatest([toObservable(this.filtro), toObservable(this.page), this.recargas.pipe(startWith(undefined))])
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(([filtro, page]) =>
          this.adminRecetas.mapeos({ revisado: REVISADO[filtro], page, size: TAMANO_PAGINA }).pipe(
            catchError((e: unknown) => {
              this.error.set(aApiError(e).detalle);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pagina) => {
        // Si la página se queda vacía (p. ej. al vaciar la última de la cola), vuelve a la anterior.
        if (pagina && pagina.content.length === 0 && pagina.page > 0) {
          this.page.set(Math.max(0, pagina.totalPages - 1));
          return;
        }
        if (pagina) this.pagina.set(pagina);
        this.cargando.set(false);
      });
  }

  /** 0,45 → "45 %". */
  protected confianza(valor: number): string {
    return `${formatearNumero(valor * 100, 0)} %`;
  }

  protected cambiarFiltro(filtro: FiltroMapeo | null): void {
    if (!filtro || filtro === this.filtro()) return;
    this.page.set(0);
    this.filtro.set(filtro);
  }

  protected emparejar(mapeo: MapeoIngredienteResponse): void {
    this.dialogos
      .open<EmparejarIngredienteDialogComponent, MapeoIngredienteResponse, EmparejarIngredienteData>(
        EmparejarIngredienteDialogComponent,
        { titulo: 'Emparejar ingrediente', size: 'sm', data: { mapeo } },
      )
      .closed.subscribe((actualizado) => {
        if (!actualizado) return;
        this.toasts.exito('Emparejado', textoEmparejado(actualizado.recetasRecalculadas));
        // En Pendientes sale de la cola; en el resto, se actualiza la fila.
        if (this.filtro() === 'pendientes') this.recargas.next();
        else
          this.pagina.update((p) =>
            p ? { ...p, content: p.content.map((m) => (m.id === actualizado.id ? actualizado : m)) } : p,
          );
      });
  }
}
