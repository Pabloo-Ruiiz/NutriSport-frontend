import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, catchError, combineLatest, debounceTime, filter, map, of, startWith, switchMap, tap } from 'rxjs';

import type { BusquedaRecetasResponse, RecetaResumenResponse } from '@core/models';
import { RecetasService, type FiltrosRecetas } from '@core/services/recetas.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsRecipeCardComponent } from '@shared/ui/data/recipe-card.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsChipGroupComponent } from '@shared/ui/form/chip-group.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsPaginatorComponent } from '@shared/ui/nav/paginator.component';
import { NS_TABS } from '@shared/ui/nav/tabs.component';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import { FiltrosRecetasComponent } from './filtros-recetas.component';
import {
  DEBOUNCE_RECETAS_MS,
  LIMITES_KCAL,
  LIMITES_PROTEINA,
  MAX_TEXTO_RECETAS,
  TAMANO_PAGINA_RECETAS,
  claveReceta,
  contarFiltrosActivos,
  leerFranja,
  leerNumero,
  leerOrigen,
  leerPagina,
  leerTexto,
  leerVista,
  type FiltrosAvanzadosRecetas,
  type VistaRecetas,
} from './recetas-url';

type Estado = 'cargando' | 'listo' | 'error';

/** Valor del chip "Todas" (sin categoría). */
const TODAS = '';

/**
 * Catálogo de recetas (/recetas, DESIGN.md §7.21): pestañas Explorar · Favoritas.
 *
 * - Explorar: buscador, categorías, filtros y rejilla del catálogo paginado; en la primera página,
 *   además, las recetas de TheMealDB aún no importadas. Todo el estado vive en la URL
 *   (?vista=&q=&categoria=&ingrediente=&area=&origen=&franja=&maxKcal=&minProteina=&page=), que
 *   llega como inputs (withComponentInputBinding): se puede compartir, recargar y volver atrás.
 * - Favoritas: GET /recetas/favoritas, cada vez que se abre la pestaña.
 * - Favorita optimista: el corazón cambia al momento y vuelve atrás con un toast si falla.
 * - Abrir: RecetasService.abrir (importa las de TheMealDB) y navega a /recetas/{id}.
 */
