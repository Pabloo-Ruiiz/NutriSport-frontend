import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

import type { AlternativaResponse, DiaMenuResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import { formatearFecha, formatearKcal } from '@shared/pipes/formato';
import { GramosPipe } from '@shared/pipes/gramos.pipe';
import { KcalPipe } from '@shared/pipes/kcal.pipe';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsCalcStatusComponent } from '@shared/ui/data/calc-status.component';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsSourcesNoteComponent } from '@shared/ui/data/sources-note.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import { formatearDelta, franjaDe } from '../planificador';
import { PlanificadorEditor, type ContextoReceta } from '../planificador-editor';
import { PlanificadorStore } from '../planificador.store';
import { formatearRaciones } from './meal-slot.component';

/** Espera tras escribir en el buscador antes de pedir las recetas. */
export const DEBOUNCE_RECETAS_DISPONIBLES_MS = 300;
/** Raciones de una comida planificada: > 0 y ≤ 10 (AnadirComidaRequest.raciones). */
export const MAX_RACIONES = 10;

type Resultado =
  { estado: 'cargando' } | { estado: 'listo'; recetas: AlternativaResponse[] } | { estado: 'error'; error: string };

/**
 * "Hueco" del día para la cabecera: objetivo − planificado (del DiaMenuResponse). Al sustituir, la
 * comida que se cambia no cuenta como planificada. Redondeado a 10 kcal ("faltan ≈ 560 kcal").
 * null si el día no tiene objetivo (sin perfil).
 */
export function textoHueco(dia: DiaMenuResponse | null | undefined, kcalSustituida = 0): string | null {
  if (!dia?.objetivo) return null;
  const hueco = Math.round((dia.objetivo.total.kcal - dia.planificado.kcal + kcalSustituida) / 10) * 10;
  return hueco > 0 ? `faltan ≈ ${formatearKcal(hueco)}` : `objetivo cubierto (${formatearDelta(-hueco)} kcal)`;
}

/** Raciones válidas para el menú: > 0 y ≤ 10. */
export function racionesValidas(raciones: number | null | undefined): raciones is number {
  return typeof raciones === 'number' && Number.isFinite(raciones) && raciones > 0 && raciones <= MAX_RACIONES;
}

/**
 * Drawer "Añadir receta" (DESIGN.md §7.23, 420 px): se abre desde una franja vacía o desde
 * "Sustituir" (PlanificadorEditor.drawer).
 *
 * - Cabecera con la franja, el día y el hueco energético ("Cena · sáb. 21 nov · faltan ≈ 560 kcal").
 * - Buscador (q, con debounce) y GET /menus/recetas-disponibles?fecha=&tipoComida=&q=: cada receta
 *   con kcal y proteína para las raciones propuestas, diferenciaKcalPct, procedencia y estado del
 *   cálculo. Son radios: se elige una y se ajustan las raciones (> 0 y ≤ 10; al elegirla, las
 *   propuestas).
 * - "Añadir" → POST /menus/{id}/comidas; al sustituir, PUT { recetaId, raciones }.
 */
