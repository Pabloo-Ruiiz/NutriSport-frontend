import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsToast, NsToastService, NsToastTipo } from './toast.service';

const ICONOS: Record<NsToastTipo, string> = {
  success: 'circle-check',
  error: 'circle-exclamation-point',
  warning: 'triangle-exclamation-point',
  info: 'info',
};

/**
 * Pinta los toasts de NsToastService (DESIGN.md §5.11): abajo a la derecha (arriba en móvil),
 * 360 px de ancho, en la capa --ns-z-toast. Va una sola vez en el componente raíz.
 *
 * Hay dos regiones vivas que existen desde el principio (si no, los lectores de pantalla no
 * anuncian lo que se añade): una polite para el resto y una assertive solo para los errores.
 */
@Component({
  selector: 'ns-toast-container',
  imports: [NgTemplateOutlet, LucideDynamicIcon],
  template: `
    <div class="ns-toasts__region" aria-live="assertive" aria-relevant="additions">
      @for (toast of errores(); track toast.id) {
        <ng-container *ngTemplateOutlet="plantilla; context: { $implicit: toast }" />
      }
    </div>
    <div class="ns-toasts__region" aria-live="polite" aria-relevant="additions">
      @for (toast of otros(); track toast.id) {
        <ng-container *ngTemplateOutlet="plantilla; context: { $implicit: toast }" />
      }
    </div>

    <ng-template #plantilla let-toast>
      <div
        [class]="'ns-toast ns-toast--' + toast.tipo"
        (mouseenter)="servicio.pausar(toast.id)"
        (mouseleave)="servicio.reanudar(toast.id)"
        (focusin)="servicio.pausar(toast.id)"
        (focusout)="servicio.reanudar(toast.id)"
      >
        <svg class="ns-toast__icono" [lucideIcon]="icono(toast)" [size]="20" aria-hidden="true"></svg>
        <div class="ns-toast__contenido">
          <p class="ns-toast__titulo">{{ toast.titulo }}</p>
          @if (toast.mensaje) {
            <p class="ns-toast__mensaje">{{ toast.mensaje }}</p>
          }
          @if (toast.accion) {
            <button type="button" class="ns-toast__accion" (click)="servicio.ejecutarAccion(toast)">
              {{ toast.accion.texto }}
            </button>
          }
        </div>
        <button
          type="button"
          class="ns-toast__cerrar"
          aria-label="Cerrar notificación"
          (click)="servicio.cerrar(toast.id)"
        >
          <svg lucideIcon="x" [size]="16" aria-hidden="true"></svg>
        </button>
      </div>
    </ng-template>
  `,
  styleUrl: './toast-container.component.scss',
  host: { class: 'ns-toasts' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  protected readonly servicio = inject(NsToastService);

  protected readonly errores = computed(() => this.servicio.visibles().filter((t) => t.tipo === 'error'));
  protected readonly otros = computed(() => this.servicio.visibles().filter((t) => t.tipo !== 'error'));

  protected icono(toast: NsToast): string {
    return ICONOS[toast.tipo];
  }
}
