import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { Unidades } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor } from '@core/util/formularios';
import { noSoloEspacios } from '@core/util/validadores';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { NsSwitchComponent } from '@shared/ui/form/switch.component';

/**
 * Configuración › Cuenta: nombre, unidades (de momento solo el sistema métrico) e insights →
 * PATCH /cuenta con los campos que cambian.
 */
@Component({
  selector: 'app-cuenta-datos',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSelectComponent,
    NsSwitchComponent,
  ],
  template: `
    <h2 class="ns-text-h3 ns-seccion__titulo">Cuenta</h2>

    <form class="ns-bloque" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      @if (error(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      }
      <div class="ns-bloque__campos">
        <ns-form-field label="Nombre" obligatorio>
          <input nsInput type="text" formControlName="nombre" autocomplete="name" maxlength="80" />
        </ns-form-field>

        <p class="ns-bloque__texto">
          Email: <strong>{{ email() }}</strong> ·
          <a routerLink="../seguridad">Cambiar email</a>
        </p>

        <ns-form-field label="Unidades" hint="Por ahora solo está disponible el sistema métrico (kg, cm, g).">
          <ns-select formControlName="unidades" [opciones]="unidades" />
        </ns-form-field>

        <ns-switch formControlName="insightsActivos">Recibir patrones detectados (insights)</ns-switch>
        <p class="ns-bloque__nota">
          Cada noche analizamos tus últimas 4 semanas y te avisamos de patrones como poca proteína o una tendencia de
          peso contraria a tu objetivo.
        </p>
      </div>
      <div class="ns-bloque__acciones">
        <button nsButton type="submit" [loading]="enviando()" [disabled]="!form.dirty">Guardar cambios</button>
      </div>
    </form>
  `,
  styleUrl: './secciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaDatosComponent {
  private readonly auth = inject(AuthService);
  private readonly cuentas = inject(CuentaService);
  private readonly toasts = inject(NsToastService);

  protected readonly email = () => this.auth.cuenta()?.email ?? '';
  protected readonly unidades: NsOpcion<Unidades>[] = [{ valor: 'METRICO', etiqueta: 'Métrico' }];

  private readonly cuenta = this.auth.cuenta();
  protected readonly form = new FormGroup({
    nombre: new FormControl(this.cuenta?.nombre ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80), noSoloEspacios()],
    }),
    unidades: new FormControl<Unidades>(
      { value: this.cuenta?.unidades ?? 'METRICO', disabled: true },
      { nonNullable: true },
    ),
    insightsActivos: new FormControl(this.cuenta?.insightsActivos ?? true, { nonNullable: true }),
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async guardar(): Promise<void> {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, unidades, insightsActivos } = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    try {
      const cuenta = await firstValueFrom(this.cuentas.actualizar({ nombre, unidades, insightsActivos }));
      this.form.reset({ nombre: cuenta.nombre, unidades: cuenta.unidades, insightsActivos: cuenta.insightsActivos });
      this.toasts.exito('Cambios guardados');
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 400 && aplicarErroresServidor(this.form, error)) return;
      this.error.set(error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}
