import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import type { ObjetivosResponse } from '@core/models';
import { PerfilService } from '@core/services/perfil.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor } from '@core/util/formularios';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';

/** kcal por gramo de cada macro. */
const KCAL_G = { proteina: 4, hidratos: 4, grasa: 9 } as const;

/**
 * Objetivos manuales (NutriSport_API.md §6 Perfil, PUT /perfil/objetivos): kcal y gramos de cada
 * macro con los límites de §8. Muestra en vivo cuánta energía suman los macros. Se cierra con el
 * ObjetivosResponse de la respuesta (con sus avisos, que no bloquean) o con undefined al cancelar.
 *
 *   dialogos.open(ObjetivosManualesDialogComponent, { titulo: 'Ajustar objetivos', data: objetivos })
 */
@Component({
  selector: 'app-objetivos-manuales-dialog',
  imports: [
    ReactiveFormsModule,
    DialogShellComponent,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsQuantityInputComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form class="ns-manuales" [id]="idFormulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <p class="ns-manuales__intro">
          Fija tus propios objetivos diarios. Dejarán de recalcularse cuando cambies tu perfil hasta que vuelvas al
          cálculo automático.
        </p>
        @if (error(); as error) {
          <ns-alert type="error">{{ error }}</ns-alert>
        }
        <ns-form-field label="Energía" hint="Entre 1.000 y 6.000 kcal." obligatorio>
          <ns-quantity-input formControlName="kcal" [min]="1000" [max]="6000" [step]="50" unit="kcal" />
        </ns-form-field>
        <ns-form-field label="Proteína" hint="Entre 30 y 400 g." obligatorio>
          <ns-quantity-input formControlName="proteinaG" [min]="30" [max]="400" [step]="5" unit="g" />
        </ns-form-field>
        <ns-form-field label="Hidratos de carbono" hint="Entre 0 y 900 g." obligatorio>
          <ns-quantity-input formControlName="carbohidratosG" [min]="0" [max]="900" [step]="5" unit="g" />
        </ns-form-field>
        <ns-form-field label="Grasa" hint="Entre 20 y 300 g." obligatorio>
          <ns-quantity-input formControlName="grasaG" [min]="20" [max]="300" [step]="5" unit="g" />
        </ns-form-field>
        <p class="ns-manuales__suma" [class.ns-manuales__suma--aviso]="descuadre()" aria-live="polite">
          {{ textoSuma() }}
        </p>
      </form>
      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="ref.close()">Cancelar</button>
      <button nsDialogAcciones nsButton type="submit" [attr.form]="idFormulario" [loading]="enviando()">
        Guardar objetivos
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-manuales {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-manuales__intro,
    .ns-manuales__suma {
      margin: 0;
      color: var(--ns-text-secondary);
    }
    .ns-manuales__suma {
      font-size: 0.8125rem;
    }
    .ns-manuales__suma--aviso {
      color: var(--ns-warning);
      font-weight: 500;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObjetivosManualesDialogComponent {
  protected readonly ref = inject<DialogRef<ObjetivosResponse>>(DialogRef);
  private readonly actuales = inject<ObjetivosResponse | null>(DIALOG_DATA, { optional: true });
  private readonly perfil = inject(PerfilService);

  protected readonly idFormulario = 'ns-objetivos-manuales';

  protected readonly form = new FormGroup({
    kcal: new FormControl<number | null>(this.actuales?.kcal ?? null, [
      Validators.required,
      Validators.min(1000),
      Validators.max(6000),
    ]),
    proteinaG: new FormControl<number | null>(this.actuales?.proteinaG ?? null, [
      Validators.required,
      Validators.min(30),
      Validators.max(400),
    ]),
    carbohidratosG: new FormControl<number | null>(this.actuales?.carbohidratosG ?? null, [
      Validators.required,
      Validators.min(0),
      Validators.max(900),
    ]),
    grasaG: new FormControl<number | null>(this.actuales?.grasaG ?? null, [
      Validators.required,
      Validators.min(20),
      Validators.max(300),
    ]),
  });

  private readonly valor = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly kcalMacros = computed(() => {
    const v = this.valor();
    return (
      (v.proteinaG ?? 0) * KCAL_G.proteina + (v.carbohidratosG ?? 0) * KCAL_G.hidratos + (v.grasaG ?? 0) * KCAL_G.grasa
    );
  });
  /** Los macros se alejan más de un 10 % de las kcal: el servidor avisará (no bloquea). */
  protected readonly descuadre = computed(() => {
    const kcal = this.valor().kcal ?? 0;
    return kcal > 0 && Math.abs(this.kcalMacros() - kcal) / kcal > 0.1;
  });
  protected readonly textoSuma = computed(() => {
    const texto = `Los macros suman ${formatearNumero(this.kcalMacros())} kcal.`;
    return this.descuadre() ? `${texto} Se alejan más de un 10 % de la energía que has fijado.` : texto;
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async guardar(): Promise<void> {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    try {
      const respuesta = await firstValueFrom(
        this.perfil.fijarObjetivosManuales({
          kcal: Number(v.kcal),
          proteinaG: Number(v.proteinaG),
          carbohidratosG: Number(v.carbohidratosG),
          grasaG: Number(v.grasaG),
        }),
      );
      this.ref.close(respuesta);
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 400 && aplicarErroresServidor(this.form, error)) return;
      this.error.set(error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}
