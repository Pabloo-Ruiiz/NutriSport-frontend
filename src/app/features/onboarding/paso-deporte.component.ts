import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { startWith, switchMap } from 'rxjs';

import type { NivelActividad, TipoActividadResponse } from '@core/models';
import { ETIQUETAS_NIVEL_ACTIVIDAD } from '@core/models/etiquetas';
import { TiposActividadService } from '@core/services/tipos-actividad.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { ErrorCampoDirective } from '@shared/ui/form/error-campo.directive';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import type { GrupoDeporte } from './perfil-form';

/** Qué significa cada nivel de actividad FUERA del entrenamiento. */
export const DESCRIPCION_NIVEL: Record<NivelActividad, string> = {
  SEDENTARIO: 'Trabajas o estudias sentado y apenas caminas durante el día.',
  LIGERO: 'Pasas bastante tiempo sentado, pero caminas o haces recados a diario.',
  MODERADO: 'Pasas buena parte del día de pie o caminando (comercio, docencia, sanidad…).',
  ALTO: 'Tu trabajo es físico: cargas peso o estás en movimiento casi todo el día.',
};

export interface GrupoTipos {
  categoria: string;
  tipos: TipoActividadResponse[];
}

/** Agrupa los tipos por categoría manteniendo el orden del servidor; sin categoría, "Otros" al final. */
export function agruparTipos(tipos: readonly TipoActividadResponse[]): GrupoTipos[] {
  const grupos = new Map<string, TipoActividadResponse[]>();
  for (const tipo of tipos) {
    const categoria = tipo.categoria?.trim() || 'Otros';
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), tipo]);
  }
  const lista = [...grupos].map(([categoria, lista]) => ({ categoria, tipos: lista }));
  return [...lista.filter((g) => g.categoria !== 'Otros'), ...lista.filter((g) => g.categoria === 'Otros')];
}

/** Icono de una categoría de actividad (los registrados en shared/design/iconos.ts). */
function iconoCategoria(categoria: string): string {
  const c = categoria.toLocaleLowerCase('es-ES');
  if (/fuerza|gimnasio|pesas|musculaci/.test(c)) return 'dumbbell';
  if (/equipo|raqueta|pelota|bal[oó]n/.test(c)) return 'zap';
  return 'activity';
}

/**
 * Paso 2 · Tu deporte: deporte principal (tarjetas de GET /entrenamientos/tipos agrupadas por
 * categoría; el valor es el código), días por semana (0–7), duración media y nivel de actividad
 * fuera del entrenamiento.
 */
@Component({
  selector: 'app-paso-deporte',
  imports: [
    ReactiveFormsModule,
    LucideDynamicIcon,
    NsAlertComponent,
    NsButtonComponent,
    NsSkeletonComponent,
    ErrorCampoDirective,
    NsFormFieldComponent,
    NsQuantityInputComponent,
    NsSegmentedComponent,
  ],
  template: `
    <div class="ns-paso" [formGroup]="grupo()">
      <fieldset class="ns-paso__grupo" #deporte [attr.aria-describedby]="error.visible() ? error.id : null">
        <legend class="ns-paso__leyenda">Deporte principal <span aria-hidden="true">*</span></legend>
        @if (cargando()) {
          <div class="ns-tarjetas" aria-busy="true" aria-label="Cargando deportes">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <ns-skeleton shape="rect" height="48px" />
            }
          </div>
        } @else if (errorCarga(); as mensaje) {
          <ns-alert type="error" titulo="No hemos podido cargar los deportes">
            {{ mensaje }}
            <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="cargar()">
              Reintentar
            </button>
          </ns-alert>
        } @else {
          @for (g of grupos(); track g.categoria) {
            <p class="ns-paso__subtitulo" aria-hidden="true">{{ g.categoria }}</p>
            <div class="ns-tarjetas" role="presentation">
              @for (tipo of g.tipos; track tipo.codigo) {
                <label class="ns-tarjeta">
                  <input
                    class="ns-tarjeta__radio"
                    type="radio"
                    name="deportePrincipal"
                    formControlName="deportePrincipal"
                    [value]="tipo.codigo"
                  />
                  <svg class="ns-tarjeta__icono" [lucideIcon]="icono(g.categoria)" [size]="20" aria-hidden="true"></svg>
                  <span class="ns-tarjeta__textos">
                    <span class="ns-tarjeta__titulo">{{ tipo.nombre }}</span>
                    <span class="ns-sr-only">, {{ g.categoria }}</span>
                  </span>
                  <svg class="ns-tarjeta__check" lucideIcon="circle-check" [size]="18" aria-hidden="true"></svg>
                </label>
              }
            </div>
          }
        }
        <p
          class="ns-paso__error"
          #error="nsErrorCampo"
          [nsErrorCampo]="grupo().controls.deportePrincipal"
          [nsErrorCampoPara]="deporte"
        ></p>
      </fieldset>

      <ns-form-field label="Días de entrenamiento por semana" obligatorio>
        <ns-segmented formControlName="diasEntrenamientoSemana" [opciones]="dias" />
      </ns-form-field>

      <ns-form-field label="Duración media de cada sesión" hint="Entre 0 y 600 minutos." obligatorio>
        <ns-quantity-input formControlName="duracionMediaMin" [min]="0" [max]="600" [step]="5" unit="min" />
      </ns-form-field>

      <ns-form-field
        label="Actividad fuera del entrenamiento"
        hint="Cuánto te mueves en tu día a día sin contar los entrenamientos: trabajo, desplazamientos y tareas."
        obligatorio
      >
        <ns-segmented formControlName="nivelActividad" [opciones]="niveles" />
      </ns-form-field>
      @if (descripcionNivel(); as descripcion) {
        <p class="ns-paso__ayuda" aria-live="polite">{{ descripcion }}</p>
      }
    </div>
  `,
  styleUrl: './pasos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasoDeporteComponent {
  readonly grupo = input.required<GrupoDeporte>();

  private readonly tiposActividad = inject(TiposActividadService);

  protected readonly dias: NsOpcion<number>[] = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({
    valor: n,
    etiqueta: String(n),
  }));
  protected readonly niveles: NsOpcion<NivelActividad>[] = (
    Object.keys(ETIQUETAS_NIVEL_ACTIVIDAD) as NivelActividad[]
  ).map((valor) => ({ valor, etiqueta: ETIQUETAS_NIVEL_ACTIVIDAD[valor] }));

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  private readonly tipos = signal<TipoActividadResponse[]>([]);
  protected readonly grupos = computed(() => agruparTipos(this.tipos()));

  /** Nivel elegido, para explicar qué significa. */
  private readonly nivelActual = toSignal(
    toObservable(this.grupo).pipe(
      switchMap(({ controls }) => controls.nivelActividad.valueChanges.pipe(startWith(controls.nivelActividad.value))),
    ),
    { initialValue: null },
  );
  protected readonly descripcionNivel = computed(() => {
    const nivel = this.nivelActual();
    return nivel ? DESCRIPCION_NIVEL[nivel] : null;
  });

  protected readonly icono = iconoCategoria;

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.tiposActividad.listar().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.errorCarga.set(aApiError(e).detalle);
        this.cargando.set(false);
      },
    });
  }
}
