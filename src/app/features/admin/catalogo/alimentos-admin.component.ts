import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, catchError, combineLatest, debounceTime, firstValueFrom, map, of, startWith, switchMap, tap } from 'rxjs';

import type { AlimentoResponse, FuenteAlimento, Pagina, ResultadoImportacion, Visibilidad } from '@core/models';
import { ETIQUETAS_FUENTE_ALIMENTO } from '@core/models/etiquetas';
import { AdminCatalogoService, FiltroAlimentosAdmin } from '@core/services/admin/admin-catalogo.service';
import { aApiError } from '@core/util/api-error';
import { AlimentoFormComponent } from '@features/alimentos/alimento-form.component';
import { EtiquetaPipe } from '@shared/pipes/etiqueta.pipe';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsCeldaDirective } from '@shared/ui/data/table-cell.directive';
import { NsColumna, NsTableComponent } from '@shared/ui/data/table.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { NsPaginatorComponent } from '@shared/ui/nav/paginator.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import {
  TAMANOS_PAGINA_CATALOGO,
  TAMANO_CATALOGO_POR_DEFECTO,
  leerBooleano,
  leerFuente,
  leerOrdenCatalogo,
  leerPaginaCatalogo,
  leerTamanoCatalogo,
  leerVisibilidad,
} from './catalogo-admin';
import { ImportarCsvComponent } from './importar-csv.component';
import { RevisionAlergenosData, RevisionAlergenosDialogComponent } from './revision-alergenos-dialog.component';

/** Espera tras la última tecla antes de buscar. */
const DEBOUNCE_BUSQUEDA_MS = 300;

/** null quita el parámetro de la URL; los booleanos van como "true"/"false". */
type CambiosUrl = Record<string, string | number | boolean | null>;

/**
 * Alimentos del catálogo (/admin/catalogo/alimentos, DESIGN.md §7.17): todos, también los privados
 * de usuarios y los desactivados. Filtros (texto, fuente, revisados, visibilidad, activo), orden y
 * página viven en la URL; "Pendientes de revisar" es revisados=false.
 *
 * Crear y editar en un drawer de 560 px con AlimentoFormComponent en modo admin; revisar alérgenos
 * en RevisionAlergenosDialogComponent; eliminar con confirmación (si ya se usó en comidas, el
 * backend solo lo desactiva).
 */
