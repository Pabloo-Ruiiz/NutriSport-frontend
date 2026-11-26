import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import type { AlimentoRegistradoResponse, RegistroComidaResponse } from '@core/models';
import { formatearFecha, formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent, type NsBadgeVariant } from '@shared/ui/feedback/badge.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import type { Estimacion } from '../registro/comida-editor.store';
import { TotalesComidaComponent } from '../registro/totales-comida.component';
import { type NivelConfianza, badgeOrigen, etiquetaTipo, horaCorta, nivelConfianza } from './comida-util';

export interface DetalleComidaData {
  comida: RegistroComidaResponse;
}

/** Cómo se cierra el detalle: sin valor, o con la acción elegida en el pie. */
export type ResultadoDetalleComida = { accion: 'editar' | 'duplicar'; comida: RegistroComidaResponse } | undefined;

/** Cantidades sin ceros de relleno: "1", "1,5", "0,25". */
const CANTIDAD = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

const VARIANTES_CONFIANZA: Record<NivelConfianza, NsBadgeVariant> = {
  alta: 'success',
  media: 'warning',
  baja: 'error',
};

/**
 * Detalle de una comida (DESIGN.md §7.9). Se abre con NsDialogService:
 *
 *   this.dialogos.open<DetalleComidaComponent, ResultadoDetalleComida, DetalleComidaData>(
 *     DetalleComidaComponent, { titulo: 'Detalle de la comida', size: 'lg', data: { comida } });
 *
 * Alimentos con cantidad, unidad, gramos y nutrientes; totales; notas y avisos. En las de foto,
 * "Estimación IA" con la confianza de cada alimento detectado y el aviso orientativo.
 */
