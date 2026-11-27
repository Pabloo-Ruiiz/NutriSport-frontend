import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { RecetaResponse, RegistroComidaResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import { ComidasService } from '@core/services/comidas.service';
import { aApiError } from '@core/util/api-error';
import { aHoraApi, hoyLocal, sumarDias } from '@core/util/fechas';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsCalcStatusComponent } from '@shared/ui/data/calc-status.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { tipoPorHora } from '../registro/comida-editor.store';

/** Lo que el diálogo necesita de la receta (vale un RecetaResponse). */
export type RecetaARegistrar = Pick<
  RecetaResponse,
  'id' | 'nombre' | 'nutricionRacion' | 'estadoNutricional' | 'racionesSupuestas'
>;

export interface RegistrarRecetaData {
  receta: RecetaARegistrar;
  /** Valores iniciales (por defecto: hoy y el tipo sugerido por la hora). */
  fecha?: string | null;
  tipoComida?: TipoComida | null;
}

/** Raciones: más de 0 y como mucho 10, con decimales. */
export const RACIONES_COMIDA_MAX = 10;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** true si las raciones son válidas para POST /comidas/desde-receta. */
export function racionesValidas(raciones: number | null | undefined): raciones is number {
  return typeof raciones === 'number' && Number.isFinite(raciones) && raciones > 0 && raciones <= RACIONES_COMIDA_MAX;
}

/**
 * Registrar una receta como comida (NutriSport_API.md §6 Comidas): raciones (decimales, > 0 y
 * ≤ 10), fecha (como mucho mañana) y tipo de comida (sugerido por la hora) → POST
 * /comidas/desde-receta. Al guardar, toast "Comida guardada · 683 kcal" con "Deshacer"; si la
 * respuesta trae avisos (restricciones), se muestran aquí antes de cerrar. Un 422
 * NUTRICION_INCOMPLETA se explica dentro del diálogo.
 *
 * Se cierra con la comida creada, o sin valor si se cancela.
 *
 *   this.dialogos.open<RegistrarRecetaDialogComponent, RegistroComidaResponse, RegistrarRecetaData>(
 *     RegistrarRecetaDialogComponent, { titulo: 'Registrar como comida', size: 'sm', data: { receta } });
 */
