import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

/**
 * Estado vacío o de error de página (DESIGN.md §5.15): icono de 24 px en un círculo de 48 px,
 * título h4, descripción body-sm (máx. 2 líneas) y acciones proyectadas.
 *
 *   <ns-empty-state icon="utensils" titulo="Aún no has registrado comidas hoy"
 *                   descripcion="Añade lo que has comido para ver tu progreso.">
 *     <button nsButton icon="plus">Registrar comida</button>
 *   </ns-empty-state>
 *
 * El título es un encabezado; su nivel (por defecto 2) se ajusta a la página con `nivelTitulo`.
 */
@Component({
  selector: 'ns-empty-state',
  imports: [LucideDynamicIcon],
  template: `
    <span class="ns-empty-state__circulo" aria-hidden="true">
      <svg [lucideIcon]="icon()" [size]="24"></svg>
    </span>
    <p class="ns-empty-state__titulo ns-text-h4" role="heading" [attr.aria-level]="nivelTitulo()">{{ titulo() }}</p>
    @if (descripcion()) {
      <p class="ns-empty-state__descripcion ns-text-body-sm">{{ descripcion() }}</p>
    }
    <div class="ns-empty-state__acciones"><ng-content /></div>
  `,
  styleUrl: './empty-state.component.scss',
  host: { class: 'ns-empty-state' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsEmptyStateComponent {
  /** Nombre de un icono de Lucide registrado en shared/design/iconos.ts. */
  readonly icon = input('info');
  readonly titulo = input.required<string>();
  readonly descripcion = input<string>();
  readonly nivelTitulo = input(2, { transform: numberAttribute });
}
