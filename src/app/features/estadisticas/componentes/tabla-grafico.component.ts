import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { TablaGrafico } from '../opciones-graficos';

/**
 * Alternativa textual de un gráfico (DESIGN.md §5.12): la TablaGrafico como <table> con caption,
 * cabeceras de columna y la primera celda de cada fila como cabecera de fila. Se proyecta dentro de
 * ns-chart, que la deja solo para lectores de pantalla.
 */
@Component({
  selector: 'app-tabla-grafico',
  template: `
    <table>
      <caption>
        {{
          tabla().titulo
        }}
      </caption>
      <thead>
        <tr>
          @for (c of tabla().columnas; track $index) {
            <th scope="col">{{ c }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (fila of tabla().filas; track $index) {
          <tr>
            <th scope="row">{{ fila[0] }}</th>
            @for (celda of fila.slice(1); track $index) {
              <td>{{ celda }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablaGraficoComponent {
  readonly tabla = input.required<TablaGrafico>();
}
