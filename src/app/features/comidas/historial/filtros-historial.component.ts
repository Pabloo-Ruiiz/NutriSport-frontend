import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { OrigenComida, TipoComida } from '@core/models';
import { ETIQUETAS_ORIGEN_COMIDA, ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import { MAX_DIAS_HISTORIAL } from '@core/services/comidas.service';
import { diasEntre, hoyLocal, sumarDias } from '@core/util/fechas';
import { idUnico } from '@shared/ui/form/control-campo';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsChipGroupComponent } from '@shared/ui/form/chip-group.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import type { FiltrosHistorial } from './historial-comidas.store';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const ICONOS_ORIGEN: Record<OrigenComida, string> = {
  MANUAL: 'pencil',
  FOTO: 'camera',
  PLAN: 'calendar',
  RECETA: 'library',
  COPIA: 'copy',
  CODIGO_BARRAS: 'scan-barcode',
};

/** Fallo del rango de fechas, o null si es válido. */
export function errorRango(desde: string, hasta: string, maximo: string): string | null {
  if (!FECHA.test(desde) || !FECHA.test(hasta)) return 'Indica las dos fechas.';
  if (desde > hasta) return 'La fecha de inicio debe ser anterior a la de fin.';
  if (hasta > maximo) return 'La fecha de fin puede ser como mucho mañana.';
  if (diasEntre(desde, hasta) + 1 > MAX_DIAS_HISTORIAL) return `Elige como mucho ${MAX_DIAS_HISTORIAL} días.`;
  return null;
}

/**
 * Filtros del historial (DESIGN.md §7.9): rango de fechas (como mucho 92 días), tipo de comida y
 * origen (chips, varios a la vez). Emite `cambio` con los filtros completos cada vez que cambian y
 * son válidos, o null mientras el rango no lo es.
 */
@Component({
  selector: 'app-filtros-historial',
  imports: [FormsModule, NsChipGroupComponent, NsFormFieldComponent, NsInputDirective, NsSelectComponent],
  template: `
    <div class="ns-filtros__fechas">
      <ns-form-field label="Desde">
        <input
          nsInput
          type="date"
          [max]="hasta()"
          [ngModel]="desde()"
          (ngModelChange)="cambiarFechas($event, hasta())"
          [attr.aria-invalid]="error() ? true : null"
          [attr.aria-describedby]="idError"
        />
      </ns-form-field>
      <ns-form-field label="Hasta">
        <input
          nsInput
          type="date"
          [min]="desde()"
          [max]="maximo"
          [ngModel]="hasta()"
          (ngModelChange)="cambiarFechas(desde(), $event)"
          [attr.aria-invalid]="error() ? true : null"
          [attr.aria-describedby]="idError"
        />
      </ns-form-field>
      <ns-form-field label="Tipo de comida">
        <ns-select [opciones]="tipos" [ngModel]="valor().tipo" (ngModelChange)="emitir({ tipo: $event })" />
      </ns-form-field>
    </div>
    <p class="ns-filtros__error" [id]="idError" [hidden]="!error()" role="alert">{{ error() }}</p>

    <ns-form-field label="Origen">
      <ns-chip-group
        [opciones]="origenes"
        multiple
        [ngModel]="valor().origenes"
        (ngModelChange)="emitir({ origenes: $event })"
      />
    </ns-form-field>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-filtros__fechas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--ns-space-3);
    }
    .ns-filtros__error {
      margin: 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosHistorialComponent {
  readonly valor = input.required<FiltrosHistorial>();
  readonly cambio = output<FiltrosHistorial | null>();

  protected readonly maximo = sumarDias(hoyLocal(), 1);
  protected readonly idError = idUnico('ns-filtros-error');

  /** Fechas en edición: pueden no ser válidas todavía. */
  protected readonly desde = linkedSignal(() => this.valor().desde);
  protected readonly hasta = linkedSignal(() => this.valor().hasta);
  /** Se limpia cuando llegan filtros nuevos (p. ej. al restablecer). */
  protected readonly error = linkedSignal<FiltrosHistorial, string | null>({
    source: this.valor,
    computation: () => null,
  });

  protected readonly tipos: NsOpcion<TipoComida | null>[] = [
    { valor: null, etiqueta: 'Todos' },
    ...ORDEN_TIPOS_COMIDA.map((valor) => ({ valor, etiqueta: ETIQUETAS_TIPO_COMIDA[valor] })),
  ];
  protected readonly origenes: NsOpcion<OrigenComida>[] = (Object.keys(ETIQUETAS_ORIGEN_COMIDA) as OrigenComida[]).map(
    (valor) => ({ valor, etiqueta: ETIQUETAS_ORIGEN_COMIDA[valor], icono: ICONOS_ORIGEN[valor] }),
  );

  protected cambiarFechas(desde: string, hasta: string): void {
    this.desde.set(desde);
    this.hasta.set(hasta);
    const error = errorRango(desde, hasta, this.maximo);
    this.error.set(error);
    if (error) this.cambio.emit(null);
    else this.emitir({ desde, hasta });
  }

  protected emitir(cambios: Partial<FiltrosHistorial>): void {
    if (this.error()) {
      this.cambio.emit(null);
      return;
    }
    this.cambio.emit({ ...this.valor(), desde: this.desde(), hasta: this.hasta(), ...cambios });
  }
}