@Component({
  selector: 'app-registrar-receta-dialog',
  imports: [
    DialogShellComponent,
    FormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsCalcStatusComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsQuantityInputComponent,
    NsSelectComponent,
  ],
  template: `
    <ns-dialog-shell>
      @if (guardada(); as comida) {
        <ns-alert type="warning" titulo="Comida guardada, con avisos">
          <ul class="avisos">
            @for (aviso of comida.avisos; track aviso) {
              <li>{{ aviso }}</li>
            }
          </ul>
        </ns-alert>
      } @else {
        <form id="ns-registrar-receta-form" class="formulario" (ngSubmit)="guardar()" novalidate>
          <div class="receta">
            <span class="receta__nombre">{{ receta.nombre }}</span>
            <ns-calc-status [estado]="receta.estadoNutricional" />
          </div>

          <ns-form-field label="Raciones" obligatorio [hint]="pistaRaciones()">
            <ns-quantity-input
              name="raciones"
              etiqueta="Raciones"
              [min]="0.25"
              [max]="maxRaciones"
              [step]="0.5"
              [decimales]="2"
              [ngModel]="raciones()"
              (ngModelChange)="cambiarRaciones($event)"
            />
          </ns-form-field>
          <p class="error" id="ns-registrar-error-raciones" [hidden]="!errorRaciones()">{{ errorRaciones() }}</p>

          <ns-form-field label="Fecha" obligatorio>
            <input
              nsInput
              type="date"
              name="fecha"
              [max]="fechaMaxima"
              [ngModel]="fecha()"
              (ngModelChange)="cambiarFecha($event)"
              [invalido]="!!errorFecha()"
              descritoPor="ns-registrar-error-fecha"
            />
          </ns-form-field>
          <p class="error" id="ns-registrar-error-fecha" [hidden]="!errorFecha()">{{ errorFecha() }}</p>

          <ns-form-field label="Tipo de comida" obligatorio [hint]="tipoTocado() ? undefined : 'Sugerido por la hora'">
            <ns-select
              name="tipoComida"
              [opciones]="tipos"
              [ngModel]="tipoComida()"
              (ngModelChange)="cambiarTipo($event)"
            />
          </ns-form-field>

          @if (incompleta()) {
            <ns-alert type="error" titulo="No se puede registrar esta receta">
              Su cálculo nutricional está incompleto: faltan datos de algunos ingredientes.
            </ns-alert>
          } @else if (error(); as error) {
            <ns-alert type="error">{{ error }}</ns-alert>
          }
        </form>
      }

      <!-- Pie: cada botón en su propio bloque para que se proyecte en la ranura de acciones. -->
      @if (guardada(); as comida) {
        <button nsDialogAcciones nsButton type="button" (click)="ref.close(comida)">Entendido</button>
      }
      @if (!guardada()) {
        <button
          nsDialogAcciones
          nsButton
          type="button"
          variant="secondary"
          [disabled]="guardando()"
          (click)="ref.close()"
        >
          Cancelar
        </button>
      }
      @if (!guardada()) {
        <button
          nsDialogAcciones
          nsButton
          type="submit"
          form="ns-registrar-receta-form"
          icon="plus"
          [loading]="guardando()"
          [disabled]="incompleta()"
        >
          Registrar
        </button>
      }
    </ns-dialog-shell>
  `,
  styles: `
    .formulario {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .receta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--ns-space-2);
      padding: var(--ns-space-3);
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface-muted);
    }
    .receta__nombre {
      font-weight: 600;
    }
    .error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
    .avisos {
      margin: 0;
      padding-inline-start: var(--ns-space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarRecetaDialogComponent {
  protected readonly ref = inject<DialogRef<RegistroComidaResponse>>(DialogRef);
  private readonly data = inject<RegistrarRecetaData>(DIALOG_DATA);
  private readonly comidas = inject(ComidasService);
  private readonly toasts = inject(NsToastService);

  protected readonly receta = this.data.receta;
  protected readonly maxRaciones = RACIONES_COMIDA_MAX;
  protected readonly fechaMaxima = sumarDias(hoyLocal(), 1);
  protected readonly tipos: NsOpcion<TipoComida>[] = ORDEN_TIPOS_COMIDA.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_TIPO_COMIDA[valor],
  }));

  protected readonly raciones = signal<number | null>(1);
  protected readonly fecha = signal(
    this.data.fecha && FECHA.test(this.data.fecha) && this.data.fecha <= this.fechaMaxima
      ? this.data.fecha
      : hoyLocal(),
  );
  protected readonly tipoComida = signal<TipoComida>(this.data.tipoComida ?? tipoPorHora(aHoraApi(new Date())));
  protected readonly tipoTocado = signal(!!this.data.tipoComida);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorRaciones = signal<string | null>(null);
  protected readonly errorFecha = signal<string | null>(null);
  /** La receta no tiene cálculo suficiente (lo dice la receta o el 422 del backend). */
  protected readonly incompleta = signal(this.data.receta.estadoNutricional === 'INCOMPLETO');
  protected readonly guardada = signal<RegistroComidaResponse | null>(null);

  /** "≈ 683 kcal" para las raciones elegidas, si la receta tiene cifras. */
  protected readonly pistaRaciones = computed(() => {
    const n = this.receta.nutricionRacion;
    const raciones = this.raciones();
    if (!n || !racionesValidas(raciones) || this.incompleta()) return 'Admite decimales: 0,5 es media ración.';
    const aprox = this.receta.estadoNutricional === 'APROXIMADO' ? '≈ ' : '';
    return `${aprox}${formatearNumero(n.kcal * raciones)} kcal · admite decimales (0,5 es media ración)`;
  });

  protected cambiarRaciones(raciones: number | null): void {
    this.raciones.set(raciones);
    this.errorRaciones.set(null);
  }

  protected cambiarFecha(fecha: string): void {
    this.fecha.set(fecha);
    this.errorFecha.set(null);
  }

  protected cambiarTipo(tipo: TipoComida): void {
    this.tipoComida.set(tipo);
    this.tipoTocado.set(true);
  }

  protected guardar(): void {
    if (this.guardando() || this.incompleta()) return;
    this.error.set(null);
    const raciones = this.raciones();
    const fecha = this.fecha();
    let valido = true;
    if (!racionesValidas(raciones)) {
      this.errorRaciones.set(`Indica más de 0 y como mucho ${RACIONES_COMIDA_MAX} raciones.`);
      valido = false;
    }
    if (!FECHA.test(fecha)) {
      this.errorFecha.set('Indica la fecha.');
      valido = false;
    } else if (fecha > this.fechaMaxima) {
      this.errorFecha.set('La fecha puede ser como mucho mañana.');
      valido = false;
    }
    if (!valido || !racionesValidas(raciones)) return;

    this.guardando.set(true);
    this.comidas
      .registrarReceta({ recetaId: this.receta.id, raciones, fecha, tipoComida: this.tipoComida() })
      .subscribe({
        next: (comida) => {
          this.guardando.set(false);
          this.avisar(comida);
          if (comida.avisos.length) this.guardada.set(comida);
          else this.ref.close(comida);
        },
        error: (e: unknown) => {
          this.guardando.set(false);
          const error = aApiError(e);
          if (error.esCodigo('NUTRICION_INCOMPLETA')) {
            this.incompleta.set(true);
            return;
          }
          const deRaciones = error.errores.find((c) => c.campo === 'raciones');
          const deFecha = error.errores.find((c) => c.campo === 'fecha');
          if (deRaciones) this.errorRaciones.set(deRaciones.mensaje);
          if (deFecha) this.errorFecha.set(deFecha.mensaje);
          if (!deRaciones && !deFecha) this.error.set(error.detalle);
        },
      });
  }

  /** Toast con "Deshacer" (borra la comida recién creada). */
  private avisar(comida: RegistroComidaResponse): void {
    this.toasts.exito(`Comida guardada · ${formatearNumero(comida.totales.kcal)} kcal`, undefined, {
      texto: 'Deshacer',
      ejecutar: () =>
        this.comidas.eliminar(comida.id).subscribe({
          next: () => this.toasts.info('Comida eliminada'),
          error: (e: unknown) => this.toasts.error('No hemos podido deshacer', aApiError(e).detalle),
        }),
    });
  }
}
