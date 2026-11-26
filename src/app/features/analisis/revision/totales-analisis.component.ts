import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Nutrientes } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { idUnico } from '@shared/ui/form/control-campo';

interface Segmento {
  clave: 'proteina' | 'carbohidratos' | 'grasa';
  etiqueta: string;
  color: string;
  gramos: number;
  pct: number;
  /** Desplazamiento del trazo en el anillo (0–100). */
  inicio: number;
}

const KCAL_POR_GRAMO = { proteina: 4, carbohidratos: 4, grasa: 9 } as const;
const ETIQUETAS = { proteina: 'Proteínas', carbohidratos: 'Hidratos', grasa: 'Grasas' } as const;
const COLORES = {
  proteina: 'var(--ns-data-protein)',
  carbohidratos: 'var(--ns-data-carbs)',
  grasa: 'var(--ns-data-fat)',
} as const;

/** Radio para que la circunferencia mida 100 y el trazo se exprese en porcentaje. */
const RADIO = 100 / (2 * Math.PI);

/**
 * Total de la comida analizada (DESIGN.md §7.8): kcal grandes en un anillo con el reparto de
 * energía entre proteínas, hidratos y grasas (4/4/9 kcal por gramo), leyenda con gramos y
 * porcentaje, badge "Estimación IA" y la fuente de los valores.
 */
@Component({
  selector: 'app-totales-analisis',
  imports: [NsBadgeComponent],
  template: `
    <div class="ns-totales__cabecera">
      <div>
        <h2 class="ns-text-card-title ns-totales__titulo" [id]="idTitulo">Total de la comida</h2>
        <p class="ns-totales__subtitulo">Calculado con la base de datos nutricional</p>
      </div>
      <ns-badge variant="ai" icon="sparkles">Estimación IA</ns-badge>
    </div>

    <div class="ns-totales__cuerpo">
      <div class="ns-totales__anillo">
        <svg viewBox="0 0 40 40" width="120" height="120" aria-hidden="true">
          <circle class="ns-totales__pista" cx="20" cy="20" [attr.r]="radio" />
          @for (s of segmentos(); track s.clave) {
            @if (s.pct > 0) {
              <circle
                class="ns-totales__segmento"
                cx="20"
                cy="20"
                [attr.r]="radio"
                [attr.stroke]="s.color"
                [attr.stroke-dasharray]="s.pct + ' ' + (100 - s.pct)"
                [attr.stroke-dashoffset]="25 - s.inicio"
              />
            }
          }
        </svg>
        <span class="ns-totales__centro">
          <span class="ns-text-metric-lg ns-tnum">{{ kcal() }}</span>
          <span class="ns-totales__unidad">kcal</span>
        </span>
      </div>

      <dl class="ns-totales__leyenda">
        @for (s of segmentos(); track s.clave) {
          <div class="ns-totales__fila">
            <dt>
              <span class="ns-totales__punto" [style.background]="s.color" aria-hidden="true"></span>{{ s.etiqueta }}
            </dt>
            <dd class="ns-tnum">
              <strong>{{ gramos(s.gramos) }} g</strong>
              <span class="ns-totales__pct">{{ s.pct }} %</span>
            </dd>
          </div>
        }
      </dl>
    </div>

    <ns-badge class="ns-totales__fuente" icon="database"
      ><span class="ns-sr-only">Fuente: </span>Valores: catálogo NutriSport</ns-badge
    >
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-totales__cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--ns-space-2);
    }
    .ns-totales__titulo {
      margin: 0;
    }
    .ns-totales__subtitulo {
      margin: 2px 0 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-totales__cuerpo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-6);
    }
    .ns-totales__anillo {
      position: relative;
      flex-shrink: 0;
      width: 120px;
      height: 120px;
    }
    .ns-totales__pista,
    .ns-totales__segmento {
      fill: none;
      stroke-width: 5;
    }
    .ns-totales__pista {
      stroke: var(--ns-surface-sunken);
    }
    .ns-totales__centro {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .ns-totales__unidad {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
    }
    .ns-totales__leyenda {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--ns-space-3);
      min-width: 180px;
      margin: 0;
    }
    .ns-totales__fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ns-space-3);

      dt {
        display: flex;
        align-items: center;
        gap: var(--ns-space-2);
      }
      dd {
        display: flex;
        gap: var(--ns-space-3);
        margin: 0;
      }
    }
    .ns-totales__punto {
      width: 8px;
      height: 8px;
      border-radius: var(--ns-radius-full);
    }
    .ns-totales__pct {
      min-width: 4ch;
      color: var(--ns-text-tertiary);
      text-align: right;
    }
    .ns-totales__fuente {
      align-self: flex-start;
    }
  `,
  host: { role: 'region', '[attr.aria-labelledby]': 'idTitulo' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TotalesAnalisisComponent {
  readonly totales = input.required<Nutrientes>();

  protected readonly idTitulo = idUnico('ns-totales');
  protected readonly radio = RADIO;
  protected readonly kcal = computed(() => formatearNumero(this.totales().kcal));

  protected readonly segmentos = computed<Segmento[]>(() => {
    const t = this.totales();
    const claves = ['proteina', 'carbohidratos', 'grasa'] as const;
    const energia = claves.map((c) => t[c] * KCAL_POR_GRAMO[c]);
    const total = energia.reduce((a, b) => a + b, 0);
    const pcts = porcentajesEnteros(energia, total);
    let inicio = 0;
    return claves.map((clave, i) => {
      const s: Segmento = {
        clave,
        etiqueta: ETIQUETAS[clave],
        color: COLORES[clave],
        gramos: t[clave],
        pct: pcts[i],
        inicio,
      };
      inicio += pcts[i];
      return s;
    });
  });

  protected gramos(valor: number): string {
    return formatearNumero(valor, valor < 10 ? 1 : 0);
  }
}

/** Porcentajes enteros que suman 100 (método del mayor resto); todo 0 si no hay energía. */
function porcentajesEnteros(valores: readonly number[], total: number): number[] {
  if (total <= 0) return valores.map(() => 0);
  const exactos = valores.map((v) => (v / total) * 100);
  const enteros = exactos.map(Math.floor);
  let resto = 100 - enteros.reduce((a, b) => a + b, 0);
  const orden = exactos.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of orden) {
    if (resto-- <= 0) break;
    enteros[i]++;
  }
  return enteros;
}