@Component({
  selector: 'app-anadir-receta-drawer',
  imports: [
    FormsModule,
    GramosPipe,
    KcalPipe,
    NsAlertComponent,
    NsButtonComponent,
    NsCalcStatusComponent,
    NsDrawerComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsQuantityInputComponent,
    NsSkeletonComponent,
    NsSourceBadgeComponent,
    NsSourcesNoteComponent,
  ],
  template: `
    <ns-drawer
      [abierto]="!!contexto()"
      (abiertoChange)="!$event && editor.cerrarReceta()"
      [titulo]="titulo()"
      [ancho]="420"
    >
      @if (contexto(); as ctx) {
        <div class="ns-ar">
          <p class="ns-ar__contexto">
            {{ subtitulo() }}
            @if (ctx.modo === 'sustituir') {
              <br />Actual: {{ ctx.comida.receta.nombre }}
            }
          </p>

          <ns-form-field label="Buscar en recetas disponibles">
            <input
              nsInput
              type="search"
              name="q"
              autocomplete="off"
              maxlength="100"
              [ngModel]="q()"
              (ngModelChange)="q.set($event)"
            />
          </ns-form-field>

          @switch (resultado()?.estado) {
            @case ('cargando') {
              <div class="ns-ar__lista" aria-busy="true" aria-label="Cargando recetas">
                <ns-skeleton shape="rect" height="88px" />
                <ns-skeleton shape="rect" height="88px" />
                <ns-skeleton shape="rect" height="88px" />
              </div>
            }
            @case ('error') {
              <ns-alert type="error">{{ errorResultado() }}</ns-alert>
            }
            @case ('listo') {
              <fieldset class="ns-ar__lista">
                <legend class="ns-sr-only">Recetas disponibles</legend>
                @for (r of recetas(); track r.receta.id ?? r.receta.nombre) {
                  <label class="ns-ar__receta" [class.ns-ar__receta--elegida]="seleccion() === r">
                    <input
                      type="radio"
                      name="receta"
                      class="ns-ar__radio"
                      [checked]="seleccion() === r"
                      [disabled]="!r.receta.id"
                      (change)="seleccion.set(r)"
                    />
                    <span class="ns-ar__datos">
                      <span class="ns-ar__nombre">{{ r.receta.nombre }}</span>
                      <span class="ns-ar__cifras">
                        {{ raciones(r.raciones) }} {{ r.raciones === 1 ? 'ración' : 'raciones' }} · ≈
                        {{ r.nutrientes.kcal | kcal }} · ≈ {{ r.nutrientes.proteina | gramos }}
                        <abbr title="de proteína">P</abbr>
                      </span>
                      <span class="ns-ar__badges">
                        <ns-source-badge [fuente]="r.receta.origen" />
                        <ns-calc-status [estado]="r.receta.estadoNutricional" />
                      </span>
                    </span>
                    @if (r.diferenciaKcalPct !== null) {
                      <span class="ns-ar__ajuste">
                        <strong>{{ delta(r.diferenciaKcalPct) }} %</strong>
                        <span>frente al hueco</span>
                      </span>
                    }
                  </label>
                } @empty {
                  <p class="ns-ar__vacio">
                    @if (q().trim()) {
                      No hay recetas disponibles que contengan «{{ q().trim() }}».
                    } @else {
                      No hay recetas disponibles para esta franja.
                    }
                  </p>
                }
              </fieldset>
            }
          }

          <p class="ns-ar__nota">
            Solo aparecen recetas publicadas con cálculo nutricional completo o aproximado, aptas para la franja y
            compatibles con tus restricciones. Las cifras son para las raciones propuestas.
          </p>
          <ns-sources-note [fuentes]="origenes()" />
        </div>
      }

      <div nsDrawerAcciones class="ns-ar__pie">
        <ns-form-field label="Raciones" class="ns-ar__raciones">
          <ns-quantity-input
            name="raciones"
            [min]="0.25"
            [max]="maxRaciones"
            [step]="0.25"
            [decimales]="2"
            etiqueta="Raciones"
            [ngModel]="racionesElegidas()"
            (ngModelChange)="racionesElegidas.set($event)"
          />
        </ns-form-field>
        <button
          nsButton
          type="button"
          [icon]="contexto()?.modo === 'sustituir' ? 'refresh-cw' : 'plus'"
          [disabled]="!puedeGuardar()"
          [loading]="editor.ocupado()"
          (click)="guardar()"
        >
          {{ textoGuardar() }}
        </button>
      </div>
    </ns-drawer>
  `,
  styles: `
    .ns-ar {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-ar__contexto {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-ar__lista {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .ns-ar__receta {
      display: flex;
      align-items: flex-start;
      gap: var(--ns-space-3);
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface);
      cursor: pointer;

      &:hover {
        border-color: var(--ns-border-strong);
      }
      &:has(.ns-ar__radio:focus-visible) {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
      &:has(.ns-ar__radio:disabled) {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }
    .ns-ar__receta--elegida {
      border-color: var(--ns-accent);
      background: var(--ns-success-bg);
    }
    .ns-ar__radio {
      flex-shrink: 0;
      margin: 2px 0 0;
      accent-color: var(--ns-accent);
    }
    .ns-ar__datos {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--ns-space-1);
      min-width: 0;
    }
    .ns-ar__nombre {
      font-size: 0.875rem;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .ns-ar__cifras {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    abbr {
      text-decoration: none;
    }
    .ns-ar__badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-1);
    }
    .ns-ar__ajuste {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      color: var(--ns-text-secondary);
      font-size: 0.6875rem;
      text-align: right;
      white-space: nowrap;

      strong {
        color: var(--ns-text);
        font-size: 0.875rem;
      }
    }
    .ns-ar__vacio,
    .ns-ar__nota {
      margin: 0;
      color: var(--ns-text-tertiary);
      font-size: 0.75rem;
    }
    .ns-ar__pie {
      display: flex;
      flex: 1;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--ns-space-3);
    }
    .ns-ar__raciones {
      max-width: 180px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnadirRecetaDrawerComponent {
  protected readonly editor = inject(PlanificadorEditor);
  private readonly store = inject(PlanificadorStore);
  private readonly menusService = inject(MenusService);

  protected readonly maxRaciones = MAX_RACIONES;
  protected readonly delta = formatearDelta;
  protected readonly raciones = formatearRaciones;

  protected readonly contexto = this.editor.drawer;

  /** Día y franja de la búsqueda. */
  private readonly destino = computed(() => destinoDe(this.contexto()));
  private readonly dia = computed(() => {
    const destino = this.destino();
    return destino ? (this.store.menu()?.dias.find((d) => d.fecha === destino.fecha) ?? null) : null;
  });

  protected readonly titulo = computed(() => {
    const destino = this.destino();
    if (!destino) return 'Añadir receta';
    const franja = ETIQUETAS_TIPO_COMIDA[destino.tipoComida];
    return this.contexto()?.modo === 'sustituir' ? `Sustituir · ${franja}` : `Añadir receta · ${franja}`;
  });
  protected readonly subtitulo = computed(() => {
    const destino = this.destino();
    const ctx = this.contexto();
    if (!destino || !ctx) return '';
    const dia = this.dia();
    const hueco = textoHueco(dia, ctx.modo === 'sustituir' ? ctx.comida.nutrientes.kcal : 0);
    return [
      ETIQUETAS_TIPO_COMIDA[destino.tipoComida],
      formatearFecha(destino.fecha, 'corta'),
      dia?.diaEntreno ? 'día de entreno' : null,
      hueco,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  /** Texto del buscador; se vacía al abrir el drawer para otra franja. */
  protected readonly q = linkedSignal<ContextoReceta | null, string>({ source: this.contexto, computation: () => '' });

  private readonly resultado$ = combineLatest([
    toObservable(this.destino),
    // La primera búsqueda (sin texto) sale al momento; lo que se escribe espera al debounce.
    toObservable(this.q).pipe(
      map((q) => q.trim()),
      debounceTime(DEBOUNCE_RECETAS_DISPONIBLES_MS),
      startWith(''),
      distinctUntilChanged(),
    ),
  ]).pipe(
    switchMap(([destino, q]) =>
      destino
        ? this.menusService.recetasDisponibles(destino.fecha, destino.tipoComida, q).pipe(
            map((recetas): Resultado => ({ estado: 'listo', recetas })),
            catchError((e: unknown) => of<Resultado>({ estado: 'error', error: aApiError(e).detalle })),
            startWith<Resultado>({ estado: 'cargando' }),
          )
        : of(null),
    ),
  );
  protected readonly resultado = toSignal(this.resultado$, { initialValue: null });
  protected readonly recetas = computed(() => {
    const r = this.resultado();
    return r?.estado === 'listo' ? r.recetas : [];
  });
  protected readonly origenes = computed(() => this.recetas().map((r) => r.receta.origen));
  protected readonly errorResultado = computed(() => {
    const r = this.resultado();
    return r?.estado === 'error' ? r.error : null;
  });

  /** Receta elegida: se olvida al cambiar el contexto o los resultados. */
  protected readonly seleccion = linkedSignal<AlternativaResponse[], AlternativaResponse | null>({
    source: this.recetas,
    computation: () => null,
  });
  /** Raciones: al elegir una receta, las propuestas por el servidor. */
  protected readonly racionesElegidas = linkedSignal<AlternativaResponse | null, number | null>({
    source: this.seleccion,
    computation: (r) => r?.raciones ?? 1,
  });

  protected readonly puedeGuardar = computed(
    () => !!this.seleccion()?.receta.id && racionesValidas(this.racionesElegidas()) && !this.editor.ocupado(),
  );
  protected readonly textoGuardar = computed(() => {
    const destino = this.destino();
    if (this.contexto()?.modo === 'sustituir') return 'Sustituir';
    const franja = destino ? aLaFranja(destino.tipoComida) : '';
    return franja ? `Añadir ${franja}` : 'Añadir';
  });

  protected async guardar(): Promise<void> {
    const ctx = this.contexto();
    const destino = this.destino();
    const recetaId = this.seleccion()?.receta.id;
    const raciones = this.racionesElegidas();
    if (!ctx || !destino || !recetaId || !racionesValidas(raciones)) return;
    const ok =
      ctx.modo === 'sustituir'
        ? await this.editor.sustituir(ctx.comida, recetaId, raciones)
        : await this.editor.anadir({ recetaId, fecha: destino.fecha, tipoComida: destino.tipoComida, raciones });
    if (ok) this.editor.cerrarReceta();
  }
}

function destinoDe(ctx: ContextoReceta | null): { fecha: string; tipoComida: TipoComida } | null {
  if (!ctx) return null;
  return ctx.modo === 'anadir'
    ? { fecha: ctx.fecha, tipoComida: ctx.tipoComida }
    : { fecha: ctx.comida.fecha, tipoComida: franjaDe(ctx.comida) };
}

/** "a la cena", "al desayuno", "al pre-entreno"… para "Añadir a la cena". Sin franja concreta, "". */
function aLaFranja(tipo: TipoComida): string {
  if (tipo === 'OTRO') return '';
  const nombre = ETIQUETAS_TIPO_COMIDA[tipo].toLocaleLowerCase('es-ES');
  const femenino = tipo === 'COMIDA' || tipo === 'MERIENDA' || tipo === 'CENA' || tipo === 'MEDIA_MANANA';
  return femenino ? `a la ${nombre}` : `al ${nombre}`;
}
