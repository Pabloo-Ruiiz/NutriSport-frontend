import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  firstValueFrom,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import type { BusquedaRecetasResponse, RecetaResponse, RecetaResumenResponse } from '@core/models';
import { AdminRecetasService } from '@core/services/admin/admin-recetas.service';
import { RecetasService } from '@core/services/recetas.service';
import { aApiError } from '@core/util/api-error';
import { claveReceta } from '@features/recetas/recetas-url';
import { EtiquetaPipe } from '@shared/pipes/etiqueta.pipe';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsCeldaDirective } from '@shared/ui/data/table-cell.directive';
import { NsColumna, NsTableComponent } from '@shared/ui/data/table.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSourcesNoteComponent } from '@shared/ui/data/sources-note.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsPaginatorComponent } from '@shared/ui/nav/paginator.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import {
  type PublicacionRecetaData,
  PublicacionRecetaDialogComponent,
  type PublicacionRecetaResultado,
} from './publicacion-receta-dialog.component';
import { RecetaAdminFormComponent } from './receta-admin-form.component';

const DEBOUNCE_BUSQUEDA_MS = 300;
const TAMANO_PAGINA = 20;

/** Receta creada o editada por el administrador en esta sesión. */
export interface RecetaSesion {
  receta: RecetaResponse;
  accion: 'creada' | 'editada';
  /** Último estado de publicación enviado; null = desconocido (la API no lo devuelve). */
  publicada: boolean | null;
}

/**
 * Recetas creadas o editadas en esta sesión. GET /recetas no devuelve las propias públicas sin
 * publicar (Annex B), así que esta lista es la única forma de llegar a ellas para publicarlas.
 * Es de la aplicación (no del componente) para que no se pierda al cambiar de pestaña.
 */
@Injectable({ providedIn: 'root' })
export class RecetasSesionAdmin {
  private readonly lista = signal<RecetaSesion[]>([]);
  readonly recetas = this.lista.asReadonly();

  guardar(receta: RecetaResponse, accion: RecetaSesion['accion']): void {
    this.lista.update((l) => {
      const anterior = l.find((r) => r.receta.id === receta.id);
      const entrada: RecetaSesion = {
        receta,
        accion: anterior?.accion === 'creada' ? 'creada' : accion,
        publicada: accion === 'creada' ? false : (anterior?.publicada ?? null),
      };
      return [entrada, ...l.filter((r) => r.receta.id !== receta.id)];
    });
  }

  marcarPublicacion(receta: RecetaResponse, publicada: boolean | null): void {
    this.lista.update((l) =>
      l.map((r) => (r.receta.id === receta.id ? { ...r, receta, publicada: publicada ?? r.publicada } : r)),
    );
  }

  quitar(id: string): void {
    this.lista.update((l) => l.filter((r) => r.receta.id !== id));
  }
}

/**
 * Recetas del catálogo (/admin/catalogo/recetas, docs/api/admin.md §6).
 *
 * Limitación de la API (Annex B): no hay listado de administración ni campo `publicada`. La tabla
 * busca con GET /recetas (origen todas: publicadas, propias y TheMealDB, importadas o no) y la
 * lista "Creadas en esta sesión" da acceso a las recién creadas o editadas, que pueden no salir en
 * la búsqueda hasta publicarlas. Al crear una receta se abre directamente su publicación.
 *
 * Acciones: Editar y Eliminar (solo propias; 409 RECETA_PLANIFICADA → despublicarla) y Publicación
 * (también de TheMealDB: si no está importada, se importa antes).
 */
