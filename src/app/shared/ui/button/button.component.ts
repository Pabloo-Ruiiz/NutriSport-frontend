import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsSpinnerComponent } from '../feedback/spinner.component';

export type NsButtonVariant = 'primary' | 'ai' | 'secondary' | 'ghost' | 'danger';
export type NsButtonSize = 'sm' | 'md' | 'lg';
export type NsButtonIconPosition = 'start' | 'end';

/**
 * Botón del sistema de diseño (DESIGN.md §5.1, ejemplo de §9.6).
 *
 *   <button nsButton variant="ai" icon="sparkles" [loading]="analizando()">Analizar foto</button>
 *   <a nsButton variant="secondary" routerLink="/comidas">Ver comidas</a>
 *
 * - `loading` sustituye el icono por un spinner, pone aria-busy y deshabilita el botón.
 * - En un <a> no existe `disabled`: se usa aria-disabled, se saca del orden de tabulación y se
 *   cancela el clic.
 * - El `type` del <button> lo decide quien lo usa (type="submit" en formularios, "button" fuera).
 */
@Component({
  selector: 'button[nsButton], a[nsButton]',
  imports: [LucideDynamicIcon, NsSpinnerComponent],
  template: `
    @if (loading()) {
      <ns-spinner class="ns-button__icon" [size]="16" />
    } @else if (icon()) {
      <svg class="ns-button__icon" [lucideIcon]="icon()!" [size]="iconSize()" aria-hidden="true"></svg>
    }
    <span class="ns-button__label"><ng-content /></span>
  `,
  styleUrl: './button.component.scss',
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.disabled]': '!esEnlace && inactivo() ? "" : null',
    '[attr.aria-disabled]': 'esEnlace && inactivo() ? "true" : null',
    '[attr.tabindex]': 'esEnlace && inactivo() ? -1 : null',
    '(click)': 'alPulsar($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsButtonComponent {
  readonly variant = input<NsButtonVariant>('primary');
  readonly size = input<NsButtonSize>('md');
  /** Nombre de un icono de Lucide registrado en shared/design/iconos.ts. */
  readonly icon = input<string>();
  readonly iconPosition = input<NsButtonIconPosition>('start');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(false, { transform: booleanAttribute });

  protected readonly esEnlace = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'A';

  protected readonly inactivo = computed(() => this.loading() || this.disabled());
  protected readonly iconSize = computed(() => (this.size() === 'sm' ? 16 : 18));
  protected readonly classes = computed(() =>
    [
      'ns-button',
      `ns-button--${this.variant()}`,
      `ns-button--${this.size()}`,
      this.iconPosition() === 'end' ? 'ns-button--icon-end' : '',
      this.fullWidth() ? 'ns-button--full' : '',
      this.loading() ? 'ns-button--loading' : '',
      this.esEnlace && this.inactivo() ? 'ns-button--disabled' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  protected alPulsar(evento: Event): void {
    // Un <button disabled> ya no emite clics; un enlace sí, así que se anula aquí.
    if (this.esEnlace && this.inactivo()) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
    }
  }
}
