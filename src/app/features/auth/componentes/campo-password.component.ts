import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { EstadoControl, NsControlCampo, idUnico } from '@shared/ui/form/control-campo';
import { NsControlValor } from '@shared/ui/form/control-valor';

/**
 * Contraseña con botón mostrar/ocultar (DESIGN.md §7.1 y §7.2). ControlValueAccessor: funciona con
 * formControlName / formControl / ngModel y dentro de ns-form-field (etiqueta, ayuda y error):
 *
 *   <ns-form-field label="Contraseña" obligatorio>
 *     <ns-campo-password formControlName="password" autocomplete="new-password" />
 *   </ns-form-field>
 *
 * El botón es un conmutador: nombre fijo ("Mostrar contraseña") y aria-pressed con el estado. Su
 * icono cambia entre eye y eye-off. El valor no se recorta: los espacios forman parte de la clave.
 */
@Component({
  selector: 'ns-campo-password',
  imports: [LucideDynamicIcon],
  template: `
    <input
      class="ns-campo-password__input"
      [class.ns-campo-password__input--error]="conError()"
      [type]="visible() ? 'text' : 'password'"
      [id]="idControl()"
      [value]="valor() ?? ''"
      [disabled]="deshabilitado()"
      [attr.autocomplete]="autocomplete()"
      [attr.placeholder]="placeholder() || null"
      [attr.aria-label]="idEtiqueta() ? null : etiqueta()"
      [attr.aria-invalid]="conError() || null"
      [attr.aria-describedby]="describedBy()"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      (input)="alEscribir($event)"
      (blur)="tocar()"
    />
    <button
      type="button"
      class="ns-campo-password__boton"
      [attr.aria-label]="etiquetaBoton()"
      [attr.aria-pressed]="visible()"
      [attr.aria-controls]="idControl()"
      [disabled]="deshabilitado()"
      (click)="alternar()"
    >
      <svg [lucideIcon]="visible() ? 'eye-off' : 'eye'" [size]="18" aria-hidden="true"></svg>
    </button>
  `,
  styleUrl: './campo-password.component.scss',
  providers: [{ provide: NsControlCampo, useExisting: forwardRef(() => CampoPasswordComponent) }],
  host: { class: 'ns-campo-password' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampoPasswordComponent extends NsControlValor<string> implements DoCheck {
  /** current-password (login) o new-password (registro, restablecer, cambiar). */
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly placeholder = input<string>();
  /** Nombre accesible si no está dentro de ns-form-field. */
  readonly etiqueta = input('Contraseña');
  /** Nombre del botón; aria-pressed dice si la contraseña se está mostrando. */
  readonly etiquetaBoton = input('Mostrar contraseña');
  readonly id = input<string>();

  readonly etiquetable = true;
  private readonly idGenerado = idUnico('ns-password');
  readonly idControl = computed(() => this.id() || this.idGenerado);

  /** true: la contraseña se ve en claro. */
  readonly visible = signal(false);

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

  override writeValue(valor: string | null): void {
    super.writeValue(typeof valor === 'string' ? valor : null);
  }

  protected alEscribir(evento: Event): void {
    this.emitir((evento.target as HTMLInputElement).value);
  }

  protected alternar(): void {
    this.visible.update((visible) => !visible);
  }
}