@Component({
  selector: 'app-recetas-admin',
  imports: [
    EtiquetaPipe,
    LucideDynamicIcon,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsCeldaDirective,
    NsDrawerComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsPaginatorComponent,
    NsTableComponent,
    NsSourcesNoteComponent,
    RecetaAdminFormComponent,
  ],
  templateUrl: './recetas-admin.component.html',
  styleUrl: './recetas-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecetasAdminComponent {
  private readonly recetasService = inject(RecetasService);
  private readonly adminRecetas = inject(AdminRecetasService);
  private readonly dialogos = inject(NsDialogService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);
  protected readonly sesion = inject(RecetasSesionAdmin);

  // ---- Búsqueda
  protected readonly texto = signal('');
  private readonly q = signal('');
  protected readonly page = signal(0);
  private readonly escritura = new Subject<string>();
  private readonly recargas = new Subject<void>();

  protected readonly resultado = signal<BusquedaRecetasResponse | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly origenes = computed(() => this.filas().map((r) => r.origen));
  protected readonly filas = computed<RecetaResumenResponse[]>(() => {
    const r = this.resultado();
    if (!r) return [];
    return r.catalogo.page === 0 ? [...r.catalogo.content, ...r.themealdb] : r.catalogo.content;
  });
  protected readonly total = computed(() => {
    const n = this.resultado()?.catalogo.totalElements ?? 0;
    return n === 1 ? '1 receta en el catálogo' : `${formatearNumero(n, 0)} recetas en el catálogo`;
  });
  protected readonly clave = claveReceta;

  protected readonly columnas: NsColumna[] = [
    { clave: 'nombre', titulo: 'Nombre' },
    { clave: 'origen', titulo: 'Origen' },
    { clave: 'estadoNutricional', titulo: 'Estado nutricional' },
    { clave: 'acciones', titulo: 'Acciones', alinear: 'end' },
  ];

  // ---- Drawer
  protected readonly drawerAbierto = signal(false);
  /** null = crear; un id = editar. */
  protected readonly editando = signal<string | null>(null);
  protected readonly formulario = viewChild(RecetaAdminFormComponent);

  /** Clave (claveReceta o id) de la fila con una acción en curso. */
  protected readonly ocupada = signal<string | null>(null);

  constructor() {
    combineLatest([toObservable(this.q), toObservable(this.page), this.recargas.pipe(startWith(undefined))])
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(([q, page]) =>
          this.recetasService.buscar({ q, origen: 'todas', page, size: TAMANO_PAGINA }).pipe(
            catchError((e: unknown) => {
              this.error.set(aApiError(e).detalle);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        if (resultado) this.resultado.set(resultado);
        this.cargando.set(false);
      });

    this.escritura
      .pipe(
        debounceTime(DEBOUNCE_BUSQUEDA_MS),
        map((t) => t.trim()),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        if (q === this.q()) return;
        this.page.set(0);
        this.q.set(q);
      });
  }

  protected alEscribir(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.texto.set(valor);
    this.escritura.next(valor);
  }

  protected irAPagina(page: number): void {
    this.page.set(page);
  }

  protected reintentar(): void {
    this.recargas.next();
  }

  // ---- Crear y editar

  protected crear(): void {
    this.editando.set(null);
    this.drawerAbierto.set(true);
  }

  protected editar(id: string): void {
    this.editando.set(id);
    this.drawerAbierto.set(true);
  }

  protected alGuardar(receta: RecetaResponse): void {
    const creada = !this.editando();
    this.drawerAbierto.set(false);
    this.sesion.guardar(receta, creada ? 'creada' : 'editada');
    this.recargas.next();
    if (creada) {
      this.toasts.exito('Receta creada sin publicar', receta.nombre);
      this.abrirPublicacion(receta, true);
    } else {
      this.toasts.exito('Receta guardada', receta.nombre);
    }
  }

  // ---- Publicación

  /** Desde la tabla: las de TheMealDB sin importar se importan antes (necesitan id propio). */
  protected async publicar(fila: RecetaResumenResponse): Promise<void> {
    if (this.ocupada()) return;
    this.ocupada.set(this.clave(fila));
    try {
      const id = await firstValueFrom(this.recetasService.abrir(fila));
      this.abrirPublicacion({ id, nombre: fila.nombre });
    } catch (e) {
      this.toasts.error('No se ha podido importar la receta', aApiError(e).detalle);
    } finally {
      this.ocupada.set(null);
    }
  }

  protected abrirPublicacion(receta: Pick<RecetaResponse, 'id' | 'nombre'>, recienCreada = false): void {
    this.dialogos
      .open<PublicacionRecetaDialogComponent, PublicacionRecetaResultado, PublicacionRecetaData>(
        PublicacionRecetaDialogComponent,
        { titulo: 'Publicación de la receta', size: 'sm', data: { receta, recienCreada } },
      )
      .closed.subscribe((resultado) => {
        if (!resultado) return;
        const { receta: actualizada, publicada } = resultado;
        this.sesion.marcarPublicacion(actualizada, publicada);
        this.toasts.exito(
          publicada === true ? 'Receta publicada' : publicada === false ? 'Receta despublicada' : 'Receta actualizada',
          actualizada.nombre,
        );
        this.recargas.next();
      });
  }

  // ---- Eliminar

  protected async eliminar(receta: Pick<RecetaResponse, 'id' | 'nombre'>): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: `¿Eliminar «${receta.nombre}»?`,
      mensaje: 'Se borra con sus ingredientes y deja de ser favorita de quien la tuviera. No se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!confirmado || this.ocupada()) return;
    this.ocupada.set(receta.id);
    try {
      await firstValueFrom(this.adminRecetas.eliminar(receta.id));
      this.sesion.quitar(receta.id);
      this.toasts.exito('Receta eliminada', receta.nombre);
      this.recargas.next();
    } catch (e) {
      const error = aApiError(e);
      if (error.codigo === 'RECETA_PLANIFICADA') {
        this.toasts.error('No se puede eliminar', 'Está en algún menú: despublícala.', {
          texto: 'Despublicar',
          ejecutar: () => this.abrirPublicacion(receta),
        });
      } else {
        this.toasts.error('No se ha podido eliminar la receta', error.detalle);
      }
    } finally {
      this.ocupada.set(null);
    }
  }
}
