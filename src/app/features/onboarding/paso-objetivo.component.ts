import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { map, startWith, switchMap } from 'rxjs';

import type { ObjetivoDeportivo } from '@core/models';
import { ETIQUETAS_OBJETIVO } from '@core/models/etiquetas';
import { hoyLocal } from '@core/util/fechas';
import { ErrorCampoDirective } from '@shared/ui/form/error-campo.directive';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import type { GrupoObjetivo } from './perfil-form';

/** Una línea que explica cada objetivo. */
export const DESCRIPCION_OBJETIVO: Record<ObjetivoDeportivo, string> = {
  PERDER_GRASA: 'Reduce grasa corporal conservando tu masa muscular y tu rendimiento.',
  MANTENER: 'Conserva tu peso y tu composición corporal con una dieta equilibrada.',
  GANAR_MUSCULO: 'Gana masa muscular con un ligero superávit de energía y más proteína.',
  RENDIMIENTO: 'Come para entrenar con más energía y recuperarte mejor entre sesiones.',
  COMPETICION: 'Planifica tu alimentación para llegar en tu mejor forma a una fecha.',
};

const ICONO_OBJETIVO: Record<ObjetivoDeportivo, string> = {
  PERDER_GRASA: 'flame',
  MANTENER: 'scale',
  GANAR_MUSCULO: 'biceps-flexed',
  RENDIMIENTO: 'gauge',
  COMPETICION: 'trophy',
};

/**
 * Qué cambia en el plan con cada objetivo. Son los valores del cálculo del backend
 * (CalculadoraObjetivos: ajuste de energía y proteína por kg); si cambian allí, hay que cambiarlos aquí.
 */
const CLAVES_OBJETIVO: Record<ObjetivoDeportivo, readonly string[]> = {
  PERDER_GRASA: ['−15 % de energía', '2,0 g proteína/kg'],
  MANTENER: ['Energía de mantenimiento', '1,4 g proteína/kg'],
  GANAR_MUSCULO: ['+10 % de energía', '1,8 g proteína/kg'],
  RENDIMIENTO: ['Energía de mantenimiento', '1,6 g proteína/kg'],
  COMPETICION: ['Con fecha objetivo', '1,6 g proteína/kg'],
};

@Component({
  selector: 'app-paso-objetivo',
  imports: [ReactiveFormsModule, LucideDynamicIcon, ErrorCampoDirective, NsFormFieldComponent, NsInputDirective],
  template: `
    <div class="ns-paso" [formGroup]="grupo()">
      <fieldset class="ns-paso__grupo" #objetivoGrupo>
        <legend class="ns-paso__leyenda">¿Qué quieres conseguir? <span aria-hidden="true">*</span></legend>
        <p class="ns-paso__ayuda">
          Elige uno. Ajustaremos tu energía y tus macros a ese objetivo; podrás cambiarlo cuando quieras.
        </p>
        <div class="ns-objetivos">
          @for (o of objetivos; track o.valor) {
            <label class="ns-objetivo">
              <input
                class="ns-tarjeta__radio"
                type="radio"
                name="objetivo"
                formControlName="objetivo"
                [value]="o.valor"
              />
              <span class="ns-objetivo__cabecera">
                <span class="ns-objetivo__icono" aria-hidden="true">
                  <svg [lucideIcon]="o.icono" [size]="22"></svg>
                </span>
                <span class="ns-objetivo__indicador" aria-hidden="true">
                  <svg lucideIcon="check" [size]="12" [strokeWidth]="3"></svg>
                </span>
              </span>
              <span class="ns-objetivo__titulo">{{ o.etiqueta }}</span>
              <span class="ns-objetivo__descripcion">{{ o.descripcion }}</span>
              <span class="ns-objetivo__claves">
                @for (clave of o.claves; track clave) {
                  <span class="ns-objetivo__clave">{{ clave }}</span>
                }
              </span>
            </label>
          }
        </div>
        <p class="ns-paso__error" [nsErrorCampo]="grupo().controls.objetivo" [nsErrorCampoPara]="objetivoGrupo"></p>
      </fieldset>

      @if (compite()) {
        <div class="ns-objetivo-fecha">
          <svg class="ns-objetivo-fecha__icono" lucideIcon="calendar-check" [size]="20" aria-hidden="true"></svg>
          <ns-form-field
            label="Fecha de la competición"
            hint="Ajustaremos tu plan para llegar a esa fecha."
            obligatorio
          >
            <input nsInput type="date" formControlName="fechaCompeticion" [min]="hoy" />
          </ns-form-field>
        </div>
      }
    </div>
  `,
  styleUrls: ['./pasos.scss', './paso-objetivo.component.scss'],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasoObjetivoComponent {
  readonly grupo = input.required<GrupoObjetivo>();

  protected readonly objetivos = (Object.keys(ETIQUETAS_OBJETIVO) as ObjetivoDeportivo[]).map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_OBJETIVO[valor],
    descripcion: DESCRIPCION_OBJETIVO[valor],
    icono: ICONO_OBJETIVO[valor],
    claves: CLAVES_OBJETIVO[valor],
  }));
  protected readonly hoy = hoyLocal();

  protected readonly compite = toSignal(
    toObservable(this.grupo).pipe(
      switchMap(({ controls }) => controls.objetivo.valueChanges.pipe(startWith(controls.objetivo.value))),
      map((objetivo) => objetivo === 'COMPETICION'),
    ),
    { initialValue: false },
  );
}
