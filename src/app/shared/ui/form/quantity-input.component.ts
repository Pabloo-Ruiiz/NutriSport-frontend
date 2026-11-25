import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  computed,
  forwardRef,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { EstadoControl, NsControlCampo, idUnico } from './control-campo';
import { NsControlValor } from './control-valor';

/**
 * Lee un número escrito en español: "1,5", "1.250", "1.250,5". También acepta el punto decimal
 * ("1.5") si no parece un separador de miles. null si no es un número.
 */
export function leerNumero(texto: string): number | null {
  let limpio = texto.trim().replace(/\s/g, '');
  if (!limpio) return null;
  if (limpio.includes(',')) {
    limpio = limpio.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpio)) {
    // "1.250" o "12.500.000": puntos de miles.
    limpio = limpio.replace(/\./g, '');
  }
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(limpio)) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

/** "1,5", "150": sin separador de miles (se edita mejor) y sin ceros finales. */
export function escribirNumero(valor: number | null, decimales: number): string {
  if (valor === null || !Number.isFinite(valor)) return '';
  return String(Number(valor.toFixed(decimales))).replace('.', ',');
}

/**
 * Cantidad con botones − y + (DESIGN.md §5.2, ns-quantity-input): 150 g, 0,5 raciones, 45 min.
 *
 *   <ns-form-field label="Cantidad">
 *     <ns-quantity-input formControlName="gramos" [min]="0" [max]="2000" [step]="5" unit="g" />
 *   </ns-form-field>
 *
 * - El campo es de texto con inputmode="decimal" para admitir la coma decimal en todos los
 *   navegadores; tiene role="spinbutton" y responde a ↑ / ↓.
 * - Mientras se escribe, el valor se envía al formulario en cuanto es un número; al salir del
 *   campo se ajusta a min/max, se redondea a `decimales` y se reescribe con coma.
 * - Botones de 44 × 44 px; se deshabilitan al llegar a min o max.
 */
@Component({
  selector: 'ns-quantity-input',
  imports: [LucideDynamicIcon],
  template: `
    <button
      type="button"
      class="ns-quantity__boton"
      [disabled]="deshabilitado() || enMinimo()"
      [attr.aria-label]="'Restar ' + pasoTexto()"
      [attr.aria-controls]="idControl()"
      (click)="sumar(-1)"
    >
      <svg lucideIcon="minus" [size]="18" aria-hidden="true"></svg>
    </button>
    <span class="ns-quantity__caja" [class.ns-quantity__caja--error]="conError()">
      <input
        class="ns-quantity__input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        role="spinbutton"
        [id]="idControl()"
        [value]="texto()"
        [disabled]="deshabilitado()"
        [attr.aria-valuenow]="valor()"
        [attr.aria-valuemin]="min()"
        [attr.aria-valuemax]="max()"
        [attr.aria-valuetext]="valorTexto()"
        [attr.aria-invalid]="conError() || null"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-label]="idEtiqueta() ? null : etiqueta()"
        (input)="alEscribir($event)"
        (keydown)="alTeclear($event)"
        (focus)="enfocado.set(true)"
        (blur)="alSalir()"
      />
      @if (unit()) {
        <span class="ns-quantity__unidad" aria-hidden="true">{{ unit() }}</span>
      }
    </span>
    <button
      type="button"
      class="ns-quantity__boton"
      [disabled]="deshabilitado() || enMaximo()"
      [attr.aria-label]="'Sumar ' + pasoTexto()"
      [attr.aria-controls]="idControl()"
      (click)="sumar(1)"
    >
      <svg lucideIcon="plus" [size]="18" aria-hidden="true"></svg>
    </button>
  `,
  styleUrl: './quantity-input.component.scss',
  providers: [{ provide: NsControlCampo, useExisting: forwardRef(() => NsQuantityInputComponent) }],
  host: { class: 'ns-quantity' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsQuantityInputComponent extends NsControlValor<number> implements DoCheck {
  readonly min = input<number | undefined, unknown>(undefined, { transform: numeroOpcional });
  readonly max = input<number | undefined, unknown>(undefined, { transform: numeroOpcional });
  readonly step = input(1, { transform: numberAttribute });
  readonly unit = input('');
  readonly decimales = input(0, { transform: numberAttribute });
  /** Nombre accesible si no está dentro de ns-form-field. */
  readonly etiqueta = input('Cantidad');
  readonly id = input<string>();

  readonly etiquetable = true;
  private readonly idGenerado = idUnico('ns-quantity');
  readonly idControl = computed(() => this.id() || this.idGenerado);

  /** Lo que se ve en el campo; mientras se escribe no se reformatea. */
  protected readonly texto = signal('');
  protected readonly enfocado = signal(false);

  protected readonly enMinimo = computed(() => this.min() !== undefined && (this.valor() ?? -Infinity) <= this.min()!);
  protected readonly enMaximo = computed(() => this.max() !== undefined && (this.valor() ?? -Infinity) >= this.max()!);
  protected readonly pasoTexto = computed(() => this.conUnidad(this.step()));
  protected readonly valorTexto = computed(() => (this.valor() === null ? null : this.conUnidad(this.valor()!)));

  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly estado = new EstadoControl();
  protected readonly conError = this.estado.mostrarError;

  constructor() {
    super();
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngDoCheck(): void {
    this.estado.sincronizar(this.ngControl?.control);
  }

  override writeValue(valor: number | null): void {
    super.writeValue(typeof valor === 'number' && Number.isFinite(valor) ? valor : null);
    if (!this.enfocado()) this.texto.set(escribirNumero(this.valor(), this.decimales()));
  }

  protected alEscribir(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.texto.set(texto);
    const numero = leerNumero(texto);
    if (texto.trim() === '') this.emitir(null);
    else if (numero !== null) this.emitir(numero);
  }

  protected alSalir(): void {
    this.enfocado.set(false);
    const numero = leerNumero(this.texto());
    const final = numero === null ? (this.texto().trim() ? this.valor() : null) : this.ajustar(numero);
    if (final !== this.valor()) this.emitir(final);
    this.texto.set(escribirNumero(final, this.decimales()));
    this.tocar();
  }

  protected alTeclear(evento: KeyboardEvent): void {
    const direccion = { ArrowUp: 1, ArrowDown: -1 }[evento.key];
    if (direccion) {
      evento.preventDefault();
      this.sumar(direccion as 1 | -1);
    }
  }

  protected sumar(direccion: 1 | -1): void {
    if (this.deshabilitado()) return;
    const base = this.valor() ?? this.min() ?? 0;
    const siguiente = this.ajustar(base + direccion * this.step());
    this.emitir(siguiente);
    this.texto.set(escribirNumero(siguiente, this.decimales()));
  }

  /** Ajusta a [min, max] y redondea a los decimales indicados. */
  private ajustar(valor: number): number {
    let ajustado = valor;
    if (this.min() !== undefined) ajustado = Math.max(this.min()!, ajustado);
    if (this.max() !== undefined) ajustado = Math.min(this.max()!, ajustado);
    return Number(ajustado.toFixed(this.decimales()));
  }

  private conUnidad(valor: number): string {
    const numero = escribirNumero(valor, Math.max(this.decimales(), 2));
    return this.unit() ? `${numero} ${this.unit()}` : numero;
  }
}

function numeroOpcional(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}