@Component({
  selector: 'app-recetas',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    LucideDynamicIcon,
    NS_TABS,
    NsAlertComponent,
    NsButtonComponent,
    NsChipGroupComponent,
    NsDrawerComponent,
    NsEmptyStateComponent,
    NsInputDirective,
    NsPaginatorComponent,
    NsRecipeCardComponent,
    NsSkeletonComponent,
    FiltrosRecetasComponent,
  ],
  templateUrl: './recetas.component.html',
  styleUrl: './recetas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecetasComponent {
  private readonly servicio = inject(RecetasService);
  private readonly router = inject(Router);
  private readonly toasts = inject(NsToastService);

  // ---- Query params
  readonly vista = input<string>();
  readonly q = input<string>();
  readonly categoria = input<string>();
  readonly ingrediente = input<string>();
  readonly area = input<string>();
  readonly origen = input<string>();
  readonly franja = input<string>();
  readonly maxKcal = input<string>();
  readonly minProteina = input<string>();
  readonly page = input<string>();

  protected readonly vistaActiva = computed<VistaRecetas>(() => leerVista(this.vista()));
  protected readonly avanzados = computed<FiltrosAvanzadosRecetas>(() => ({
    ingrediente: leerTexto(this.ingrediente()),
    area: leerTexto(this.area()),
    origen: leerOrigen(this.origen()),
    franja: leerFranja(this.franja()),
    maxKcal: leerNumero(this.maxKcal(), LIMITES_KCAL),
    minProteina: leerNumero(this.minProteina(), LIMITES_PROTEINA),
  }));
  protected readonly consulta = computed<FiltrosRecetas>(() => ({
    q: leerTexto(this.q()),
    categoria: leerTexto(this.categoria()),
    ...this.avanzados(),
    page: leerPagina(this.page()),
    size: TAMANO_PAGINA_RECETAS,
  }));
  protected readonly filtrosActivos = computed(() => contarFiltrosActivos(this.avanzados()));
  protected readonly hayFiltros = computed(
    () => this.filtrosActivos() > 0 || !!this.consulta().q || !!this.consulta().categoria,
  );

  protected readonly movil = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 767px)')
      .pipe(map((e) => e.matches)),
    { initialValue: false },
  );
  protected readonly filtrosAbiertos = signal(false);

  // ---- Buscador: el texto sigue a la URL (atrás/adelante) hasta que se escribe.
  protected readonly maxTexto = MAX_TEXTO_RECETAS;
  protected readonly texto = linkedSignal(() => this.q() ?? '');
  private readonly escritura = new Subject<string>();

  // ---- Categorías
  private readonly categorias = toSignal(this.servicio.categorias().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  protected readonly opcionesCategoria = computed<NsOpcion<string>[]>(() => [
    { valor: TODAS, etiqueta: 'Todas' },
    ...this.categorias().map((c) => ({ valor: c.id, etiqueta: c.nombre })),
  ]);
  protected readonly categoriaChip = computed(() => this.consulta().categoria ?? TODAS);

  // ---- Explorar
  protected readonly busqueda = signal<BusquedaRecetasResponse | null>(null);
  protected readonly estado = signal<Estado>('cargando');
  protected readonly error = signal<string | null>(null);
  private readonly recargas = new Subject<void>();
  protected readonly catalogo = computed(() => this.busqueda()?.catalogo.content ?? []);
  protected readonly deTheMealDb = computed(() => this.busqueda()?.themealdb ?? []);
  protected readonly themealdbCaido = computed(() => this.busqueda()?.themealdbDisponible === false);
  protected readonly totalCatalogo = computed(() => {
    const n = this.busqueda()?.catalogo.totalElements ?? 0;
    return n === 1 ? '1 receta' : `${n} recetas`;
  });
  protected readonly sinResultados = computed(
    () => this.estado() === 'listo' && this.catalogo().length === 0 && this.deTheMealDb().length === 0,
  );

  // ---- Favoritas
  protected readonly favoritas = signal<RecetaResumenResponse[] | null>(null);
  protected readonly estadoFavoritas = signal<Estado>('cargando');
  protected readonly errorFavoritas = signal<string | null>(null);
  private readonly recargasFavoritas = new Subject<void>();

  protected readonly pestanas = computed<NsOpcion<string>[]>(() => {
    const favoritas = this.favoritas();
    return [
      { valor: 'explorar', etiqueta: 'Explorar' },
      { valor: 'favoritas', etiqueta: favoritas ? `Favoritas · ${favoritas.length}` : 'Favoritas' },
    ];
  });

  // ---- Acciones sobre las tarjetas
  protected readonly abriendo = signal<string | null>(null);
  protected readonly guardando = signal<ReadonlySet<string>>(new Set());
  protected readonly clave = claveReceta;
  protected readonly esqueletos = Array.from({ length: 8 }, (_, i) => i);

  constructor() {
    // Explorar: se busca de nuevo al cambiar la URL o al reintentar, solo con la pestaña abierta.
    const consultaExplorar = computed(() => (this.vistaActiva() === 'explorar' ? this.consulta() : null));
    combineLatest([toObservable(consultaExplorar), this.recargas.pipe(startWith(undefined))])
      .pipe(
        map(([consulta]) => consulta),
        filter((consulta): consulta is FiltrosRecetas => consulta !== null),
        tap(() => {
          this.estado.set('cargando');
          this.error.set(null);
        }),
        switchMap((consulta) =>
          this.servicio.buscar(consulta).pipe(
            catchError((e: unknown) => {
              this.error.set(aApiError(e).detalle);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((busqueda) => {
        this.busqueda.set(busqueda);
        this.estado.set(busqueda ? 'listo' : 'error');
      });

    // Favoritas: se piden cada vez que se abre la pestaña (pueden haber cambiado en Explorar).
    combineLatest([toObservable(this.vistaActiva), this.recargasFavoritas.pipe(startWith(undefined))])
      .pipe(
        filter(([vista]) => vista === 'favoritas'),
        tap(() => {
          this.estadoFavoritas.set('cargando');
          this.errorFavoritas.set(null);
        }),
        switchMap(() =>
          this.servicio.favoritas().pipe(
            catchError((e: unknown) => {
              this.errorFavoritas.set(aApiError(e).detalle);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((favoritas) => {
        if (favoritas) this.favoritas.set(favoritas);
        this.estadoFavoritas.set(favoritas ? 'listo' : 'error');
      });

    this.escritura
      .pipe(
        debounceTime(DEBOUNCE_RECETAS_MS),
        map((texto) => leerTexto(texto)),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        if (q !== this.consulta().q) this.navegar({ q, page: null }, true);
      });
  }

  // ---- URL

  protected cambiarVista(vista: string | null): void {
    this.navegar({ vista: vista === 'favoritas' ? 'favoritas' : null });
  }

  protected alEscribir(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.texto.set(valor);
    this.escritura.next(valor);
  }

  protected cambiarCategoria(categoria: string | null): void {
    this.navegar({ categoria: categoria || null, page: null });
  }

  protected aplicarFiltros(cambios: Partial<FiltrosAvanzadosRecetas>): void {
    const params: Record<string, string | number | null> = { page: null };
    for (const [clave, valor] of Object.entries(cambios)) params[clave] = valor === 'todas' ? null : valor;
    this.navegar(params);
  }

  protected limpiarFiltros(): void {
    this.texto.set('');
    this.navegar({
      q: null,
      categoria: null,
      ingrediente: null,
      area: null,
      origen: null,
      franja: null,
      maxKcal: null,
      minProteina: null,
      page: null,
    });
  }

  protected irAPagina(page: number): void {
    this.navegar({ page: page || null });
  }

  protected reintentar(): void {
    this.recargas.next();
  }

  protected reintentarFavoritas(): void {
    this.recargasFavoritas.next();
  }

  // ---- Tarjetas

  /** Abre la receta; las de TheMealDB sin importar se importan antes (spinner en la tarjeta). */
  protected abrir(receta: RecetaResumenResponse): void {
    if (this.abriendo()) return;
    const clave = claveReceta(receta);
    this.abriendo.set(clave);
    this.servicio.abrir(receta).subscribe({
      next: (id) => {
        void this.router.navigate(['/recetas', id]).finally(() => this.abriendo.set(null));
      },
      error: (e: unknown) => {
        this.abriendo.set(null);
        const error = aApiError(e);
        if (error.status === 503)
          this.toasts.error(
            'TheMealDB no está disponible ahora',
            'No hemos podido traer la receta. Inténtalo de nuevo en unos minutos.',
          );
        else this.toasts.error('No hemos podido abrir la receta', error.detalle);
      },
    });
  }

  /** Favorita optimista: cambia al momento y se revierte con un toast si la petición falla. */
  protected alternarFavorita(receta: RecetaResumenResponse, favorita: boolean): void {
    const clave = claveReceta(receta);
    if (this.guardando().has(clave)) return;
    this.marcarGuardando(clave, true);
    this.actualizar(clave, { favorita });

    this.servicio.cambiarFavorita(receta, favorita).subscribe({
      next: (id) => {
        // Si se acaba de importar, la receta ya tiene id propio.
        this.marcarGuardando(clave, false);
        this.actualizar(clave, { id });
      },
      error: (e: unknown) => {
        this.marcarGuardando(clave, false);
        this.actualizar(clave, { favorita: !favorita });
        this.toasts.error(
          favorita ? 'No hemos podido guardarla en favoritas' : 'No hemos podido quitarla de favoritas',
          aApiError(e).detalle,
        );
      },
    });
  }

  /** Aplica cambios a la receta en todas las listas donde aparezca. */
  private actualizar(clave: string, cambios: Partial<RecetaResumenResponse>): void {
    const aplicar = (lista: RecetaResumenResponse[]) =>
      lista.map((r) => (claveReceta(r) === clave ? { ...r, ...cambios } : r));
    this.busqueda.update((b) =>
      b
        ? { ...b, catalogo: { ...b.catalogo, content: aplicar(b.catalogo.content) }, themealdb: aplicar(b.themealdb) }
        : b,
    );
    this.favoritas.update((lista) => (lista ? aplicar(lista) : lista));
  }

  private marcarGuardando(clave: string, activo: boolean): void {
    this.guardando.update((actual) => {
      const siguiente = new Set(actual);
      if (activo) siguiente.add(clave);
      else siguiente.delete(clave);
      return siguiente;
    });
  }

  /** null quita el parámetro de la URL. */
  private navegar(cambios: Record<string, string | number | null>, reemplazar = false): void {
    void this.router.navigate([], { queryParams: cambios, queryParamsHandling: 'merge', replaceUrl: reemplazar });
  }
}
