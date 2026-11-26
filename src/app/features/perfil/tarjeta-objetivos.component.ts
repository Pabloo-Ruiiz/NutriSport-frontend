import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import type { ObjetivosResponse, PesoResponse } from '@core/models';
import { PerfilService } from '@core/services/perfil.service';
import { aApiError } from '@core/util/api-error';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsRingComponent } from '@shared/ui/data/ring.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsSwitchComponent } from '@shared/ui/form/switch.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { ObjetivosManualesDialogComponent } from './componentes/objetivos-manuales-dialog.component';
import { type DatosRegistrarPeso, RegistrarPesoDialogComponent } from './componentes/registrar-peso-dialog.component';

/**
 * Objetivos actuales en Mi perfil (DESIGN.md §7.5): lateral en escritorio y debajo del formulario
 * en móvil. Anillo pequeño de kcal, macros, badge "Manuales", switch "Fijar objetivos manualmente"
 * (diálogo de objetivos manuales), "Volver al cálculo automático" (con confirmación) y
 * "Registrar peso".
 *
 * Emite los objetivos nuevos y el pesaje registrado; quien la usa decide qué recargar.
 */
@Component({
  selector: 'app-tarjeta-objetivos',
  imports: [FormsModule, NsBadgeComponent, NsButtonComponent, NsRingComponent, NsSwitchComponent],
  template: `
    <section class="ns-tarjeta-objetivos" aria-labelledby="ns-tarjeta-objetivos-titulo">
      <header class="ns-tarjeta-objetivos__cabecera">
        <h2 class="ns-text-card-title" id="ns-tarjeta-objetivos-titulo">Tus objetivos diarios</h2>
        @if (objetivos().manuales) {
          <ns-badge icon="pencil">Manuales</ns-badge>
        }
      </header>

      <div class="ns-tarjeta-objetivos__datos">
        <ns-ring
          [value]="objetivos().kcal"
          [max]="objetivos().kcal"
          [size]="96"
          color="kcal"
          unidad="kcal"
          etiqueta="Energía diaria"
        >
          <span class="ns-text-h4 ns-tnum">{{ formatear(objetivos().kcal) }}</span>
          <span class="ns-text-caption ns-text-secondary">kcal</span>
        </ns-ring>
        <dl class="ns-tarjeta-objetivos__macros">
          <div>
            <dt class="ns-text-protein">Proteína</dt>
            <dd class="ns-tnum">{{ formatear(objetivos().proteinaG) }} g</dd>
          </div>
          <div>
            <dt class="ns-text-carbs">Hidratos</dt>
            <dd class="ns-tnum">{{ formatear(objetivos().carbohidratosG) }} g</dd>
          </div>
          <div>
            <dt class="ns-text-fat">Grasa</dt>
            <dd class="ns-tnum">{{ formatear(objetivos().grasaG) }} g</dd>
          </div>
        </dl>
      </div>

      <ns-switch [ngModel]="interruptor()" (ngModelChange)="alCambiarInterruptor($event)" [disabled]="ocupado()">
        Fijar objetivos manualmente
      </ns-switch>
      <p class="ns-tarjeta-objetivos__ayuda">
        @if (objetivos().manuales) {
          No se recalculan cuando cambias tu perfil o tu peso.
        } @else {
          Se recalculan solos cuando cambias tu perfil o registras tu peso.
        }
      </p>

      <div class="ns-tarjeta-objetivos__acciones">
        @if (objetivos().manuales) {
          <button
            nsButton
            type="button"
            variant="secondary"
            fullWidth
            [loading]="ocupado()"
            (click)="volverAlCalculo()"
          >
            Volver al cálculo automático
          </button>
        }
        <button nsButton type="button" variant="secondary" icon="scale" fullWidth (click)="registrarPeso()">
          Registrar peso
        </button>
      </div>
    </section>
  `,
  styles: `
    .ns-tarjeta-objetivos {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
      padding: var(--ns-space-5);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface);
      box-shadow: var(--ns-shadow-xs);
    }
    .ns-tarjeta-objetivos__cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ns-space-2);
      h2 {
        margin: 0;
      }
    }
    .ns-tarjeta-objetivos__datos {
      display: flex;
      align-items: center;
      gap: var(--ns-space-5);
    }
    .ns-tarjeta-objetivos__macros {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--ns-space-2);
      margin: 0;
      div {
        display: flex;
        justify-content: space-between;
        gap: var(--ns-space-3);
      }
      dt {
        font-weight: 600;
      }
      dd {
        margin: 0;
        font-weight: 600;
      }
    }
    .ns-tarjeta-objetivos__ayuda {
      margin: calc(-1 * var(--ns-space-2)) 0 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-tarjeta-objetivos__acciones {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaObjetivosComponent {
  readonly objetivos = input.required<ObjetivosResponse>();
  /** Peso actual del perfil, para empezar el diálogo de pesaje desde él. */
  readonly pesoKg = input<number | null>(null);

  readonly objetivosCambiados = output<ObjetivosResponse>();
  readonly pesoRegistrado = output<PesoResponse>();

  private readonly perfil = inject(PerfilService);
  private readonly dialogos = inject(NsDialogService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);

  /** Estado visible del switch: sigue a `manuales` salvo mientras hay un diálogo abierto. */
  protected readonly interruptor = linkedSignal(() => this.objetivos().manuales);
  protected readonly ocupado = signal(false);
  protected readonly formatear = formatearNumero;

  protected alCambiarInterruptor(activar: boolean): void {
    this.interruptor.set(activar);
    if (activar) this.fijarManuales();
    else void this.volverAlCalculo();
  }

  private fijarManuales(): void {
    const ref = this.dialogos.open<ObjetivosManualesDialogComponent, ObjetivosResponse, ObjetivosResponse>(
      ObjetivosManualesDialogComponent,
      { titulo: 'Fijar objetivos manualmente', size: 'sm', data: this.objetivos() },
    );
    ref.closed.subscribe((respuesta) => {
      if (respuesta) {
        this.objetivosCambiados.emit(respuesta);
        this.toasts.exito('Objetivos fijados', 'Ya no se recalcularán al cambiar tu perfil.');
      }
      // Cancelado: el switch vuelve a su estado real.
      this.interruptor.set(respuesta?.manuales ?? this.objetivos().manuales);
    });
  }

  protected async volverAlCalculo(): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Volver al cálculo automático?',
      mensaje: 'Calcularemos tus objetivos con tu perfil actual y se perderán los que fijaste a mano.',
      textoConfirmar: 'Volver al cálculo',
    });
    if (!confirmado) {
      this.interruptor.set(this.objetivos().manuales);
      return;
    }
    this.ocupado.set(true);
    try {
      const respuesta = await firstValueFrom(this.perfil.volverAlCalculo());
      this.objetivosCambiados.emit(respuesta);
      this.toasts.exito('Objetivos recalculados', 'Vuelven a ajustarse a tu perfil.');
    } catch (e) {
      this.interruptor.set(this.objetivos().manuales);
      this.toasts.error('No hemos podido volver al cálculo automático', aApiError(e).detalle);
    } finally {
      this.ocupado.set(false);
    }
  }

  protected registrarPeso(): void {
    const ref = this.dialogos.open<RegistrarPesoDialogComponent, PesoResponse, DatosRegistrarPeso>(
      RegistrarPesoDialogComponent,
      { titulo: 'Registrar peso', size: 'sm', data: { pesoKg: this.pesoKg() } },
    );
    ref.closed.subscribe((pesaje) => {
      if (pesaje) this.pesoRegistrado.emit(pesaje);
    });
  }
}