@Component({
  selector: 'app-alimentos-admin',
  imports: [
    ReactiveFormsModule,
    LucideDynamicIcon,
    EtiquetaPipe,
    AlimentoFormComponent,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsCeldaDirective,
    NsDrawerComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsPaginatorComponent,
    NsSelectComponent,
    NsSourceBadgeComponent,
    NsTableComponent,
  ],
  templateUrl: './alimentos-admin.component.html',
  styleUrl: './alimentos-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlimentosAdminComponent {
  private readonly catalogo = inject(AdminCatalogoService);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly dialogos = inject(NsDialogService);
  private readonly toasts = inject(NsToastService);

  // ---- Query params
  readonly q = input<string>();
  readonly fuente = input<string>();
  readonly revisados = input<string>();
  readonly visibilidad = input<string>();
  readonly activo = input<string>();
  readonly page = input<string>();
  readonly size = input<string>();
  readonly sort = input<string>();

  protected readonly filtro = computed<FiltroAlimentosAdmin>(() => ({
    q: this.q()?.trim() || null,
    fuente: leerFuente(this.fuente()),
    revisados: leerBooleano(this.revisados()),
    visibilidad: leerVisibilidad(this.visibilidad()),
    activo: leerBooleano(this.activo()),
    page: leerPaginaCatalogo(this.page()),
    size: leerTamanoCatalogo(this.size()),
    sort: leerOrdenCatalogo(this.sort()),
  }));
  protected readonly orden = computed(() => this.filtro().sort as string | null);
  protected readonly soloPendientes = computed(() => this.filtro().revisados === false);
  protected readonly hayFiltros = computed(() => {
    const f = this.filtro();
    return !!f.q || !!f.fuente || f.revisados !== null || !!f.visibilidad || f.activo !== null;
  });

  // ---- Datos
  protected readonly pagina = signal<Pagina<AlimentoResponse> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly recargas = new Subject<void>();
  protected readonly filas = computed(() => this.pagina()?.content ?? []);
  protected readonly total = computed(() => {
    const n = this.pagina()?.totalElements ?? 0;
    return n === 1 ? '1 alimento' : `${formatearNumero(n, 0)} alimentos`;
  });
  protected readonly tamanos = TAMANOS_PAGINA_CATALOGO;

  // ---- Búsqueda
  protected readonly texto = linkedSignal(() => this.q() ?? '');
  private readonly escritura = new Subject<string>();

  // ---- Filtros (ns-select es un ControlValueAccessor)
  protected readonly filtros = new FormGroup({
    fuente: new FormControl<FuenteAlimento | null>(null),
    revisados: new FormControl<boolean | null>(null),
    visibilidad: new FormControl<Visibilidad | null>(null),
    activo: new FormControl<boolean | null>(null),
  });
  protected readonly opcionesFuente: NsOpcion<FuenteAlimento | null>[] = [
    { valor: null, etiqueta: 'Todas' },
    ...(Object.keys(ETIQUETAS_FUENTE_ALIMENTO) as FuenteAlimento[]).map((valor) => ({
      valor,
      etiqueta: ETIQUETAS_FUENTE_ALIMENTO[valor],
    })),
  ];
  protected readonly opcionesRevisados: NsOpcion<boolean | null>[] = [
    { valor: null, etiqueta: 'Todos' },
    { valor: true, etiqueta: 'Revisados' },
    { valor: false, etiqueta: 'Pendientes de revisar' },
  ];
  protected readonly opcionesVisibilidad: NsOpcion<Visibilidad | null>[] = [
    { valor: null, etiqueta: 'Todas' },
    { valor: 'PUBLICO', etiqueta: 'Públicos' },
    { valor: 'PRIVADO', etiqueta: 'Privados (de usuarios)' },
  ];
  protected readonly opcionesActivo: NsOpcion<boolean | null>[] = [
    { valor: null, etiqueta: 'Todos' },
    { valor: true, etiqueta: 'Activos' },
    { valor: false, etiqueta: 'Desactivados' },
  ];

  protected readonly columnas: NsColumna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: 'marca', titulo: 'Marca', ordenable: true },
    { clave: 'categoriaNombre', titulo: 'Categoría' },
    { clave: 'fuente', titulo: 'Fuente' },
    { clave: 'visibilidad', titulo: 'Visibilidad' },
    { clave: 'alergenosRevisados', titulo: 'Alérgenos' },
    { clave: 'activo', titulo: 'Estado' },
    { clave: 'acciones', titulo: 'Acciones', alinear: 'end' },
  ];

  // ---- Drawer de crear/editar
  protected readonly drawerAbierto = signal(false);
  /** null = crear; un alimento = editar. */
  protected readonly editando = signal<AlimentoResponse | null>(null);
  protected readonly formulario = viewChild(AlimentoFormComponent);
  protected readonly eliminando = signal<string | null>(null);

  constructor() {
    combineLatest([toObservable(this.filtro), this.recargas.pipe(startWith(undefined))])
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(([filtro]) =>
          this.catalogo.alimentos(filtro).pipe(
            catchError((e: unknown) => {
              this.error.set(aApiError(e).detalle);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pagina) => {
        this.pagina.set(pagina);
        this.cargando.set(false);
      });

    this.escritura
      .pipe(
        debounceTime(DEBOUNCE_BUSQUEDA_MS),
        map((texto) => texto.trim()),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        if (q !== (this.filtro().q ?? '')) this.navegar({ q: q || null, page: null }, true);
      });

    // Los selects siguen a la URL; un cambio del usuario la actualiza.
    effect(() => {
      const f = this.filtro();
      this.filtros.setValue(
        { fuente: f.fuente ?? null, revisados: f.revisados ?? null, visibilidad: f.visibilidad ?? null, activo: f.activo ?? null },
        { emitEvent: false },
      );
    });
    this.filtros.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const { fuente, revisados, visibilidad, activo } = this.filtros.getRawValue();
      this.navegar({ fuente, revisados, visibilidad, activo, page: null });
    });
  }

  protected alEscribir(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.texto.set(valor);
    this.escritura.next(valor);
  }

  /** Alterna la cola "Pendientes de revisar" (revisados=false). */
  protected alternarPendientes(): void {
    this.navegar({ revisados: this.soloPendientes() ? null : false, page: null });
  }

  protected limpiarFiltros(): void {
    this.texto.set('');
    this.navegar({ q: null, fuente: null, revisados: null, visibilidad: null, activo: null, page: null });
  }

  protected reintentar(): void {
    this.recargas.next();
  }

  protected ordenar(sort: string | null): void {
    this.navegar({ sort, page: null });
  }

  protected irAPagina(page: number): void {
    this.navegar({ page: page || null });
  }

  protected cambiarTamano(size: number | null): void {
    this.navegar({ size: size === null || size === TAMANO_CATALOGO_POR_DEFECTO ? null : size, page: null });
  }

  // ---- Acciones

  protected crear(): void {
    this.editando.set(null);
    this.drawerAbierto.set(true);
  }

  protected editar(alimento: AlimentoResponse): void {
    this.editando.set(alimento);
    this.drawerAbierto.set(true);
  }

  protected alGuardar(alimento: AlimentoResponse): void {
    const creado = !this.editando();
    this.drawerAbierto.set(false);
    this.toasts.exito(creado ? 'Alimento creado' : 'Alimento guardado', alimento.nombre);
    if (creado) this.recargas.next();
    else this.reemplazar(alimento);
  }

  protected importarCsv(): void {
    this.dialogos
      .open<ImportarCsvComponent, ResultadoImportacion>(ImportarCsvComponent, {
        titulo: 'Importar alimentos desde CSV',
        size: 'lg',
      })
      .closed.subscribe((resultado) => {
        if (resultado && resultado.creados + resultado.actualizados > 0) this.recargas.next();
      });
  }

  protected revisar(alimento: AlimentoResponse): void {
    this.dialogos
      .open<RevisionAlergenosDialogComponent, AlimentoResponse, RevisionAlergenosData>(RevisionAlergenosDialogComponent, {
        titulo: 'Revisar alérgenos',
        size: 'md',
        data: { alimento },
      })
      .closed.subscribe((revisado) => {
        if (!revisado) return;
        this.toasts.exito('Alérgenos revisados', revisado.nombre);
        // En la cola de pendientes, el revisado sale de la lista.
        if (this.soloPendientes()) this.recargas.next();
        else this.reemplazar(revisado);
      });
  }

  protected async eliminar(alimento: AlimentoResponse): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: `¿Eliminar «${alimento.nombre}»?`,
      mensaje:
        'Si algún usuario lo ha registrado en sus comidas, no se borra: se desactiva, deja de aparecer en las búsquedas y su historial lo conserva.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!confirmado) return;
    this.eliminando.set(alimento.id);
    try {
      await firstValueFrom(this.catalogo.eliminarAlimento(alimento.id));
      this.toasts.exito('Alimento eliminado o desactivado', alimento.nombre);
      this.recargas.next();
    } catch (e) {
      this.toasts.error('No se ha podido eliminar el alimento', aApiError(e).detalle);
    } finally {
      this.eliminando.set(null);
    }
  }

  private reemplazar(alimento: AlimentoResponse): void {
    this.pagina.update((pagina) =>
      pagina ? { ...pagina, content: pagina.content.map((a) => (a.id === alimento.id ? alimento : a)) } : pagina,
    );
  }

  private navegar(cambios: CambiosUrl, reemplazar = false): void {
    void this.router.navigate([], { queryParams: cambios, queryParamsHandling: 'merge', replaceUrl: reemplazar });
  }
}
