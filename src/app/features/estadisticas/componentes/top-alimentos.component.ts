import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { AlimentoFrecuenteResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsSourceBadgeComponent, type NsFuenteDato } from '@shared/ui/data/source-badge.component';
import { NsSourcesNoteComponent } from '@shared/ui/data/sources-note.component';
import { NsCeldaDirective } from '@shared/ui/data/table-cell.directive';
import { type NsColumna, NsTableComponent } from '@shared/ui/data/table.component';

/** Los 10 alimentos más consumidos del periodo: veces registrado, % de la energía y fuente. */
@Component({
  selector: 'app-top-alimentos',
  imports: [NS_CARD, NsCeldaDirective, NsSourceBadgeComponent, NsSourcesNoteComponent, NsTableComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Alimentos más consumidos</h3>
      <p nsCardSubtitulo>Por número de registros</p>
      <ns-table
        [columns]="columnas"
        [data]="alimentos()"
        [claveFila]="clave"
        etiqueta="Alimentos más consumidos"
        textoVacio="Sin alimentos registrados en el periodo"
        iconoVacio="utensils"
      >
        <ng-template nsCelda="porcentajeEnergia" [nsCeldaDe]="alimentos()" let-a>
          {{ n(a.porcentajeEnergia, 1) }} %
        </ng-template>
        <ng-template nsCelda="fuente" [nsCeldaDe]="alimentos()" let-a>
          @if (a.fuente) {
            <ns-source-badge [fuente]="fuente(a)" />
          } @else {
            —
          }
        </ng-template>
      </ns-table>
      <ns-sources-note class="atribucion" [fuentes]="fuentes()" />
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .atribucion {
      margin-top: var(--ns-space-3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopAlimentosComponent {
  readonly alimentos = input.required<AlimentoFrecuenteResponse[]>();

  protected readonly n = formatearNumero;
  protected readonly clave = (a: AlimentoFrecuenteResponse) => a.alimentoId;
  protected readonly fuentes = computed(() => this.alimentos().map((a) => a.fuente));
  /** La API da la fuente como texto (FuenteAlimento). */
  protected readonly fuente = (a: AlimentoFrecuenteResponse) => a.fuente as NsFuenteDato;
  protected readonly columnas: NsColumna[] = [
    { clave: 'nombre', titulo: 'Alimento' },
    { clave: 'veces', titulo: 'Veces', alinear: 'end' },
    { clave: 'porcentajeEnergia', titulo: '% energía', alinear: 'end' },
    { clave: 'fuente', titulo: 'Fuente' },
  ];
}
