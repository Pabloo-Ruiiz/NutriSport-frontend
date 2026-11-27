import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Nutrientes, RelacionNutricionResponse } from '@core/models';
import { NS_CARD } from '@shared/ui/card/card.component';
import type { NsColorDato } from '@shared/ui/data/colores';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';

interface FilaComparada {
  clave: string;
  nombre: string;
  unidad: string;
  color: NsColorDato;
  entreno: { valor: number; objetivo: number };
  descanso: { valor: number; objetivo: number };
}

const MEDIDAS: { clave: keyof Nutrientes; nombre: string; unidad: string; color: NsColorDato }[] = [
  { clave: 'kcal', nombre: 'Energía', unidad: 'kcal', color: 'activity' },
  { clave: 'carbohidratos', nombre: 'Hidratos', unidad: 'g', color: 'carbs' },
  { clave: 'proteina', nombre: 'Proteína', unidad: 'g', color: 'protein' },
];

/**
 * Entreno frente a descanso (GET /entrenamientos/relacion-nutricion): media diaria consumida frente
 * al objetivo medio en los días con entreno y en los de descanso (energía, hidratos y proteína), y
 * cuántas sesiones tienen ≥ 25 g de proteína en las 2 h siguientes. Se usa en /estadisticas y, con
 * las últimas 4 semanas, en /actividad ("Alimentación y actividad").
 */
@Component({
  selector: 'app-entreno-descanso',
  imports: [NS_CARD, NsProgressBarComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>{{ titulo() }}</h3>
      <p nsCardSubtitulo>{{ subtitulo() }}</p>
      @if (relacion(); as r) {
        @if (r.diasEntreno + r.diasDescanso === 0) {
          <p class="ns-ed__vacio">Sin comidas registradas en el periodo.</p>
        } @else {
          @for (f of filas(); track f.clave) {
            <div class="ns-ed__bloque">
              <p class="ns-ed__cabecera">
                <span class="ns-ed__nombre">{{ f.nombre }}</span>
                <span class="ns-ed__nota">consumido / objetivo</span>
              </p>
              @if (r.diasEntreno) {
                <div class="ns-ed__fila">
                  <span class="ns-ed__etiqueta" aria-hidden="true">Entreno</span>
                  <ns-progress-bar
                    [value]="f.entreno.valor"
                    [max]="f.entreno.objetivo"
                    [color]="f.color"
                    [unidad]="f.unidad"
                    [etiqueta]="f.nombre + ' en días de entreno'"
                    showLabel
                  />
                </div>
              }
              @if (r.diasDescanso) {
                <div class="ns-ed__fila">
                  <span class="ns-ed__etiqueta" aria-hidden="true">Descanso</span>
                  <ns-progress-bar
                    [value]="f.descanso.valor"
                    [max]="f.descanso.objetivo"
                    [color]="f.color"
                    [unidad]="f.unidad"
                    [etiqueta]="f.nombre + ' en días de descanso'"
                    showLabel
                  />
                </div>
              }
            </div>
          }
          <div class="ns-ed__bloque">
            <p class="ns-ed__cabecera">
              <span class="ns-ed__nombre">Proteína post-entreno</span>
              <span class="ns-ed__nota">≥ 25 g en las 2 h siguientes</span>
            </p>
            @if (r.sesiones) {
              <div class="ns-ed__fila">
                <span class="ns-ed__etiqueta" aria-hidden="true">Sesiones</span>
                <ns-progress-bar
                  [value]="r.sesionesConProteinaPost"
                  [max]="r.sesiones"
                  color="protein"
                  etiqueta="Sesiones con al menos 25 g de proteína en las 2 horas siguientes"
                  showLabel
                />
              </div>
              <p class="ns-ed__resumen">{{ r.sesionesConProteinaPost }} de {{ r.sesiones }} sesiones</p>
            } @else {
              <p class="ns-ed__vacio">Sin entrenamientos en el periodo.</p>
            }
          </div>
        }
      }
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    p {
      margin: 0;
    }
    .ns-ed__bloque {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      & + & {
        margin-top: var(--ns-space-4);
      }
    }
    .ns-ed__cabecera {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--ns-space-2);
    }
    .ns-ed__nombre {
      color: var(--ns-text);
      font: 600 0.875rem/1.25rem var(--ns-font-body);
    }
    .ns-ed__nota,
    .ns-ed__resumen {
      color: var(--ns-text-tertiary);
      font: 500 0.75rem/1rem var(--ns-font-body);
    }
    .ns-ed__fila {
      display: grid;
      grid-template-columns: 5.5rem minmax(0, 1fr);
      gap: var(--ns-space-3);
      align-items: center;
    }
    .ns-ed__etiqueta {
      color: var(--ns-text-secondary);
      font: 500 0.8125rem/1.25rem var(--ns-font-body);
    }
    .ns-ed__vacio {
      color: var(--ns-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrenoDescansoComponent {
  readonly relacion = input.required<RelacionNutricionResponse | null>();
  readonly titulo = input('Entreno frente a descanso');

  protected readonly subtitulo = computed(() => {
    const r = this.relacion();
    if (!r) return 'Media diaria';
    const d = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
    return `Media diaria · ${d(r.diasEntreno)} de entreno, ${d(r.diasDescanso)} de descanso`;
  });

  protected readonly filas = computed<FilaComparada[]>(() => {
    const r = this.relacion();
    if (!r) return [];
    const par = (media: Nutrientes, objetivo: Nutrientes | null, clave: keyof Nutrientes) => {
      const valor = Math.round(media[clave]);
      // Sin objetivo, la barra se llena con el valor (no hay referencia).
      const obj = Math.round(objetivo?.[clave] ?? 0) || Math.max(1, valor);
      return { valor, objetivo: obj };
    };
    return MEDIDAS.map((m) => ({
      ...m,
      entreno: par(r.mediaEntreno, r.objetivoEntreno, m.clave),
      descanso: par(r.mediaDescanso, r.objetivoDescanso, m.clave),
    }));
  });
}
