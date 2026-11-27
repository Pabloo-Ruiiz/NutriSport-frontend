import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';

import type { RecetaResponse, RecetaResumenResponse, RegistroComidaResponse } from '@core/models';
import { ETIQUETAS_DIFICULTAD } from '@core/models/etiquetas';
import { RecetasService } from '@core/services/recetas.service';
import { aApiError } from '@core/util/api-error';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsRecipeCardComponent } from '@shared/ui/data/recipe-card.component';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NS_TABS } from '@shared/ui/nav/tabs.component';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import {
  RegistrarRecetaDialogComponent,
  type RegistrarRecetaData,
} from '@features/comidas/componentes/registrar-receta-dialog.component';
import {
  AnadirRecetaListaDialogComponent,
  type AnadirRecetaListaData,
  type AnadirRecetaListaResultado,
} from '@features/compra/anadir-receta-lista-dialog.component';
import { claveReceta } from '../recetas-url';
import { IngredientesRecetaComponent, leerRaciones } from './ingredientes-receta.component';
import { NutricionRecetaComponent } from './nutricion-receta.component';

type Estado = 'cargando' | 'listo' | 'error' | 'no-encontrada';

/** Recetas relacionadas que se muestran. */
const MAX_RELACIONADAS = 3;

/**
 * Detalle de receta (/recetas/:id?raciones=, DESIGN.md §7.11 y §7.22): cabecera con imagen y
 * acciones, ingredientes con las cantidades para las raciones elegidas, nutrición calculada,
 * instrucciones, relacionadas y atribución de TheMealDB.
 *
 * Reglas: con el cálculo INCOMPLETO o si no es compatible con las restricciones del usuario,
 * "Registrar como comida" y "Añadir al plan" se desactivan con el motivo visible.
 *
 * En pantallas estrechas (< 1024 px), una columna con pestañas Ingredientes · Pasos · Nutrición.
 */