@Component({
  selector: 'app-detalle-comida',
  imports: [
    DialogShellComponent,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsDisclaimerComponent,
    TotalesComidaComponent,
  ],
  template: `
    <ns-dialog-shell>
      <div class="ns-detalle">
        <p class="ns-detalle__resumen">
          <span class="ns-detalle__tipo">{{ tipo }}</span>
          <span class="ns-detalle__fecha">{{ fecha }}</span>
          @if (origen; as origen) {
            <ns-badge [variant]="origen.variant" [icon]="origen.icono">{{ origen.texto }}</ns-badge>
          }
          @if (esFoto) {
            <ns-badge variant="ai" icon="sparkles">Estimación IA</ns-badge>
          }
        </p>

        @if (comida.avisos.length) {
          <ns-alert type="warning" titulo="Avisos">
            <ul class="ns-detalle__avisos">
              @for (aviso of comida.avisos; track aviso) {
                <li>{{ aviso }}</li>
              }
            </ul>
          </ns-alert>
        }

        <section aria-labelledby="ns-detalle-alimentos">
          <h3 class="ns-text-card-title ns-detalle__subtitulo" id="ns-detalle-alimentos">
            Alimentos ({{ comida.alimentos.length }})
          </h3>
          <ul class="ns-detalle__alimentos" role="list">
            @for (a of comida.alimentos; track a.id) {
              <li class="ns-detalle__alimento">
                <div class="ns-detalle__fila">
                  <span class="ns-detalle__nombre">{{ a.nombre }}</span>
                  <span class="ns-detalle__kcal ns-tnum">{{ n(a.kcal) }} kcal</span>
                </div>
                <div class="ns-detalle__fila ns-detalle__secundaria">
                  <span class="ns-tnum">{{ cantidad(a) }}</span>
                  <span class="ns-detalle__macros ns-tnum">
                    <span><abbr title="Proteína">P</abbr> {{ n(a.proteina, 1) }} g</span>
                    <span><abbr title="Hidratos de carbono">HC</abbr> {{ n(a.carbohidratos, 1) }} g</span>
                    <span><abbr title="Grasa">G</abbr> {{ n(a.grasa, 1) }} g</span>
                  </span>
                </div>
                @if (a.origenIa && a.confianzaIa !== null) {
                  <ns-badge class="ns-detalle__confianza" [variant]="varianteConfianza(a.confianzaIa)" icon="sparkles">
                    Confianza {{ nivel(a.confianzaIa) }} · {{ porcentaje(a.confianzaIa) }}
                  </ns-badge>
                }
              </li>
            }
          </ul>
        </section>

        <section aria-labelledby="ns-detalle-totales">
          <h3 class="ns-text-card-title ns-detalle__subtitulo" id="ns-detalle-totales">Totales</h3>
          <app-totales-comida [totales]="totales" />
        </section>

        @if (comida.notas) {
          <section aria-labelledby="ns-detalle-notas">
            <h3 class="ns-text-card-title ns-detalle__subtitulo" id="ns-detalle-notas">Notas</h3>
            <p class="ns-detalle__notas">{{ comida.notas }}</p>
          </section>
        }

        @if (esFoto) {
          <ns-disclaimer context="analisis" />
        }
      </div>

      <button nsDialogAcciones nsButton type="button" variant="secondary" icon="copy" (click)="cerrar('duplicar')">
        Duplicar
      </button>
      <button nsDialogAcciones nsButton type="button" icon="pencil" (click)="cerrar('editar')">Editar</button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-detalle {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-5);
    }
    .ns-detalle__resumen {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-2);
      margin: 0;
    }
    .ns-detalle__tipo {
      font-weight: 600;
    }
    .ns-detalle__fecha {
      color: var(--ns-text-secondary);
    }
    .ns-detalle__subtitulo {
      margin: 0 0 var(--ns-space-2);
    }
    .ns-detalle__avisos {
      margin: 0;
      padding-left: var(--ns-space-5);
    }
    .ns-detalle__alimentos {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-detalle__alimento {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--ns-space-3) 0;
      border-bottom: 1px solid var(--ns-border);
      &:first-child {
        padding-top: 0;
      }
      &:last-child {
        border-bottom: 0;
      }
    }
    .ns-detalle__fila {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--ns-space-1) var(--ns-space-3);
    }
    .ns-detalle__nombre {
      min-width: 0;
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .ns-detalle__kcal {
      flex-shrink: 0;
      font-weight: 600;
    }
    .ns-detalle__secundaria {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-detalle__macros {
      display: flex;
      gap: var(--ns-space-3);
      abbr {
        text-decoration: none;
      }
    }
    .ns-detalle__confianza {
      align-self: flex-start;
      margin-top: var(--ns-space-1);
    }
    .ns-detalle__notas {
      margin: 0;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleComidaComponent {
  private readonly ref = inject<DialogRef<ResultadoDetalleComida>>(DialogRef);
  protected readonly comida = inject<DetalleComidaData>(DIALOG_DATA).comida;

  protected readonly tipo = etiquetaTipo(this.comida);
  protected readonly origen = badgeOrigen(this.comida.origen);
  protected readonly esFoto = this.comida.origen === 'FOTO';
  /** "Martes, 24 de noviembre · 08:30". */
  protected readonly fecha = [formatearFecha(this.comida.fecha, 'larga'), horaCorta(this.comida)]
    .filter(Boolean)
    .join(' · ');
  /** Los del servidor: el bloque de totales muestra "Calculado". */
  protected readonly totales: Estimacion = {
    ...this.comida.totales,
    gramos: this.comida.alimentos.reduce((s, a) => s + (a.gramos ?? 0), 0),
    esEstimacion: false,
  };

  protected readonly n = formatearNumero;

  /** "1 taza (240 g)", "150 g". Los gramos solo se añaden si la unidad no lo es ya. */
  protected cantidad(a: AlimentoRegistradoResponse): string {
    const base = `${CANTIDAD.format(a.cantidad)} ${a.unidad}`;
    const enGramos = /^(g|gramos?|ml|mililitros?)$/i.test(a.unidad.trim());
    return a.gramos !== null && !enGramos ? `${base} (${formatearNumero(a.gramos)} g)` : base;
  }

  protected nivel(confianza: number): NivelConfianza {
    return nivelConfianza(confianza);
  }

  protected varianteConfianza(confianza: number): NsBadgeVariant {
    return VARIANTES_CONFIANZA[nivelConfianza(confianza)];
  }

  protected porcentaje(confianza: number): string {
    return `${formatearNumero(confianza * 100)} %`;
  }

  protected cerrar(accion: 'editar' | 'duplicar'): void {
    this.ref.close({ accion, comida: this.comida });
  }
}
