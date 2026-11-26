import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, catchError, combineLatest, firstValueFrom, of, startWith, switchMap, tap } from 'rxjs';

import type { CategoriaResponse, TipoCategoria } from '@core/models';
import { AdminCatalogoService } from '@core/services/admin/admin-catalogo.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import { CategoriaFormComponent } from './categoria-form.component';
import { NodoCategoria, arbolCategorias, leerTipoCategoria } from './categorias';

/**
 * Categorías del catálogo (/admin/catalogo/categorias?tipo=ALIMENTO|RECETA, DESIGN.md §7.17):
 * árbol por padreId con el orden y, en las de alimentos, la sección de la compra. Crear, editar y
 * añadir subcategorías en un drawer con CategoriaFormComponent; eliminar con confirmación (409 si
 * tiene alimentos o subcategorías → aviso con el detail).
 */
@Component({
  selector: 'app-categorias-admin',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    CategoriaFormComponent,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsDrawerComponent,
    NsEmptyStateComponent,
    NsSegmentedComponent,
    NsSkeletonComponent,
  ],
  templateUrl: './categorias-admin.component.html',
  styleUrl: './categorias-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasAdminComponent {
  private readonly catalogo = inject(AdminCatalogoService);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);

  /** Query param ?tipo= */
  readonly tipo = input<string>();
  protected readonly tipoActual = computed<TipoCategoria>(() => leerTipoCategoria(this.tipo()));
  protected readonly esAlimento = computed(() => this.tipoActual() === 'ALIMENTO');

  protected readonly tipoControl = new FormControl<TipoCategoria>('ALIMENTO', { nonNullable: true });
  protected readonly tipos: NsOpcion<TipoCategoria>[] = [
    { valor: 'ALIMENTO', etiqueta: 'Alimentos' },
    { valor: 'RECETA', etiqueta: 'Recetas' },
  ];

  // ---- Datos
  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  /** detail del último 409 al eliminar. */
  protected readonly errorEliminar = signal<string | null>(null);
  private readonly recargas = new Subject<void>();
  protected readonly arbol = computed(() => arbolCategorias(this.categorias()));

  // ---- Drawer
  protected readonly drawerAbierto = signal(false);
  protected readonly editando = signal<CategoriaResponse | null>(null);
  /** Padre al crear una subcategoría. */
  protected readonly padreNueva = signal<CategoriaResponse | null>(null);
  protected readonly formulario = viewChild(CategoriaFormComponent);
  protected readonly eliminando = signal<string | null>(null);
  protected readonly tituloDrawer = computed(() => {
    if (this.editando()) return 'Editar categoría';
    const padre = this.padreNueva();
    return padre ? `Nueva subcategoría de «${padre.nombre}»` : 'Nueva categoría';
  });

  constructor() {
    combineLatest([toObservable(this.tipoActual), this.recargas.pipe(startWith(undefined))])
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(([tipo]) =>
          this.catalogo.categorias(tipo).pipe(
            catchError((e: unknown) => {
              this.error.set(aApiError(e).detalle);
              return of([] as CategoriaResponse[]);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((lista) => {
        this.categorias.set(lista);
        this.cargando.set(false);
      });

    effect(() => this.tipoControl.setValue(this.tipoActual(), { emitEvent: false }));
    this.tipoControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      this.errorEliminar.set(null);
      void this.router.navigate([], {
        queryParams: { tipo: tipo === 'ALIMENTO' ? null : tipo },
        queryParamsHandling: 'merge',
      });
    });
  }

  protected reintentar(): void {
    this.recargas.next();
  }

  protected crear(padre: CategoriaResponse | null = null): void {
    this.editando.set(null);
    this.padreNueva.set(padre);
    this.drawerAbierto.set(true);
  }

  protected editar(categoria: CategoriaResponse): void {
    this.editando.set(categoria);
    this.padreNueva.set(null);
    this.drawerAbierto.set(true);
  }

  protected alGuardar(categoria: CategoriaResponse): void {
    this.toasts.exito(this.editando() ? 'Categoría guardada' : 'Categoría creada', categoria.nombre);
    this.drawerAbierto.set(false);
    this.recargas.next();
  }

  protected async eliminar(nodo: NodoCategoria): Promise<void> {
    const { categoria } = nodo;
    const confirmado = await this.confirmacion.confirmar({
      titulo: `¿Eliminar la categoría «${categoria.nombre}»?`,
      mensaje: nodo.hijos.length
        ? 'Tiene subcategorías: no se podrá eliminar hasta que las muevas o las elimines.'
        : `Solo se puede eliminar si no tiene ${this.esAlimento() ? 'alimentos' : 'recetas'} ni subcategorías.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!confirmado) return;
    this.eliminando.set(categoria.id);
    this.errorEliminar.set(null);
    try {
      await firstValueFrom(this.catalogo.eliminarCategoria(categoria.id, categoria.tipo));
      this.toasts.exito('Categoría eliminada', categoria.nombre);
      this.recargas.next();
    } catch (e) {
      const error = aApiError(e);
      // 409: tiene alimentos, recetas o subcategorías.
      this.errorEliminar.set(
        error.status === 409 ? `No se puede eliminar «${categoria.nombre}»: ${error.detalle}` : error.detalle,
      );
    } finally {
      this.eliminando.set(null);
    }
  }
}