@Component({
  selector: 'app-detalle-receta',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    LucideDynamicIcon,
    NS_TABS,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsEmptyStateComponent,
    NsRecipeCardComponent,
    NsSkeletonComponent,
    NsSourceBadgeComponent,
    IngredientesRecetaComponent,
    NutricionRecetaComponent,
  ],
  templateUrl: './detalle-receta.component.html',
  styleUrl: './detalle-receta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleRecetaComponent {
  private readonly servicio = inject(RecetasService);
  private readonly router = inject(Router);
  private readonly toasts = inject(NsToastService);
  private readonly dialogos = inject(NsDialogService);

  // ---- Parámetros de la ruta (withComponentInputBinding)
  readonly id = input.required<string>();
  readonly raciones = input<string>();

  private readonly peticion = computed(() => ({ id: this.id(), raciones: leerRaciones(this.raciones()) }));

  protected readonly movil = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 1023.98px)')
      .pipe(map((e) => e.matches)),
    { initialValue: false },
  );

  // ---- Receta
  protected readonly receta = signal<RecetaResponse | null>(null);
  protected readonly estado = signal<Estado>('cargando');
  protected readonly error = signal<string | null>(null);
  /** Recalculando con otras raciones (la receta anterior sigue en pantalla). */
  protected readonly actualizando = signal(false);
  private readonly recargas = new Subject<void>();

  protected readonly enIngles = computed(() => this.receta()?.idioma === 'en');
  protected readonly deTheMealDb = computed(() => this.receta()?.origen === 'THEMEALDB');
  protected readonly meta = computed(() => {
    const r = this.receta();
    return r ? [r.categoria, r.area].filter((p): p is string => !!p?.trim()).join(' · ') : '';
  });
  protected readonly dificultad = computed(() => {
    const d = this.receta()?.dificultad;
    return d ? ETIQUETAS_DIFICULTAD[d] : null;
  });
  protected readonly resumen = computed(() => {
    const r = this.receta();
    const n = r?.nutricionRacion;
    if (!r || !n || r.estadoNutricional === 'INCOMPLETO') return null;
    const aprox = r.estadoNutricional === 'APROXIMADO' ? '≈ ' : '';
    return { kcal: aprox + formatearNumero(n.kcal, 0), proteina: aprox + formatearNumero(n.proteinas, 0) };
  });
  protected readonly textoRaciones = computed(() => {
    const r = this.receta();
    if (!r) return '';
    return `${r.raciones} ${r.raciones === 1 ? 'ración' : 'raciones'}${r.racionesSupuestas ? ' (supuestas)' : ''}`;
  });

  /** Por qué no se puede registrar ni planificar, o null si se puede. */
  protected readonly motivoBloqueo = computed(() => {
    const r = this.receta();
    if (!r) return null;
    if (r.estadoNutricional === 'INCOMPLETO')
      return 'No se puede registrar ni añadir al plan: el cálculo nutricional está incompleto.';
    if (!r.compatible)
      return 'No se puede registrar ni añadir al plan: no es compatible con tus restricciones alimentarias.';
    return null;
  });

  // ---- Favorita
  protected readonly guardandoFavorita = signal(false);

  // ---- Relacionadas
  protected readonly relacionadas = signal<RecetaResumenResponse[]>([]);
  protected readonly abriendo = signal<string | null>(null);
  protected readonly guardandoRelacionada = signal<string | null>(null);
  protected readonly clave = claveReceta;

  // ---- Pestañas (móvil)
  protected readonly pestanas: NsOpcion<string>[] = [
    { valor: 'ingredientes', etiqueta: 'Ingredientes' },
    { valor: 'pasos', etiqueta: 'Pasos' },
    { valor: 'nutricion', etiqueta: 'Nutrición' },
  ];
  protected readonly pestana = signal<string | null>('ingredientes');

  constructor() {
    combineLatest([toObservable(this.peticion), this.recargas.pipe(startWith(undefined))])
      .pipe(
        tap(([{ id }]) => {
          // Otra receta: se vacía; las mismas con otras raciones: se mantiene mientras recalcula.
          const misma = this.receta()?.id === id;
          if (!misma) this.receta.set(null);
          this.estado.set(misma ? 'listo' : 'cargando');
          this.actualizando.set(misma);
          this.error.set(null);
        }),
        switchMap(([{ id, raciones }]) =>
          this.servicio.detalle(id, raciones ?? undefined).pipe(
            catchError((e: unknown) => {
              const error = aApiError(e);
              this.error.set(error.detalle);
              this.estado.set(error.status === 404 ? 'no-encontrada' : 'error');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((receta) => {
        this.actualizando.set(false);
        if (!receta) {
          // Si falla un recálculo, la receta anterior sigue a la vista con un toast.
          if (this.receta() && this.estado() === 'error') {
            this.estado.set('listo');
            this.toasts.error('No hemos podido recalcular las cantidades', this.error() ?? undefined);
          }
          return;
        }
        this.receta.set(receta);
        this.estado.set('listo');
      });

    toObservable(this.id)
      .pipe(
        tap(() => this.relacionadas.set([])),
        switchMap((id) => this.servicio.relacionadas(id).pipe(catchError(() => of([])))),
        takeUntilDestroyed(),
      )
      .subscribe((lista) => this.relacionadas.set(lista.slice(0, MAX_RELACIONADAS)));
  }

  protected reintentar(): void {
    this.recargas.next();
  }

  protected cambiarRaciones(raciones: number): void {
    void this.router.navigate([], { queryParams: { raciones }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** Favorita optimista: cambia al momento y se revierte con un toast si falla. */
  protected alternarFavorita(): void {
    const r = this.receta();
    if (!r || this.guardandoFavorita()) return;
    const favorita = !r.favorita;
    this.receta.set({ ...r, favorita });
    this.guardandoFavorita.set(true);
    const peticion = favorita ? this.servicio.marcarFavorita(r.id) : this.servicio.quitarFavorita(r.id);
    peticion.subscribe({
      complete: () => this.guardandoFavorita.set(false),
      error: (e: unknown) => {
        this.guardandoFavorita.set(false);
        this.receta.update((actual) => (actual ? { ...actual, favorita: !favorita } : actual));
        this.toasts.error(
          favorita ? 'No hemos podido guardarla en favoritas' : 'No hemos podido quitarla de favoritas',
          aApiError(e).detalle,
        );
      },
    });
  }

  /** Abre el diálogo de registro (raciones, fecha y tipo) → POST /comidas/desde-receta. */
  protected registrar(): void {
    const r = this.receta();
    if (!r || this.motivoBloqueo()) return;
    this.dialogos.open<RegistrarRecetaDialogComponent, RegistroComidaResponse, RegistrarRecetaData>(
      RegistrarRecetaDialogComponent,
      { titulo: 'Registrar como comida', size: 'sm', data: { receta: r } },
    );
  }

  /** Se conecta con el planificador en el paso 31. */
  protected planificar(): void {
    const r = this.receta();
    if (!r || this.motivoBloqueo()) return;
    void this.router.navigate(['/planificador'], { queryParams: { receta: r.id } });
  }

  /** Ingredientes a una lista de la compra, con las raciones que se están viendo. */
  protected anadirALista(): void {
    const r = this.receta();
    if (!r) return;
    this.dialogos
      .open<AnadirRecetaListaDialogComponent, AnadirRecetaListaResultado, AnadirRecetaListaData>(
        AnadirRecetaListaDialogComponent,
        {
          titulo: 'Añadir a la lista de la compra',
          size: 'sm',
          data: { receta: { id: r.id, nombre: r.nombre }, raciones: leerRaciones(this.raciones()) ?? r.raciones },
        },
      )
      .closed.subscribe((resultado) => {
        if (!resultado) return;
        const { lista } = resultado;
        this.toasts.exito('Ingredientes añadidos', lista.nombre, {
          texto: 'Ver lista',
          ejecutar: () => void this.router.navigate(['/compra', lista.id]),
        });
      });
  }

  // ---- Relacionadas

  protected abrirRelacionada(receta: RecetaResumenResponse): void {
    if (this.abriendo()) return;
    this.abriendo.set(claveReceta(receta));
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

  protected alternarFavoritaRelacionada(receta: RecetaResumenResponse, favorita: boolean): void {
    const clave = claveReceta(receta);
    if (this.guardandoRelacionada()) return;
    const actualizar = (cambios: Partial<RecetaResumenResponse>) =>
      this.relacionadas.update((lista) => lista.map((r) => (claveReceta(r) === clave ? { ...r, ...cambios } : r)));
    actualizar({ favorita });
    this.guardandoRelacionada.set(clave);
    this.servicio.cambiarFavorita(receta, favorita).subscribe({
      next: (id) => {
        this.guardandoRelacionada.set(null);
        actualizar({ id });
      },
      error: (e: unknown) => {
        this.guardandoRelacionada.set(null);
        actualizar({ favorita: !favorita });
        this.toasts.error(
          favorita ? 'No hemos podido guardarla en favoritas' : 'No hemos podido quitarla de favoritas',
          aApiError(e).detalle,
        );
      },
    });
  }
}
