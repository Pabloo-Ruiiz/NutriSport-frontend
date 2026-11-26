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
  PERDER_GRASA: 'Reducir grasa corporal sin perder músculo ni rendimiento.',
  MANTENER: 'Mantener tu peso y tu composición corporal actuales.',
  GANAR_MUSCULO: 'Aumentar masa muscular con un ligero superávit de energía.',
  RENDIMIENTO: 'Comer para entrenar mejor y recuperarte antes.',
  COMPETICION: 'Llegar en tu mejor forma a una fecha concreta.',
};

const ICONO_OBJETIVO: Record<ObjetivoDeportivo, string> = {
  PERDER_GRASA: 'scale',
  MANTENER: 'shield-check',
  GANAR_MUSCULO: 'dumbbell',
  RENDIMIENTO: 'zap',
  COMPETICION: 'star',
};

/** Paso 3 · Tu objetivo: 5 tarjetas grandes; con COMPETICION, la fecha de la competición. */
@Component({
  selector: 'app-paso-objetivo',
  imports: [ReactiveFormsModule, LucideDynamicIcon, ErrorCampoDirective, NsFormFieldComponent, NsInputDirective],
  template: `
    <div class="ns-paso" [formGroup]="grupo()">
      <fieldset class="ns-paso__grupo" #objetivoGrupo>
        <legend class="ns-paso__leyenda">¿Qué quieres conseguir? <span aria-hidden="true">*</span></legend>
        <div class="ns-tarjetas ns-tarjetas--grandes">
          @for (o of objetivos; track o.valor) {
            <label class="ns-tarjeta">
              <input
                class="ns-tarjeta__radio"
                type="radio"
                name="objetivo"
                formControlName="objetivo"
                [value]="o.valor"
              />
              <svg class="ns-tarjeta__icono" [lucideIcon]="o.icono" [size]="24" aria-hidden="true"></svg>
              <span class="ns-tarjeta__textos">
                <span class="ns-tarjeta__titulo">{{ o.etiqueta }}</span>
                <span class="ns-tarjeta__descripcion">{{ o.descripcion }}</span>
              </span>
              <svg class="ns-tarjeta__check" lucideIcon="circle-check" [size]="20" aria-hidden="true"></svg>
            </label>
          }
        </div>
        <p class="ns-paso__error" [nsErrorCampo]="grupo().controls.objetivo" [nsErrorCampoPara]="objetivoGrupo"></p>
      </fieldset>

      @if (compite()) {
        <ns-form-field label="Fecha de la competición" hint="Ajustaremos tu plan para llegar a esa fecha." obligatorio>
          <input nsInput type="date" formControlName="fechaCompeticion" [min]="hoy" />
        </ns-form-field>
      }
    </div>
  `,
  styleUrl: './pasos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasoObjetivoComponent {
  readonly grupo = input.required<GrupoObjetivo>();

  protected readonly objetivos = (Object.keys(ETIQUETAS_OBJETIVO) as ObjetivoDeportivo[]).map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_OBJETIVO[valor],
    descripcion: DESCRIPCION_OBJETIVO[valor],
    icono: ICONO_OBJETIVO[valor],
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
