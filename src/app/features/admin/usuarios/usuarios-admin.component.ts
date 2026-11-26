import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, catchError, combineLatest, debounceTime, map, of, startWith, switchMap, tap } from 'rxjs';

import type { EstadoUsuario, Pagina, UsuarioAdminResponse } from '@core/models';
import { AdminUsuariosService, FiltroUsuariosAdmin } from '@core/services/admin/admin-usuarios.service';
import { aApiError } from '@core/util/api-error';
import { EtiquetaPipe } from '@shared/pipes/etiqueta.pipe';
import { FechaCortaPipe } from '@shared/pipes/fecha-corta.pipe';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsCeldaDirective } from '@shared/ui/data/table-cell.directive';
import { NsColumna, NsTableComponent } from '@shared/ui/data/table.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { NsPaginatorComponent } from '@shared/ui/nav/paginator.component';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import { UsuarioDetalleComponent } from './usuario-detalle.component';
import {
  TAMANOS_PAGINA,
  TAMANO_POR_DEFECTO,
  VARIANTE_ESTADO,
  VARIANTE_ROL,
  leerEstado,
  leerOrdenUsuarios,
  leerPagina,
  leerTamano,
  rolesOrdenados,
} from './usuarios-admin';

/** Espera tras la última tecla antes de buscar. */
const DEBOUNCE_BUSQUEDA_MS = 300;

/**
 * Usuarios (/admin/usuarios, DESIGN.md §7.17): búsqueda por nombre o email, filtro de estado,
 * tabla paginada en el servidor y detalle en un drawer para bloquear/desbloquear y cambiar roles.
 *
 * El estado vive en la URL (?q=&estado=&page=&size=&sort=), así se puede compartir, recargar y
 * volver atrás. Los query params llegan como inputs (withComponentInputBinding).
 */
@Component({
  selector: 'app-usuarios-admin',
  imports: [
    ReactiveFormsModule,
    LucideDynamicIcon,
    EtiquetaPipe,
    FechaCortaPipe,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsCeldaDirective,
    NsDrawerComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsPaginatorComponent,
    NsSelectComponent,
    NsTableComponent,
    UsuarioDetalleComponent,
  ],
  templateUrl: './usuarios-admin.component.html',
  styleUrl: './usuarios-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosAdminComponent {
  private readonly servicio = inject(AdminUsuariosService);
  private readonly router = inject(Router);

  // ---- Query params
  readonly q = input<string>();
  readonly estado = input<string>();
  readonly page = input<string>();
  readonly size = input<string>();
  readonly sort = input<string>();

  protected readonly filtro = computed<FiltroUsuariosAdmin>(() => ({
    q: this.q()?.trim() || null,
    estado: leerEstado(this.estado()),
    page: leerPagina(this.page()),
    size: leerTamano(this.size()),
    sort: leerOrdenUsuarios(this.sort()),
  }));
  protected readonly orden = computed(() => this.filtro().sort as string | null);
  protected readonly hayFiltros = computed(() => !!this.filtro().q || !!this.filtro().estado);

  // ---- Datos: se piden de nuevo al cambiar el filtro (la URL) o al reintentar.
  // (Sin rxResource a propósito: sería su primer uso y metería ~8 kB en el bundle inicial.)
  protected readonly pagina = signal<Pagina<UsuarioAdminResponse> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly recargas = new Subject<void>();
  protected readonly filas = computed(() => this.pagina()?.content ?? []);
  protected readonly total = computed(() => {
    const n = this.pagina()?.totalElements ?? 0;
    return n === 1 ? '1 usuario' : `${formatearNumero(n, 0)} usuarios`;
  });

  // ---- Búsqueda: el texto escrito sigue a la URL (atrás/adelante) hasta que se escribe.
  protected readonly texto = linkedSignal(() => this.q() ?? '');
  private readonly escritura = new Subject<string>();

  // ---- Filtros (ns-select es un ControlValueAccessor)
  protected readonly estadoControl = new FormControl<EstadoUsuario | null>(null);
  protected readonly opcionesEstado: NsOpcion<EstadoUsuario | null>[] = [
    { valor: null, etiqueta: 'Todos' },
    { valor: 'ACTIVO', etiqueta: 'Activos' },
    { valor: 'BLOQUEADO', etiqueta: 'Bloqueados' },
    { valor: 'ELIMINADO', etiqueta: 'Eliminados' },
  ];
  protected readonly tamanos = TAMANOS_PAGINA;

  protected readonly columnas: NsColumna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: 'email', titulo: 'Email', ordenable: true },
    { clave: 'roles', titulo: 'Roles' },
    { clave: 'estado', titulo: 'Estado' },
    { clave: 'emailVerificado', titulo: 'Email verificado' },
    { clave: 'ultimoAcceso', titulo: 'Último acceso', ordenable: true, alinear: 'end' },
    { clave: 'creadoEn', titulo: 'Alta', ordenable: true, alinear: 'end' },
  ];
  protected readonly varianteEstado = VARIANTE_ESTADO;
  protected readonly varianteRol = VARIANTE_ROL;
  protected readonly rolesOrdenados = rolesOrdenados;

  // ---- Detalle
  protected readonly drawerAbierto = signal(false);
  protected readonly seleccionado = signal<UsuarioAdminResponse | null>(null);

  constructor() {
    combineLatest([toObservable(this.filtro), this.recargas.pipe(startWith(undefined))])
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(([filtro]) =>
          this.servicio.buscar(filtro).pipe(
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
    effect(() => this.estadoControl.setValue(this.filtro().estado ?? null, { emitEvent: false }));
    this.estadoControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((estado) => this.navegar({ estado, page: null }));
  }

  protected cambiarTamano(size: number | null): void {
    this.navegar({ size: size === null || size === TAMANO_POR_DEFECTO ? null : size, page: null });
  }

  protected alEscribir(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.texto.set(valor);
    this.escritura.next(valor);
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

  protected limpiarFiltros(): void {
    this.texto.set('');
    this.navegar({ q: null, estado: null, page: null });
  }

  protected abrir(usuario: UsuarioAdminResponse): void {
    this.seleccionado.set(usuario);
    this.drawerAbierto.set(true);
  }

  /** El PATCH del detalle actualiza la fila sin volver a pedir la página. */
  protected alActualizar(usuario: UsuarioAdminResponse): void {
    this.seleccionado.set(usuario);
    this.pagina.update((pagina) =>
      pagina ? { ...pagina, content: pagina.content.map((u) => (u.id === usuario.id ? usuario : u)) } : pagina,
    );
  }

  /** null quita el parámetro de la URL. */
  private navegar(cambios: Record<string, string | number | null>, reemplazar = false): void {
    void this.router.navigate([], { queryParams: cambios, queryParamsHandling: 'merge', replaceUrl: reemplazar });
  }
}
