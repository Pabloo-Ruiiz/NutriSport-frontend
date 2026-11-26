import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import type { NsOpcion } from '@shared/ui/form/control-valor';
import { ErrorCampoDirective } from '@shared/ui/form/error-campo.directive';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { SelectorPreferenciasComponent } from '../perfil/componentes/selector-preferencias.component';
import type { GrupoAlimentacion } from './perfil-form';

/** Paso 4 · Alimentación: preferencias y restricciones, comidas por día y tiempo para cocinar. */
@Component({
  selector: 'app-paso-alimentacion',
  imports: [
    ReactiveFormsModule,
    ErrorCampoDirective,
    NsFormFieldComponent,
    NsQuantityInputComponent,
    NsSegmentedComponent,
    SelectorPreferenciasComponent,
  ],
  template: `
    <div class="ns-paso" [formGroup]="grupo()">
      <app-selector-preferencias #preferencias formControlName="preferencias" />
      <p class="ns-paso__error" [nsErrorCampo]="grupo().controls.preferencias" [nsErrorCampoPara]="preferencias"></p>

      <ns-form-field label="Comidas al día" hint="Cuántas veces sueles comer, contando tentempiés." obligatorio>
        <ns-segmented formControlName="comidasPorDia" [opciones]="comidas" />
      </ns-form-field>

      <ns-form-field label="Tiempo máximo para cocinar" hint="Opcional. Lo usaremos para sugerirte recetas.">
        <ns-quantity-input formControlName="tiempoMaxCocinaMin" [min]="0" [max]="600" [step]="5" unit="min" />
      </ns-form-field>
    </div>
  `,
  styleUrl: './pasos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasoAlimentacionComponent {
  readonly grupo = input.required<GrupoAlimentacion>();

  protected readonly comidas: NsOpcion<number>[] = [3, 4, 5, 6].map((n) => ({ valor: n, etiqueta: String(n) }));
}
