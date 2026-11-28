import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

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

/** Deporte que se ofrece como principal: nombre visible, icono y código del catálogo de actividades. */
export interface DeportePrincipal {
  codigo: string;
  nombre: string;
  icono: string;
}

/**
 * Deportes del selector, en este orden. El valor que se guarda es el código del catálogo
 * (tipo_actividad), que el backend exige que exista y esté activo; su MET es el que se usa para
 * estimar el gasto de los entrenamientos. Los iconos están registrados en shared/design/iconos.ts.
 */
export const DEPORTES_PRINCIPALES: readonly DeportePrincipal[] = [
  { codigo: 'SENDERISMO', nombre: 'Senderismo', icono: 'hiking-stick' },
  { codigo: 'CAMINAR_5_6KMH', nombre: 'Caminar', icono: 'footprints' },
  { codigo: 'FITNESS_HIBRIDO', nombre: 'Fitness Hybrid', icono: 'flame' },
  { codigo: 'CARRERA_9_7KMH', nombre: 'Carrera', icono: 'sport-shoe' },
  { codigo: 'CICLISMO_16_19KMH', nombre: 'Ciclismo', icono: 'bike' },
  { codigo: 'FUTBOL_PARTIDO', nombre: 'Fútbol', icono: 'goal' },
  { codigo: 'BALONCESTO_PARTIDO', nombre: 'Baloncesto', icono: 'volleyball' },
  { codigo: 'PADEL', nombre: 'Pádel', icono: 'disc' },
  { codigo: 'TENIS_INDIVIDUAL', nombre: 'Tenis', icono: 'circle-dot' },
  { codigo: 'CROSSFIT', nombre: 'CrossFit', icono: 'weight' },
  { codigo: 'FUERZA_MODERADA', nombre: 'Gimnasio', icono: 'dumbbell' },
  { codigo: 'NATACION_MODERADA', nombre: 'Natación', icono: 'waves-ladder' },
  { codigo: 'TRIATLON', nombre: 'Triatlón', icono: 'medal' },
  { codigo: 'ESQUI', nombre: 'Esquí', icono: 'mountain-snow' },
  { codigo: 'ESCALADA', nombre: 'Escalada', icono: 'mountain' },
  { codigo: 'TRAIL', nombre: 'Trail', icono: 'route' },
];

/** Tarjetas que se muestran: los deportes de la lista que el catálogo tiene activos, en su orden. */
export function deportesDisponibles(tipos: readonly TipoActividadResponse[]): DeportePrincipal[] {
  const codigos = new Set(tipos.map((t) => t.codigo));
  return DEPORTES_PRINCIPALES.filter((d) => codigos.has(d.codigo));
}

/** Icono de cada nivel de actividad fuera del entrenamiento. */
const ICONOS_NIVEL: Record<NivelActividad, string> = {
  SEDENTARIO: 'armchair',
  LIGERO: 'footprints',
  MODERADO: 'person-standing',
  ALTO: 'hard-hat',
};

/**
 * Paso 2 · Tu deporte: deporte principal (una tarjeta por deporte de DEPORTES_PRINCIPALES que exista
 * en GET /entrenamientos/tipos; el valor es el código del catálogo), días por semana (0–7), duración media y nivel de actividad
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
        <p class="ns-paso__ayuda">
          Elige el que más practicas. Podrás registrar cualquier actividad en tus entrenamientos.
        </p>
        @if (cargando()) {
          <div class="ns-deportes" aria-busy="true" aria-label="Cargando deportes">
            @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
              <ns-skeleton shape="rect" height="104px" />
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
          <div class="ns-deportes">
            @for (d of deportes(); track d.codigo) {
              <label class="ns-deporte">
                <input
                  class="ns-tarjeta__radio"
                  type="radio"
                  name="deportePrincipal"
                  formControlName="deportePrincipal"
                  [value]="d.codigo"
                />
                <span class="ns-deporte__icono" aria-hidden="true">
                  <svg [lucideIcon]="d.icono" [size]="22"></svg>
                </span>
                <span class="ns-deporte__nombre">{{ d.nombre }}</span>
                <span class="ns-deporte__indicador" aria-hidden="true">
                  <svg lucideIcon="check" [size]="12" [strokeWidth]="3"></svg>
                </span>
              </label>
            }
          </div>
        }
        <p
          class="ns-paso__error"
          #error="nsErrorCampo"
          [nsErrorCampo]="grupo().controls.deportePrincipal"
          [nsErrorCampoPara]="deporte"
        ></p>
      </fieldset>

      <section class="ns-rutina" aria-labelledby="ns-rutina-titulo">
        <h2 class="ns-rutina__titulo" id="ns-rutina-titulo">Tu rutina de entrenamiento</h2>
        <div class="ns-rutina__campos">
          <ns-form-field class="ns-rutina__campo" label="Días de entrenamiento por semana" obligatorio>
            <ns-segmented formControlName="diasEntrenamientoSemana" [opciones]="dias" />
          </ns-form-field>
          <ns-form-field
            class="ns-rutina__campo"
            label="Duración media de cada sesión"
            hint="Entre 0 y 600 minutos."
            obligatorio
          >
            <ns-quantity-input formControlName="duracionMediaMin" [min]="0" [max]="600" [step]="5" unit="min" />
          </ns-form-field>
        </div>
      </section>

      <fieldset class="ns-paso__grupo" #nivel>
        <legend class="ns-paso__leyenda">Actividad fuera del entrenamiento <span aria-hidden="true">*</span></legend>
        <p class="ns-paso__ayuda">
          Cuánto te mueves en tu día a día sin contar los entrenamientos: trabajo, desplazamientos y tareas.
        </p>
        <div class="ns-tarjetas ns-tarjetas--grandes">
          @for (n of niveles; track n.valor) {
            <label class="ns-tarjeta">
              <input
                class="ns-tarjeta__radio"
                type="radio"
                name="nivelActividad"
                formControlName="nivelActividad"
                [value]="n.valor"
              />
              <svg class="ns-tarjeta__icono" [lucideIcon]="n.icono" [size]="20" aria-hidden="true"></svg>
              <span class="ns-tarjeta__textos">
                <span class="ns-tarjeta__titulo">{{ n.etiqueta }}</span>
                <span class="ns-tarjeta__descripcion">{{ n.descripcion }}</span>
              </span>
              <svg class="ns-tarjeta__check" lucideIcon="circle-check" [size]="20" aria-hidden="true"></svg>
            </label>
          }
        </div>
        <p class="ns-paso__error" [nsErrorCampo]="grupo().controls.nivelActividad" [nsErrorCampoPara]="nivel"></p>
      </fieldset>
    </div>
  `,
  styleUrls: ['./pasos.scss', './paso-deporte.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasoDeporteComponent {
  readonly grupo = input.required<GrupoDeporte>();

  private readonly tiposActividad = inject(TiposActividadService);

  protected readonly dias: NsOpcion<number>[] = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({
    valor: n,
    etiqueta: String(n),
  }));
  protected readonly niveles = (Object.keys(ETIQUETAS_NIVEL_ACTIVIDAD) as NivelActividad[]).map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_NIVEL_ACTIVIDAD[valor],
    descripcion: DESCRIPCION_NIVEL[valor],
    icono: ICONOS_NIVEL[valor],
  }));

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  private readonly tipos = signal<TipoActividadResponse[]>([]);
  protected readonly deportes = computed(() => deportesDisponibles(this.tipos()));

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
