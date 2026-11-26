import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { map, startWith } from 'rxjs';

import type { EntrenamientoResponse, EstadoEntrenamiento, Intensidad, TipoActividadResponse } from '@core/models';
import { ETIQUETAS_ESTADO_ENTRENAMIENTO, ETIQUETAS_INTENSIDAD } from '@core/models/etiquetas';
import { EntrenamientosService } from '@core/services/entrenamientos.service';
import { TiposActividadService } from '@core/services/tipos-actividad.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor } from '@core/util/formularios';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { idUnico } from '@shared/ui/form/control-campo';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { type NsDialogService } from '@shared/ui/overlay/dialog.service';
import { agruparTipos } from '../onboarding/paso-deporte.component';
import {
  DISTANCIA_MAX,
  DURACION_MAX,
  DURACION_MIN,
  NOTAS_MAX,
  RPE_MAX,
  RPE_MIN,
  aEntrenamientoRequest,
  crearFormularioEntrenamiento,
  esFutura,
  valorInicial,
} from './entrenamiento-form';

export interface EntrenamientoFormData {
  /** Entrenamiento que se edita; sin él, se crea uno. */
  entrenamiento?: EntrenamientoResponse | null;
  /** Día ("AAAA-MM-DD") para uno nuevo; por defecto, ahora. */
  fecha?: string | null;
}

/**
 * Abre el formulario en un diálogo md (bottom sheet en móvil). Se cierra con el entrenamiento
 * guardado, o sin valor si se cancela.
 */
export function abrirEntrenamientoForm(dialogos: NsDialogService, data: EntrenamientoFormData = {}) {
  return dialogos.open<EntrenamientoFormComponent, EntrenamientoResponse, EntrenamientoFormData>(
    EntrenamientoFormComponent,
    { titulo: data.entrenamiento ? 'Editar entrenamiento' : 'Nuevo entrenamiento', size: 'md', data },
  );
}

/**
 * Crear o editar un entrenamiento (NutriSport_API.md §6 Actividad y §8 EntrenamientoRequest): tipo
 * de actividad agrupado por categoría, estado (Realizado no se puede elegir con una fecha futura),
 * fecha y hora local (se envía en ISO con la zona), duración, intensidad, RPE (solo si está
 * realizado), distancia y notas. Si el servidor responde 422 PERFIL_REQUERIDO, se cierra y lleva a
 * /bienvenida.
 */
