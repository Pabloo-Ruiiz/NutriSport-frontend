import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { ProductoResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { ComidasService } from '@core/services/comidas.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor } from '@core/util/formularios';
import { hoyLocal, sumarDias, aHoraApi } from '@core/util/fechas';
import { tipoPorHora } from '@features/comidas/registro/comida-editor.store';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
@Component({
  selector: 'app-anadir-a-comida',
  imports: [ReactiveFormsModule, NsButtonComponent, NsInputDirective, NsAlertComponent],
  templateUrl: './anadir-a-comida.component.html',
  styleUrl: './anadir-a-comida.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnadirAComidaComponent {
  readonly producto = input.required<ProductoResponse>();
  readonly personalizarComida = input(false);
  private readonly comidas = inject(ComidasService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly toast = inject(NsToastService);
  protected readonly tipos = Object.entries(ETIQUETAS_TIPO_COMIDA) as [TipoComida, string][];
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly fechaMaxima = sumarDias(hoyLocal(), 1);
  protected readonly form = new FormGroup({
    cantidad: new FormControl(100, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01), Validators.max(5000)],
    }),
    unidad: new FormControl('base', { nonNullable: true }),
    fecha: new FormControl(this.ruta.snapshot.queryParamMap.get('fecha') || hoyLocal(), {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d{4}-\d{2}-\d{2}$/),
        (control) => (control.value > this.fechaMaxima ? { fechaFutura: true } : null),
      ],
    }),
    tipoComida: new FormControl<TipoComida>(this.tipoInicial(), { nonNullable: true, validators: Validators.required }),
  });
  protected readonly tipoSeleccionado = toSignal(this.form.controls.tipoComida.valueChanges, {
    initialValue: this.form.controls.tipoComida.value,
  });
  protected readonly etiquetasTipo = ETIQUETAS_TIPO_COMIDA;
  private tipoInicial(): TipoComida {
    const tipo = this.ruta.snapshot.queryParamMap.get('tipoComida');
    return tipo && tipo in ETIQUETAS_TIPO_COMIDA ? (tipo as TipoComida) : tipoPorHora(aHoraApi(new Date()));
  }
  protected cambiarUnidad(): void {
    this.form.controls.cantidad.setValue(
      this.form.controls.unidad.value === 'racion' ? (this.producto().racion?.gramos ?? 100) : 100,
    );
  }
  protected async guardar(): Promise<void> {
    if (this.enviando() || !this.producto().nutricionCompleta) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const p = this.producto();
    const v = this.form.getRawValue();
    const cantidad = v.unidad === 'racion' ? p.racion?.gramos : v.cantidad;
    if (!cantidad || cantidad <= 0 || cantidad > 5000) {
      this.error.set('Revisa la cantidad de la ración.');
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    try {
      const comida = await firstValueFrom(
        this.comidas.registrar({
          fecha: v.fecha,
          tipoComida: v.tipoComida,
          alimentos: [
            {
              ...(p.id ? { alimentoId: p.id } : { codigoBarras: p.codigoBarras }),
              cantidad,
              unidad: v.unidad === 'racion' ? 'g' : p.unidadBase === 'ML' ? 'ml' : 'g',
            },
          ],
        }),
      );
      this.toast.exito('Comida registrada');
      for (const aviso of comida.avisos) this.toast.info('Aviso de la comida', aviso);
      await this.router.navigate(['/comidas'], { queryParams: { fecha: v.fecha } });
    } catch (e) {
      const error = aApiError(e);
      aplicarErroresServidor(this.form, error);
      const campo = error.errores.find((e) => e.campo === 'alimentos[0].cantidad');
      if (campo) this.form.controls.cantidad.setErrors({ servidor: campo.mensaje });
      this.error.set(error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}
