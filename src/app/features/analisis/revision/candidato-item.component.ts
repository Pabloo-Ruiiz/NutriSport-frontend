import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import type { AlimentoResumenResponse, CoincidenciaCatalogo } from '@core/models';
import { ETIQUETAS_PREPARACION } from '@core/models/etiquetas';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsConfidenceBadgeComponent, nivelConfianza } from '@shared/ui/data/confidence-badge.component';
import { idUnico } from '@shared/ui/form/control-campo';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { type LineaAnalisis, MAX_GRAMOS_ANALISIS } from './analisis.store';
import { CambiarAlimentoComponent } from './cambiar-alimento.component';

/**
 * Un alimento del análisis (DESIGN.md §7.8): número (el de la etiqueta de la foto), alimento
 * emparejado, lo detectado en caption ("Detectado: arroz blanco · cocido"), confianza, gramos,
 * kcal y macros de la línea, "Cambiar alimento" y "Quitar". Las de confianza baja y las que no
 * tienen alimento resaltan la fila; estas últimas abren "Cambiar alimento" de entrada.
 */
@Component({
  selector: 'app-candidato-item',
  imports: [
    FormsModule,
    LucideDynamicIcon,
    NsButtonComponent,
    NsConfidenceBadgeComponent,
    NsQuantityInputComponent,
    CambiarAlimentoComponent,
  ],
  template: `
    @let l = linea();
    <span class="ns-candidato__numero" aria-hidden="true">{{ numero() }}</span>

    <div class="ns-candidato__cuerpo">
      <div class="ns-candidato__cabecera">
        <div class="ns-candidato__textos">
          <h3 class="ns-candidato__nombre" [id]="idNombre">
            <span class="ns-sr-only">{{ numero() }}. </span>
            @if (l.nombreAlimento) {
              {{ l.nombreAlimento }}
            } @else {
              <span class="ns-candidato__sin">Sin emparejar</span>
            }
          </h3>
          <p class="ns-candidato__detectado">{{ detectado() }}</p>
          <ns-confidence-badge [confianza]="l.confianza" />
        </div>
        <span class="ns-candidato__kcal ns-tnum">
          @if (macros(); as m) {
            <strong>{{ m.kcal }}</strong> kcal
          } @else {
            — kcal
          }
        </span>
      </div>

      @if (!l.alimentoId) {
        <p class="ns-candidato__aviso">
          <svg lucideIcon="triangle-exclamation-point" [size]="14" aria-hidden="true"></svg>
          No lo hemos encontrado en el catálogo: elige el alimento para poder guardar.
        </p>
      }

      <div class="ns-candidato__controles">
        <ns-quantity-input
          [ngModel]="l.gramos"
          (ngModelChange)="gramos.emit($event ?? 0)"
          [min]="0"
          [max]="maxGramos"
          [step]="10"
          unit="g"
          [etiqueta]="'Gramos de ' + nombreAccesible()"
        />
        <button
          nsButton
          type="button"
          variant="ghost"
          size="sm"
          icon="refresh-cw"
          [attr.aria-expanded]="abierto()"
          [attr.aria-controls]="idPanel"
          (click)="abierto.set(!abierto())"
        >
          {{ l.alimentoId ? 'Cambiar alimento' : 'Elegir alimento' }}
        </button>
        <button
          type="button"
          class="ns-candidato__quitar"
          [attr.aria-label]="'Quitar ' + nombreAccesible()"
          (click)="quitar.emit()"
        >
          <svg lucideIcon="trash" [size]="18" aria-hidden="true"></svg>
        </button>
      </div>

      @if (macros(); as m) {
        <p class="ns-candidato__macros ns-tnum">
          <span><abbr title="Proteínas">P</abbr> {{ m.proteina }} g</span>
          <span><abbr title="Hidratos de carbono">HC</abbr> {{ m.carbohidratos }} g</span>
          <span><abbr title="Grasas">G</abbr> {{ m.grasa }} g</span>
          <span class="ns-candidato__por100">{{ m.kcal100 }} kcal/100 g</span>
        </p>
      }

      <div [id]="idPanel" [hidden]="!abierto()">
        @if (abierto()) {
          <app-cambiar-alimento
            [coincidencias]="l.coincidencias"
            [alimentoIdActual]="l.alimentoId"
            [nombre]="l.nombreDetectado ?? l.nombreAlimento"
            (elegido)="elegir($event)"
          />
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      gap: var(--ns-space-3);
      padding: var(--ns-space-4) var(--ns-space-6);
      border-left: 3px solid transparent;
      scroll-margin-top: calc(var(--ns-topbar-height, 64px) + var(--ns-space-4));

      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: -2px;
      }
    }
    :host(.ns-candidato--resaltada) {
      background: var(--ns-ai-bg);
      border-left-color: var(--ns-accent);
    }
    :host(.ns-candidato--revisar) {
      background: var(--ns-error-bg);
      border-left-color: var(--ns-error);
    }
    .ns-candidato__numero {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--ns-radius-full);
      background: var(--ns-action-ai);
      color: var(--ns-text-inverse);
      font-weight: 700;
      font-size: 0.8125rem;
    }
    .ns-candidato__cuerpo {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--ns-space-2);
      min-width: 0;
    }
    .ns-candidato__cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--ns-space-3);
    }
    .ns-candidato__textos {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ns-space-1);
      min-width: 0;
    }
    .ns-candidato__nombre {
      margin: 0;
      font: 600 1rem/1.5rem var(--ns-font-body);
      overflow-wrap: anywhere;
    }
    .ns-candidato__sin {
      color: var(--ns-error);
    }
    .ns-candidato__detectado {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
    }
    .ns-candidato__kcal {
      flex-shrink: 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;

      strong {
        color: var(--ns-text);
        font: 700 1.125rem/1.5rem var(--ns-font-display);
      }
    }
    .ns-candidato__aviso {
      display: flex;
      align-items: center;
      gap: var(--ns-space-1);
      margin: 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
    .ns-candidato__controles {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-2);
    }
    .ns-candidato__quitar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      margin-left: auto;
      border: 0;
      border-radius: var(--ns-radius-md);
      background: transparent;
      color: var(--ns-text-secondary);
      cursor: pointer;

      &:hover {
        background: var(--ns-error-bg);
        color: var(--ns-error);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
    .ns-candidato__macros {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-1) var(--ns-space-3);
      margin: 0;
      font-size: 0.8125rem;

      abbr {
        color: var(--ns-text-secondary);
        text-decoration: none;
      }
    }
    .ns-candidato__por100 {
      color: var(--ns-text-tertiary);
    }
  `,
  host: {
    class: 'ns-candidato',
    role: 'group',
    tabindex: '-1',
    '[attr.aria-labelledby]': 'idNombre',
    '[class.ns-candidato--revisar]': 'revisar()',
    '[class.ns-candidato--resaltada]': 'resaltada() && !revisar()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidatoItemComponent {
  readonly linea = input.required<LineaAnalisis>();
  /** Número de la etiqueta en la foto (1, 2, 3…). */
  readonly numero = input.required<number>();
  /** La etiqueta de la foto apunta a esta fila. */
  readonly resaltada = input(false);

  readonly gramos = output<number>();
  readonly alimento = output<CoincidenciaCatalogo | AlimentoResumenResponse>();
  readonly quitar = output<void>();

  protected readonly idNombre = idUnico('ns-candidato');
  protected readonly idPanel = idUnico('ns-candidato-cambiar');
  protected readonly maxGramos = MAX_GRAMOS_ANALISIS;

  /**
   * "Cambiar alimento" abierto: de entrada, si la línea no tiene alimento. Solo se reinicia al
   * cambiar el alimento (no al editar los gramos, que también crea una línea nueva).
   */
  protected readonly abierto = linkedSignal({
    source: () => this.linea().alimentoId,
    computation: (alimentoId) => !alimentoId,
  });

  /** Confianza baja (< 0,5) o sin alimento: la fila se resalta. */
  protected readonly revisar = computed(() => {
    const { confianza, alimentoId } = this.linea();
    return !alimentoId || (confianza !== null && nivelConfianza(confianza) === 'baja');
  });

  protected readonly nombreAccesible = computed(
    () => this.linea().nombreAlimento ?? this.linea().nombreDetectado ?? `alimento ${this.numero()}`,
  );

  /** "Detectado: arroz blanco · cocido", o "Añadido a mano". */
  protected readonly detectado = computed(() => {
    const { nombreDetectado, preparacion } = this.linea();
    if (!nombreDetectado) return 'Añadido a mano';
    const prep = preparacion ? ` · ${ETIQUETAS_PREPARACION[preparacion].toLocaleLowerCase('es-ES')}` : '';
    return `Detectado: ${nombreDetectado.toLocaleLowerCase('es-ES')}${prep}`;
  });

  protected readonly macros = computed(() => {
    const { por100, gramos } = this.linea();
    if (!por100) return null;
    const f = Math.max(0, gramos) / 100;
    return {
      kcal: formatearNumero(por100.kcal * f),
      proteina: formatearNumero(por100.proteina * f, 1),
      carbohidratos: formatearNumero(por100.carbohidratos * f, 1),
      grasa: formatearNumero(por100.grasa * f, 1),
      kcal100: formatearNumero(por100.kcal),
    };
  });

  protected elegir(alimento: CoincidenciaCatalogo | AlimentoResumenResponse): void {
    this.alimento.emit(alimento);
    this.abierto.set(false);
  }
}