@Component({
  selector: 'app-entrenamiento-form',
  imports: [
    DialogShellComponent,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsQuantityInputComponent,
    NsSegmentedComponent,
    NsSelectComponent,
    ReactiveFormsModule,
  ],
  template: `
    <ns-dialog-shell>
      <form class="ns-ef" [id]="idFormulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        @if (error(); as error) {
          <ns-alert type="error">{{ error }}</ns-alert>
        }

        @if (errorTipos()) {
          <ns-alert type="error" titulo="No hemos podido cargar las actividades">
            <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="cargarTipos()">
              Reintentar
            </button>
          </ns-alert>
        }
        <ns-form-field label="Actividad" obligatorio>
          <ns-select
            formControlName="tipoActividadCodigo"
            [opciones]="opcionesTipo()"
            [placeholder]="cargandoTipos() ? 'Cargando actividades…' : 'Elige una actividad'"
          />
        </ns-form-field>

        <div class="ns-ef__fila">
          <ns-form-field label="Fecha y hora" obligatorio>
            <input nsInput type="datetime-local" formControlName="fechaHora" />
          </ns-form-field>
          <ns-form-field
            label="Estado"
            [hint]="futura() ? 'Es una fecha futura: solo puede estar planificado.' : undefined"
          >
            <ns-segmented formControlName="estado" [opciones]="opcionesEstado()" />
          </ns-form-field>
        </div>
        @if (form.hasError('realizadoFuturo')) {
          <p class="ns-ef__error" role="alert">Un entrenamiento futuro no puede estar realizado.</p>
        }

        <div class="ns-ef__fila">
          <ns-form-field
            label="Duración"
            [hint]="'Entre ' + duracionMin + ' y ' + duracionMax + ' minutos.'"
            obligatorio
          >
            <ns-quantity-input
              formControlName="duracionMin"
              [min]="duracionMin"
              [max]="duracionMax"
              [step]="5"
              unit="min"
            />
          </ns-form-field>
          <ns-form-field label="Intensidad" obligatorio>
            <ns-segmented formControlName="intensidad" [opciones]="intensidades" />
          </ns-form-field>
        </div>

        @if (realizado()) {
          <div class="ns-ef__rpe">
            <div class="ns-ef__rpe-cabecera">
              <label class="ns-ef__etiqueta" [for]="idRpe">Esfuerzo percibido (RPE)</label>
              <output class="ns-ef__rpe-valor ns-tnum" [for]="idRpe" aria-live="polite">
                {{ rpe() === null ? 'Sin indicar' : rpe() + ' de 10' }}
              </output>
            </div>
            <input
              class="ns-ef__range"
              type="range"
              formControlName="rpe"
              [id]="idRpe"
              [min]="rpeMin"
              [max]="rpeMax"
              step="1"
              [class.ns-ef__range--vacio]="rpe() === null"
              [attr.aria-valuetext]="rpe() === null ? 'Sin indicar' : rpe() + ' de 10'"
              [attr.aria-describedby]="idRpe + '-ayuda'"
            />
            <div class="ns-ef__rpe-pie">
              <span [id]="idRpe + '-ayuda'">1 muy suave · 10 máximo esfuerzo. Opcional.</span>
              @if (rpe() !== null) {
                <button type="button" class="ns-ef__quitar" (click)="quitarRpe()">Quitar</button>
              }
            </div>
          </div>
        }

        <ns-form-field label="Distancia" hint="Opcional.">
          <ns-quantity-input
            formControlName="distanciaKm"
            [min]="0"
            [max]="distanciaMax"
            [decimales]="2"
            [step]="0.5"
            unit="km"
          />
        </ns-form-field>

        <ns-form-field label="Notas" [hint]="'Opcional. ' + notas().length + '/' + notasMax + ' caracteres.'">
          <textarea nsInput formControlName="notas" rows="3" [attr.maxlength]="notasMax"></textarea>
        </ns-form-field>
      </form>

      <button nsDialogAcciones nsButton type="button" variant="secondary" [disabled]="enviando()" (click)="ref.close()">
        Cancelar
      </button>
      <button nsDialogAcciones nsButton type="submit" [attr.form]="idFormulario" [loading]="enviando()">Guardar</button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-ef {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-ef__fila {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--ns-space-4);
    }
    .ns-ef__error {
      margin: calc(-1 * var(--ns-space-2)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
    .ns-ef__rpe {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
    }
    .ns-ef__rpe-cabecera,
    .ns-ef__rpe-pie {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--ns-space-3);
    }
    .ns-ef__etiqueta {
      font: 500 0.8125rem/1.125rem var(--ns-font-body);
    }
    .ns-ef__rpe-valor {
      font-weight: 600;
    }
    .ns-ef__rpe-pie {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
    }
    .ns-ef__range {
      width: 100%;
      min-height: 44px;
      margin: 0;
      accent-color: var(--ns-green-600);
      cursor: pointer;
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
    // Sin valor: el control se ve atenuado hasta que se mueve.
    .ns-ef__range--vacio {
      opacity: 0.5;
    }
    .ns-ef__quitar {
      padding: 0;
      border: 0;
      background: none;
      color: var(--ns-text-secondary);
      font: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrenamientoFormComponent {
  protected readonly ref = inject<DialogRef<EntrenamientoResponse>>(DialogRef);
  private readonly data = inject<EntrenamientoFormData | null>(DIALOG_DATA, { optional: true }) ?? {};
  private readonly entrenamientos = inject(EntrenamientosService);
  private readonly tiposActividad = inject(TiposActividadService);
  private readonly router = inject(Router);

  protected readonly idFormulario = idUnico('ns-entrenamiento-form');
  protected readonly idRpe = idUnico('ns-rpe');
  protected readonly duracionMin = DURACION_MIN;
  protected readonly duracionMax = DURACION_MAX;
  protected readonly distanciaMax = DISTANCIA_MAX;
  protected readonly notasMax = NOTAS_MAX;
  protected readonly rpeMin = RPE_MIN;
  protected readonly rpeMax = RPE_MAX;

  protected readonly form = crearFormularioEntrenamiento(valorInicial(this.data.entrenamiento, this.data.fecha));
  private readonly valor = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly futura = computed(() => esFutura(this.valor().fechaHora));
  protected readonly realizado = computed(() => this.valor().estado === 'REALIZADO');
  protected readonly rpe = computed(() => this.valor().rpe);
  protected readonly notas = computed(() => this.valor().notas);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly tipos = signal<TipoActividadResponse[]>([]);
  protected readonly cargandoTipos = signal(true);
  protected readonly errorTipos = signal(false);

  /** Actividades agrupadas por categoría; si la del entrenamiento ya no está en el catálogo, se añade. */
  protected readonly opcionesTipo = computed<NsOpcion<string>[]>(() => {
    const opciones = agruparTipos(this.tipos()).flatMap((g) =>
      g.tipos.map((t) => ({ valor: t.codigo, etiqueta: t.nombre, grupo: g.categoria })),
    );
    const e = this.data.entrenamiento;
    if (e && !opciones.some((o) => o.valor === e.tipoActividadCodigo)) {
      opciones.push({ valor: e.tipoActividadCodigo, etiqueta: e.tipoActividadNombre, grupo: 'Otros' });
    }
    return opciones;
  });

  /** Planificado y Realizado (este, no con fecha futura). Omitido solo si ya lo estaba. */
  protected readonly opcionesEstado = computed<NsOpcion<EstadoEntrenamiento>[]>(() => {
    const estados: EstadoEntrenamiento[] =
      this.data.entrenamiento?.estado === 'OMITIDO'
        ? ['PLANIFICADO', 'REALIZADO', 'OMITIDO']
        : ['PLANIFICADO', 'REALIZADO'];
    return estados.map((valor) => ({
      valor,
      etiqueta: ETIQUETAS_ESTADO_ENTRENAMIENTO[valor],
      deshabilitada: valor === 'REALIZADO' && this.futura(),
    }));
  });

  protected readonly intensidades: NsOpcion<Intensidad>[] = (['BAJA', 'MEDIA', 'ALTA'] as const).map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_INTENSIDAD[valor],
  }));

  constructor() {
    this.cargarTipos();
    // Al pasar a una fecha futura, un entrenamiento realizado pasa a planificado.
    this.form.controls.fechaHora.valueChanges
      .pipe(startWith(this.form.controls.fechaHora.value), takeUntilDestroyed())
      .subscribe((fechaHora) => {
        if (esFutura(fechaHora) && this.form.controls.estado.value === 'REALIZADO') {
          this.form.controls.estado.setValue('PLANIFICADO');
        }
      });
  }

  protected cargarTipos(): void {
    this.cargandoTipos.set(true);
    this.errorTipos.set(false);
    this.tiposActividad.listar().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        this.cargandoTipos.set(false);
      },
      error: () => {
        this.errorTipos.set(true);
        this.cargandoTipos.set(false);
      },
    });
  }

  protected quitarRpe(): void {
    this.form.controls.rpe.setValue(null);
    this.form.controls.rpe.markAsDirty();
  }

  protected guardar(): void {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const peticion = aEntrenamientoRequest(this.form.getRawValue());
    const existente = this.data.entrenamiento;
    this.enviando.set(true);
    this.error.set(null);
    (existente ? this.entrenamientos.editar(existente.id, peticion) : this.entrenamientos.crear(peticion)).subscribe({
      next: (guardado) => this.ref.close(guardado),
      error: (e: unknown) => {
        const error = aApiError(e);
        this.enviando.set(false);
        if (error.codigo === 'PERFIL_REQUERIDO') {
          // Sin perfil no se puede calcular el gasto: a completar el perfil.
          this.ref.close();
          void this.router.navigate(['/bienvenida']);
        } else if (error.status === 400 && aplicarErroresServidor(this.form, error)) {
          this.error.set('Revisa los campos marcados.');
        } else {
          this.error.set(error.detalle);
        }
      },
    });
  }
}
