import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsSpinnerComponent } from '@shared/ui/feedback/spinner.component';

/**
 * Momento del análisis:
 * - preparando: comprimiendo y subiendo la foto.
 * - detectando: subida terminada; el backend la procesa (PENDIENTE o PROCESANDO).
 * - calculando: COMPLETADO; se pasa a la revisión.
 */
export type MomentoAnalisis = 'preparando' | 'detectando' | 'calculando';

type EstadoFase = 'hecha' | 'activa' | 'pendiente';

interface Fase {
  titulo: string;
  detalle: string;
  estado: EstadoFase;
}

/**
 * Alimento detectado, para la etiqueta sobre la foto. El backend no da su posición en la imagen,
 * así que las etiquetas se apilan en la parte superior.
 */
export interface AlimentoDetectado {
  nombre: string;
  /** 0–1, o null si no viene. */
  confianza: number | null;
}

const ORDEN: Record<MomentoAnalisis, number> = { preparando: 0, detectando: 1, calculando: 2 };

/** Texto del estado actual (barra sobre la foto y aria-live). */
export const TEXTOS_MOMENTO: Record<MomentoAnalisis, string> = {
  preparando: 'Optimizando y subiendo la foto…',
  detectando: 'Detectando alimentos…',
  calculando: 'Calculando nutrientes…',
};

/**
 * Foto en análisis (DESIGN.md §7.7, paso 2): la previsualización con una línea de escaneo índigo
 * que la recorre (quieta con prefers-reduced-motion) y una barra inferior con el estado. Lo que se
 * proyecta (p. ej. "Continuar manualmente") va en esa barra. Con `detectados` (al COMPLETADO) muestra
 * una etiqueta por alimento con su confianza; aparecen escalonadas (de golpe con reduced-motion).
 *
 *   <app-progreso-analisis [src]="previsualizacion()" [momento]="momento()">
 *     <a nsButton variant="secondary" size="sm" routerLink="/comidas/nueva">Continuar manualmente</a>
 *   </app-progreso-analisis>
 */
