import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

export type NsAlertType = 'info' | 'success' | 'warning' | 'error' | 'ai';

const ICONOS: Record<NsAlertType, string> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-exclamation-point',
  error: 'circle-exclamation-point',
  ai: 'sparkles',
};

/**
 * Banner de aviso dentro del contenido (DESIGN.md §5.11 y §5.15): fondo del estado, borde
 * izquierdo de 3 px e icono. Para avisos persistentes: perfil incompleto, IA no disponible,
 * errores recuperables.
 *
 *   <ns-alert type="error" titulo="No hemos podido analizar la foto" dismissible (cerrar)="…">
 *     Puedes reintentarlo o registrar la comida manualmente.
 *     <button nsAlertAcciones nsButton variant="secondary" size="sm">Reintentar</button>
 *   </ns-alert>
 *
 * Solo `error` lleva role="alert" (se anuncia al aparecer). Los demás son contenido normal de la
 * página. El componente no se oculta solo al cerrarlo: quien lo usa decide (p. ej. con @if).
 */
@Component({
  selector: 'ns-alert',
  imports: [LucideDynamicIcon],
  template: `
    <svg class="ns-alert__icono" [lucideIcon]="icono()" [size]="20" aria-hidden="true"></svg>
    <div class="ns-alert__contenido">
      @if (titulo()) {
        <p class="ns-alert__titulo">{{ titulo() }}</p>
      }
      <div class="ns-alert__texto"><ng-content /></div>
      <div class="ns-alert__acciones"><ng-content select="[nsAlertAcciones]" /></div>
    </div>
    @if (dismissible()) {
      <button type="button" class="ns-alert__cerrar" [attr.aria-label]="etiquetaCerrar()" (click)="cerrar.emit()">
        <svg lucideIcon="x" [size]="18" aria-hidden="true"></svg>
      </button>
    }
  `,
  styleUrl: './alert.component.scss',
  host: {
    '[class]': '"ns-alert ns-alert--" + type()',
    '[attr.role]': 'type() === "error" ? "alert" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsAlertComponent {
  readonly type = input<NsAlertType>('info');
  readonly titulo = input<string>();
  /** Muestra el botón de cerrar, que emite `cerrar`. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** Nombre accesible del botón de cerrar. */
  readonly etiquetaCerrar = input('Cerrar aviso');

  readonly cerrar = output<void>();

  protected readonly icono = computed(() => ICONOS[this.type()]);
}
