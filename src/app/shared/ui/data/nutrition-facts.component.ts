import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { UnidadBase } from '@core/models';
import { SIN_DATO, formatearNumero } from '@shared/pipes/formato';

/** Valores por 100 g o 100 ml (AlimentoResponse, productos). Los opcionales pueden faltar. */
export interface ValoresNutricionales {
  kcal100: number;
  proteinas100: number;
  carbohidratos100: number;
  azucares100?: number | null;
  grasas100: number;
  saturadas100?: number | null;
  fibra100?: number | null;
  sal100?: number | null;
}

/** Ración opcional para la segunda columna ("1 plato · 250 g"). */
export interface RacionNutricional {
  nombre: string;
  gramos: number;
}

interface Fila {
  nombre: string;
  clave: keyof ValoresNutricionales;
  unidad: 'kcal' | 'g';
  /** Fila "de los cuales/de las cuales": sangrada. */
  sub?: boolean;
  decimales: number;
}

const FILAS: readonly Fila[] = [
  { nombre: 'Energía', clave: 'kcal100', unidad: 'kcal', decimales: 0 },
  { nombre: 'Proteínas', clave: 'proteinas100', unidad: 'g', decimales: 1 },
  { nombre: 'Hidratos de carbono', clave: 'carbohidratos100', unidad: 'g', decimales: 1 },
  { nombre: 'de los cuales azúcares', clave: 'azucares100', unidad: 'g', sub: true, decimales: 1 },
  { nombre: 'Grasas', clave: 'grasas100', unidad: 'g', decimales: 1 },
  { nombre: 'de las cuales saturadas', clave: 'saturadas100', unidad: 'g', sub: true, decimales: 1 },
  { nombre: 'Fibra', clave: 'fibra100', unidad: 'g', decimales: 1 },
  { nombre: 'Sal', clave: 'sal100', unidad: 'g', decimales: 2 },
];

/**
 * Ficha nutricional en formato de etiqueta (DESIGN.md §5.16): energía, proteínas, hidratos (de los
 * cuales azúcares), grasas (de las cuales saturadas), fibra y sal, por 100 g o 100 ml y, si se
 * indica, por ración. Lo que falta se muestra como "—" con la nota "dato no disponible", nunca
 * como 0.
 *
 *   <ns-nutrition-facts [valores]="alimento" [unidadBase]="alimento.unidadBase" [racion]="porcion" />
 */
@Component({
  selector: 'ns-nutrition-facts',
  template: `
    <table class="ns-nf">
      <caption class="ns-sr-only">
        Información nutricional
        {{
          porCien()
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col"><span class="ns-sr-only">Nutriente</span></th>
          <th scope="col" class="ns-nf__num">{{ porCien() }}</th>
          @if (racion(); as r) {
            <th scope="col" class="ns-nf__num">por {{ r.nombre }} ({{ formatear(r.gramos) }} {{ unidad() }})</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (fila of filas(); track fila.clave) {
          <tr [class.ns-nf__sub]="fila.sub">
            <th scope="row">{{ fila.nombre }}</th>
            <td class="ns-nf__num ns-tnum">{{ fila.texto }}</td>
            @if (racion()) {
              <td class="ns-nf__num ns-tnum">{{ fila.textoRacion }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
    @if (hayFaltantes()) {
      <p class="ns-nf__nota">{{ sinDato }} dato no disponible</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-nf {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th,
    td {
      padding: var(--ns-space-2) 0;
      border-bottom: 1px solid var(--ns-border);
      text-align: left;
      font-weight: 400;
    }
    thead th {
      padding-top: 0;
      border-bottom: 2px solid var(--ns-text);
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
    }
    tbody th {
      font-weight: 500;
    }
    .ns-nf__num {
      padding-left: var(--ns-space-4);
      text-align: right;
      white-space: nowrap;
    }
    .ns-nf__sub th {
      padding-left: var(--ns-space-4);
      color: var(--ns-text-secondary);
      font-weight: 400;
    }
    .ns-nf__nota {
      margin: var(--ns-space-2) 0 0;
      color: var(--ns-text-tertiary);
      font-size: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsNutritionFactsComponent {
  readonly valores = input.required<ValoresNutricionales>();
  readonly unidadBase = input<UnidadBase>('G');
  readonly racion = input<RacionNutricional | null>(null);

  protected readonly sinDato = SIN_DATO;
  protected readonly formatear = formatearNumero;
  protected readonly unidad = computed(() => (this.unidadBase() === 'ML' ? 'ml' : 'g'));
  protected readonly porCien = computed(() => `por 100 ${this.unidad()}`);

  protected readonly filas = computed(() => {
    const v = this.valores();
    const factor = (this.racion()?.gramos ?? 0) / 100;
    return FILAS.map((fila) => {
      const valor = v[fila.clave];
      const hay = valor !== null && valor !== undefined && Number.isFinite(valor);
      return {
        ...fila,
        falta: !hay,
        texto: hay ? `${formatearNumero(valor, fila.decimales)} ${fila.unidad}` : SIN_DATO,
        textoRacion: hay ? `${formatearNumero(valor * factor, fila.decimales)} ${fila.unidad}` : SIN_DATO,
      };
    });
  });
  protected readonly hayFaltantes = computed(() => this.filas().some((f) => f.falta));
}
