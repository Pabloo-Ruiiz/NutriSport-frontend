import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import type { Sexo } from '@core/models';
import { ETIQUETAS_SEXO } from '@core/models/etiquetas';
import { aFechaApi } from '@core/util/fechas';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import type { GrupoSobreTi } from './perfil-form';

/** Paso 1 · Sobre ti: fecha de nacimiento, sexo, altura, peso y % de grasa (opcional). */
@Component({
  selector: 'app-paso-sobre-ti',
  imports: [
    ReactiveFormsModule,
    NsFormFieldComponent,
    NsInputDirective,
    NsQuantityInputComponent,
    NsSegmentedComponent,
  ],
  template: `
    <div class="ns-paso" [formGroup]="grupo()">
      <ns-form-field label="Fecha de nacimiento" hint="Tienes que ser mayor de 18 años." obligatorio>
        <input nsInput type="date" formControlName="fechaNacimiento" autocomplete="bday" [max]="fechaMaxima" />
      </ns-form-field>

      <ns-form-field label="Sexo" hint="Lo usamos para estimar tu metabolismo basal." obligatorio>
        <ns-segmented formControlName="sexo" [opciones]="sexos" />
      </ns-form-field>

      <div class="ns-paso__fila">
        <ns-form-field label="Altura" hint="Entre 120 y 230 cm." obligatorio>
          <ns-quantity-input formControlName="alturaCm" [min]="120" [max]="230" unit="cm" />
        </ns-form-field>
        <ns-form-field label="Peso" hint="Entre 30 y 250 kg." obligatorio>
          <ns-quantity-input formControlName="pesoKg" [min]="30" [max]="250" [step]="0.5" [decimales]="1" unit="kg" />
        </ns-form-field>
      </div>

      <ns-form-field
        label="Porcentaje de grasa corporal"
        hint="Opcional, entre 3 y 60 %. Si no lo sabes, déjalo vacío."
      >
        <ns-quantity-input formControlName="porcentajeGrasa" [min]="3" [max]="60" [decimales]="1" unit="%" />
      </ns-form-field>
    </div>
  `,
  styleUrl: './pasos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasoSobreTiComponent {
  readonly grupo = input.required<GrupoSobreTi>();

  protected readonly sexos: NsOpcion<Sexo>[] = (Object.keys(ETIQUETAS_SEXO) as Sexo[]).map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_SEXO[valor],
  }));

  /** Tope del selector de fecha: hoy hace 18 años. Es solo una ayuda; la regla la aplica edadMinima(18). */
  protected readonly fechaMaxima = (() => {
    const hoy = new Date();
    return aFechaApi(new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate()));
  })();
}