@Component({
  selector: 'app-progreso-analisis',
  imports: [LucideDynamicIcon, NsSpinnerComponent],
  template: `
    <div class="ns-progreso__foto">
      <img class="ns-progreso__imagen" [src]="src()" alt="Foto del plato que se está analizando" />
      <span class="ns-progreso__esquinas" aria-hidden="true"></span>
      <span class="ns-progreso__escaner" aria-hidden="true"></span>

      @if (detectados().length) {
        <ul class="ns-progreso__detectados" aria-label="Alimentos detectados">
          @for (alimento of detectados(); track $index; let i = $index) {
            <li class="ns-progreso__etiqueta" [style.animation-delay.ms]="i * 120">
              <svg lucideIcon="circle-check" [size]="14" aria-hidden="true"></svg>
              <span class="ns-progreso__etiqueta-nombre">{{ alimento.nombre }}</span>
              @if (alimento.confianza !== null) {
                <span class="ns-progreso__etiqueta-confianza"
                  ><span class="ns-sr-only">, confianza </span>{{ porcentaje(alimento.confianza) }}</span
                >
              }
            </li>
          }
        </ul>
      }

      <div class="ns-progreso__barra">
        <ns-spinner [size]="18" />
        <p class="ns-progreso__texto">{{ texto() }}</p>
        <span class="ns-progreso__avance" aria-hidden="true">
          <span class="ns-progreso__avance-relleno" [style.transform]="'scaleX(' + avance() + ')'"></span>
        </span>
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-progreso__foto {
      position: relative;
      overflow: hidden;
      border: 2px solid var(--ns-ai-500);
      border-radius: var(--ns-radius-xl);
      background: var(--ns-surface-inverse);
      aspect-ratio: 4 / 3;
    }
    .ns-progreso__imagen {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .ns-progreso__esquinas {
      position: absolute;
      inset: var(--ns-space-4);
      border-radius: var(--ns-radius-md);
      // Cuatro esquinas de visor con gradientes (sin elementos extra).
      --l: 28px;
      --g: 3px;
      background:
        linear-gradient(#fff, #fff) top left / var(--l) var(--g),
        linear-gradient(#fff, #fff) top left / var(--g) var(--l),
        linear-gradient(#fff, #fff) top right / var(--l) var(--g),
        linear-gradient(#fff, #fff) top right / var(--g) var(--l),
        linear-gradient(#fff, #fff) bottom left / var(--l) var(--g),
        linear-gradient(#fff, #fff) bottom left / var(--g) var(--l),
        linear-gradient(#fff, #fff) bottom right / var(--l) var(--g),
        linear-gradient(#fff, #fff) bottom right / var(--g) var(--l);
      background-repeat: no-repeat;
      opacity: 0.85;
    }
    .ns-progreso__escaner {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      height: 35%;
      border-bottom: 2px solid var(--ns-ai-500);
      background: linear-gradient(to bottom, transparent, rgb(99 102 241 / 0.35));
      animation: ns-escanear 2.4s ease-in-out infinite alternate;
      will-change: transform;
    }
    @keyframes ns-escanear {
      from {
        transform: translateY(-100%);
      }
      to {
        transform: translateY(186%);
      }
    }
    .ns-progreso__detectados {
      position: absolute;
      top: var(--ns-space-6);
      right: var(--ns-space-6);
      left: var(--ns-space-6);
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-progreso__etiqueta {
      display: inline-flex;
      align-items: center;
      gap: var(--ns-space-1);
      max-width: 100%;
      padding: var(--ns-space-1) var(--ns-space-3) var(--ns-space-1) var(--ns-space-2);
      border-radius: var(--ns-radius-full);
      background: var(--ns-surface-inverse);
      color: var(--ns-text-inverse);
      font-weight: 600;
      font-size: 0.8125rem;
      box-shadow: var(--ns-shadow-md);
      animation: ns-aparecer 240ms ease-out both;

      svg {
        flex-shrink: 0;
        color: var(--ns-ai-100);
      }
    }
    .ns-progreso__etiqueta-nombre {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ns-progreso__etiqueta-confianza {
      color: var(--ns-ai-100);
      font-variant-numeric: tabular-nums;
    }
    @keyframes ns-aparecer {
      from {
        opacity: 0;
        transform: translateY(4px) scale(0.96);
      }
    }
    .ns-progreso__barra {
      position: absolute;
      right: var(--ns-space-3);
      bottom: var(--ns-space-3);
      left: var(--ns-space-3);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-2) var(--ns-space-3);
      padding: var(--ns-space-3);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface);
      box-shadow: var(--ns-shadow-md);
      color: var(--ns-action-ai);
    }
    .ns-progreso__texto {
      flex: 1;
      min-width: 10ch;
      margin: 0;
      color: var(--ns-text);
      font-weight: 600;
      font-size: 0.875rem;
    }
    .ns-progreso__avance {
      flex: 0 0 120px;
      height: 4px;
      overflow: hidden;
      border-radius: var(--ns-radius-full);
      background: var(--ns-ai-100);
    }
    .ns-progreso__avance-relleno {
      display: block;
      height: 100%;
      background: var(--ns-action-ai);
      transform-origin: left;
      transition: transform 400ms ease-out;
    }
    @media (prefers-reduced-motion: reduce) {
      .ns-progreso__escaner {
        top: auto;
        bottom: 0;
        height: 100%;
        border-bottom: 0;
        background: linear-gradient(to bottom, transparent 40%, rgb(99 102 241 / 0.25));
        animation: none;
      }
      .ns-progreso__avance-relleno {
        transition: none;
      }
      .ns-progreso__etiqueta {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgresoAnalisisComponent {
  /** URL de la previsualización (URL.createObjectURL). */
  readonly src = input.required<string>();
  readonly momento = input.required<MomentoAnalisis>();
  /** Alimentos detectados (vacío mientras se analiza). */
  readonly detectados = input<readonly AlimentoDetectado[]>([]);

  protected readonly texto = computed(() => TEXTOS_MOMENTO[this.momento()]);
  protected readonly avance = computed(() => (ORDEN[this.momento()] + 1) / 3);

  protected porcentaje(confianza: number): string {
    return `${Math.round(confianza * 100)} %`;
  }
}

/**
 * Fases del análisis (DESIGN.md §7.7): "Imagen optimizada y sin metadatos" (al terminar la
 * subida), "Detectando alimentos" (PENDIENTE o PROCESANDO) y "Calculando nutrientes".
 */
@Component({
  selector: 'app-fases-analisis',
  imports: [LucideDynamicIcon, NsSpinnerComponent],
  template: `
    <ol class="ns-fases">
      @for (fase of fases(); track fase.titulo) {
        <li class="ns-fases__fase" [class]="'ns-fases__fase ns-fases__fase--' + fase.estado">
          <span class="ns-fases__marca" aria-hidden="true">
            @switch (fase.estado) {
              @case ('hecha') {
                <svg lucideIcon="check" [size]="16" [strokeWidth]="3"></svg>
              }
              @case ('activa') {
                <ns-spinner [size]="18" />
              }
              @default {
                <svg lucideIcon="circle-dashed" [size]="18"></svg>
              }
            }
          </span>
          <span class="ns-fases__textos">
            <span class="ns-fases__titulo">{{ fase.titulo }}</span>
            <span class="ns-fases__detalle">{{ fase.detalle }}</span>
          </span>
          <span class="ns-sr-only">({{ textoEstado[fase.estado] }})</span>
        </li>
      }
    </ol>
  `,
  styles: `
    .ns-fases {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-fases__fase {
      display: flex;
      align-items: flex-start;
      gap: var(--ns-space-3);
    }
    .ns-fases__marca {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--ns-radius-full);
      color: var(--ns-text-tertiary);
    }
    .ns-fases__fase--hecha .ns-fases__marca {
      background: var(--ns-success-bg);
      color: var(--ns-success);
    }
    .ns-fases__fase--activa .ns-fases__marca {
      background: var(--ns-ai-50);
      color: var(--ns-action-ai);
    }
    .ns-fases__textos {
      display: flex;
      flex-direction: column;
    }
    .ns-fases__titulo {
      font-weight: 600;
      font-size: 0.9375rem;
    }
    .ns-fases__fase--activa .ns-fases__titulo {
      color: var(--ns-action-ai);
    }
    .ns-fases__fase--pendiente .ns-fases__titulo {
      color: var(--ns-text-secondary);
      font-weight: 500;
    }
    .ns-fases__detalle {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FasesAnalisisComponent {
  readonly momento = input.required<MomentoAnalisis>();

  protected readonly textoEstado: Record<EstadoFase, string> = {
    hecha: 'completada',
    activa: 'en curso',
    pendiente: 'pendiente',
  };

  protected readonly fases = computed<Fase[]>(() => {
    const actual = ORDEN[this.momento()];
    const estado = (i: number): EstadoFase => (i < actual ? 'hecha' : i === actual ? 'activa' : 'pendiente');
    return [
      {
        titulo: 'Imagen optimizada y sin metadatos',
        detalle: 'Ubicación y datos del dispositivo eliminados',
        estado: estado(0),
      },
      { titulo: 'Detectando alimentos', detalle: 'Modelo de visión · estimación orientativa', estado: estado(1) },
      { titulo: 'Calculando nutrientes', detalle: 'Con la base de datos de alimentos', estado: estado(2) },
    ];
  });
}
