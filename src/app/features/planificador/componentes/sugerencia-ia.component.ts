import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import type { ComidaPlanificadaResponse, SugerenciaIaResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import { EsperaLimite } from '@core/util/espera-limite';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { formatearDelta } from '../planificador';
import { PlanificadorEditor } from '../planificador-editor';
import { PlanificadorStore } from '../planificador.store';

/** Preferencia para la IA: máx. 300 caracteres (SugerenciaIaRequest.preferencia). */
export const MAX_PREFERENCIA = 300;
export const MENSAJE_IA_NO_DISPONIBLE = 'La IA no está disponible ahora. Inténtalo de nuevo dentro de un rato.';

/**
 * "≈ +5,6 g de proteína y +30 kcal por ración" con los deltas que calcula el backend. null si no
 * hay ninguno.
 */
export function textoDeltas(s: Pick<SugerenciaIaResponse, 'deltaKcalRacion' | 'deltaProteinaRacion'>): string | null {
  const partes = [
    s.deltaProteinaRacion !== null ? `${formatearDelta(s.deltaProteinaRacion, 1)} g de proteína` : null,
    s.deltaKcalRacion !== null ? `${formatearDelta(s.deltaKcalRacion)} kcal` : null,
  ].filter((p): p is string => !!p);
  return partes.length ? `≈ ${partes.join(' y ')} por ración` : null;
}

type Aviso = { tipo: 'email' } | { tipo: 'error'; mensaje: string };

/**
 * Sugerencia de la IA para una comida planificada (DESIGN.md §7.23, docs/api/menus.md §7.5):
 * tarjeta `ai` con el badge "Sugerencia IA".
 *
 * - "¿Qué prefieres?" (opcional, máx. 300) → POST …/sugerencia-ia. La IA propone un ajuste de
 *   cantidad o una sustitución de ingrediente; el backend lo valida y calcula las cifras (deltas
 *   por ración), así que se muestran como calculadas por NutriSport.
 * - Si `valida`: "Aplicar" (POST …/aplicar { sugerenciaId }: el menú devuelto sustituye al del
 *   store) y "Descartar". Si no, el texto explica el motivo.
 * - Requiere email verificado: 403 EMAIL_NO_VERIFICADO → aviso con "Reenviar". 503 → "La IA no está
 *   disponible ahora".
 *
 * Emite `cerrar` al aplicar la sugerencia.
 */
@Component({
  selector: 'app-sugerencia-ia',
  imports: [
    FormsModule,
    NS_CARD,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsDisclaimerComponent,
    NsFormFieldComponent,
    NsInputDirective,
  ],
  template: `
    <ns-card variant="ai">
      <h3 nsCardTitulo><ns-badge variant="ai" icon="sparkles">Sugerencia IA</ns-badge></h3>
      <p nsCardSubtitulo>para {{ comida().receta.nombre }}</p>

      <div class="ns-sug">
        @if (aviso(); as aviso) {
          @if (aviso.tipo === 'email') {
            <ns-alert type="warning" titulo="Verifica tu email">
              Las sugerencias de la IA solo están disponibles con el email verificado.
              @if (espera.mensaje(); as mensaje) {
                {{ mensaje }}
              }
              <button
                nsAlertAcciones
                nsButton
                type="button"
                variant="secondary"
                size="sm"
                icon="mail-check"
                [loading]="reenviando()"
                [disabled]="espera.activa()"
                (click)="reenviarCorreo()"
              >
                Reenviar
              </button>
            </ns-alert>
          } @else {
            <ns-alert type="error">{{ aviso.mensaje }}</ns-alert>
          }
        }

        @if (sugerencia(); as s) {
          @if (s.valida) {
            <p class="ns-sug__texto">{{ s.texto }}</p>
            @if (deltas(); as deltas) {
              <p class="ns-sug__cifras">
                Calculado por NutriSport con el catálogo: <strong>{{ deltas }}</strong>
              </p>
            }
            <div class="ns-sug__acciones">
              <button nsButton type="button" icon="check" [loading]="aplicando()" (click)="aplicar(s)">Aplicar</button>
              <button nsButton type="button" variant="ghost" [disabled]="aplicando()" (click)="descartar()">
                Descartar
              </button>
            </div>
          } @else {
            <ns-alert type="warning" titulo="No se puede aplicar esta sugerencia">{{ s.texto }}</ns-alert>
            <div class="ns-sug__acciones">
              <button nsButton type="button" variant="secondary" (click)="descartar()">Pedir otra</button>
            </div>
          }
        } @else {
          <form class="ns-sug__form" (ngSubmit)="pedir()" novalidate>
            <ns-form-field label="¿Qué prefieres?" hint="Opcional. Por ejemplo: «más proteína» o «sin lácteos».">
              <textarea
                nsInput
                name="preferencia"
                rows="2"
                [maxlength]="maxPreferencia"
                [ngModel]="preferencia()"
                (ngModelChange)="preferencia.set($event)"
              ></textarea>
            </ns-form-field>
            <button
              nsButton
              type="submit"
              variant="ai"
              icon="sparkles"
              [loading]="pidiendo()"
              [disabled]="aviso()?.tipo === 'email'"
            >
              Pedir sugerencia
            </button>
          </form>
        }

        <ns-disclaimer context="menu" />
      </div>
    </ns-card>
  `,
  styles: `
    .ns-sug,
    .ns-sug__form {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-sug__form > [nsButton] {
      align-self: flex-start;
    }
    .ns-sug__texto {
      margin: 0;
      white-space: pre-line;
    }
    .ns-sug__cifras {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-sug__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SugerenciaIaComponent {
  readonly comida = input.required<ComidaPlanificadaResponse>();
  /** Se ha aplicado la sugerencia (quien lo contiene puede cerrarse). */
  readonly cerrar = output<void>();

  private readonly editor = inject(PlanificadorEditor);
  private readonly store = inject(PlanificadorStore);
  private readonly menusService = inject(MenusService);
  private readonly auth = inject(AuthService);
  private readonly cuenta = inject(CuentaService);
  private readonly toasts = inject(NsToastService);

  protected readonly maxPreferencia = MAX_PREFERENCIA;
  protected readonly preferencia = signal('');
  protected readonly sugerencia = signal<SugerenciaIaResponse | null>(null);
  protected readonly pidiendo = signal(false);
  protected readonly aplicando = signal(false);
  protected readonly reenviando = signal(false);
  protected readonly espera = new EsperaLimite();
  /** Sin email verificado se avisa desde el principio (además de al recibir un 403). */
  protected readonly aviso = signal<Aviso | null>(
    this.auth.cuenta() && !this.auth.emailVerificado() ? { tipo: 'email' } : null,
  );

  protected readonly deltas = computed(() => {
    const s = this.sugerencia();
    return s ? textoDeltas(s) : null;
  });

  protected pedir(): void {
    const menuId = this.store.menu()?.id;
    if (!menuId || this.pidiendo()) return;
    const preferencia = this.preferencia().trim().slice(0, MAX_PREFERENCIA);
    this.pidiendo.set(true);
    this.aviso.set(null);
    this.menusService.sugerenciaIa(menuId, this.comida().id, preferencia ? { preferencia } : {}).subscribe({
      next: (s) => {
        this.pidiendo.set(false);
        this.sugerencia.set(s);
      },
      error: (e: unknown) => {
        this.pidiendo.set(false);
        const error = aApiError(e);
        if (error.esCodigo('EMAIL_NO_VERIFICADO') || (error.status === 403 && !this.auth.emailVerificado())) {
          this.aviso.set({ tipo: 'email' });
          // La cuenta en memoria podía decir lo contrario: se recarga.
          this.cuenta.obtener().subscribe({ error: () => undefined });
        } else if (error.status === 503) {
          this.aviso.set({ tipo: 'error', mensaje: MENSAJE_IA_NO_DISPONIBLE });
        } else {
          this.aviso.set({ tipo: 'error', mensaje: error.detalle });
        }
      },
    });
  }

  protected async aplicar(s: SugerenciaIaResponse): Promise<void> {
    if (this.aplicando()) return;
    this.aplicando.set(true);
    const ok = await this.editor.aplicarSugerencia(this.comida(), s.id);
    this.aplicando.set(false);
    if (ok) this.cerrar.emit();
    // Si falla, el editor ya avisa y recarga el menú; se puede pedir otra.
    else this.sugerencia.set(null);
  }

  protected descartar(): void {
    this.sugerencia.set(null);
  }

  protected async reenviarCorreo(): Promise<void> {
    const email = this.auth.cuenta()?.email;
    if (!email || this.reenviando() || this.espera.activa()) return;
    this.reenviando.set(true);
    this.espera.limpiar();
    try {
      await firstValueFrom(this.auth.reenviarVerificacion(email));
      this.toasts.exito('Correo reenviado', `Revisa la bandeja de ${email}. El enlace caduca en 24 horas.`);
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 429) this.espera.iniciar(error.retryAfterSegundos);
      else this.toasts.error('No hemos podido reenviar el correo', error.detalle);
    } finally {
      this.reenviando.set(false);
    }
  }
}

export interface SugerenciaIaData {
  comida: ComidaPlanificadaResponse;
}

/** Diálogo (bottom sheet en móvil) con la tarjeta de sugerencia; se cierra al aplicarla. */
@Component({
  selector: 'app-sugerencia-ia-dialog',
  imports: [DialogShellComponent, SugerenciaIaComponent],
  template: `
    <ns-dialog-shell>
      <app-sugerencia-ia [comida]="comida" (cerrar)="ref.close()" />
    </ns-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SugerenciaIaDialogComponent {
  protected readonly ref = inject(DialogRef);
  protected readonly comida = inject<SugerenciaIaData>(DIALOG_DATA).comida;
}
