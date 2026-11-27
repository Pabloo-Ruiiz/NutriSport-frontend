import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsToastService } from '../feedback/toast.service';
import { bloquesChat } from './texto-chat';

export type NsRolChat = 'USUARIO' | 'ASISTENTE';
export type NsEstadoChat = 'enviado' | 'pendiente' | 'error';

/**
 * Mensaje de chat (DESIGN.md §7.15, `ns-chat-message`).
 *
 *   <ns-chat-message rol="ASISTENTE" [contenido]="m.contenido" [datosConsultados]="['Comidas']"
 *                    [valoracion]="m.valoracion" hora="16:42" (valorar)="…" />
 *
 * - Usuario: burbuja a la derecha en ink-950 con texto blanco. Asistente: a la izquierda en surface
 *   con borde y radio 2xl, con el avatar de la IA.
 * - El texto se pinta con bloquesChat (párrafos, saltos de línea, listas y negritas), nunca con
 *   innerHTML: el HTML que pudiera traer el modelo se ve como texto.
 * - Asistente: chips "Datos consultados", y Copiar, 👍 y 👎 (aria-pressed según `valoracion`).
 * - Usuario con `estado` 'error': el texto del error y "Reintentar"; 'pendiente': "Enviando…".
 */
@Component({
  selector: 'ns-chat-message',
  imports: [LucideDynamicIcon],
  template: `
    @if (rol() === 'ASISTENTE') {
      <span class="ns-chat-msg__avatar" aria-hidden="true">
        <svg lucideIcon="sparkles" [size]="18"></svg>
      </span>
    }
    <div class="ns-chat-msg__columna">
      <div class="ns-chat-msg__burbuja">
        <span class="ns-sr-only">{{ rol() === 'ASISTENTE' ? 'Asistente:' : 'Tú:' }}</span>
        @if (datosConsultados().length) {
          <p class="ns-chat-msg__datos">
            <span class="ns-sr-only">Datos consultados:</span>
            @for (d of datosConsultados(); track d) {
              <span class="ns-chat-msg__chip">{{ d }}</span>
            }
          </p>
        }
        @for (b of bloques(); track $index) {
          @if (b.tipo === 'parrafo') {
            <p class="ns-chat-msg__parrafo">
              @for (linea of b.lineas; track $index; let ultima = $last) {
                @for (s of linea; track $index) {
                  @if (s.negrita) {
                    <strong>{{ s.texto }}</strong>
                  } @else {
                    {{ s.texto }}
                  }
                }
                @if (!ultima) {
                  <br />
                }
              }
            </p>
          } @else if (b.ordenada) {
            <ol class="ns-chat-msg__lista">
              @for (elemento of b.elementos; track $index) {
                <li>
                  @for (s of elemento; track $index) {
                    @if (s.negrita) {
                      <strong>{{ s.texto }}</strong>
                    } @else {
                      {{ s.texto }}
                    }
                  }
                </li>
              }
            </ol>
          } @else {
            <ul class="ns-chat-msg__lista">
              @for (elemento of b.elementos; track $index) {
                <li>
                  @for (s of elemento; track $index) {
                    @if (s.negrita) {
                      <strong>{{ s.texto }}</strong>
                    } @else {
                      {{ s.texto }}
                    }
                  }
                </li>
              }
            </ul>
          }
        }
      </div>

      <div class="ns-chat-msg__pie">
        @if (estado() === 'pendiente') {
          <span>Enviando…</span>
        } @else if (estado() === 'error') {
          <span class="ns-chat-msg__error" role="alert">
            <svg lucideIcon="circle-exclamation-point" [size]="14" aria-hidden="true"></svg>
            {{ error() || 'No se ha podido enviar.' }}
          </span>
          @if (reintentable()) {
            <button type="button" class="ns-chat-msg__accion ns-chat-msg__accion--texto" (click)="reintentar.emit()">
              <svg lucideIcon="refresh-cw" [size]="14" aria-hidden="true"></svg>
              Reintentar
            </button>
          }
        } @else {
          @if (hora()) {
            <span>{{ hora() }}</span>
          }
          @if (rol() === 'ASISTENTE') {
            <button type="button" class="ns-chat-msg__accion" aria-label="Copiar respuesta" (click)="copiar()">
              <svg lucideIcon="copy" [size]="16" aria-hidden="true"></svg>
            </button>
            @if (valorable()) {
              <button
                type="button"
                class="ns-chat-msg__accion"
                aria-label="Respuesta útil"
                [attr.aria-pressed]="valoracion() === 1"
                (click)="valorar.emit(1)"
              >
                <svg lucideIcon="thumbs-up" [size]="16" aria-hidden="true"></svg>
              </button>
              <button
                type="button"
                class="ns-chat-msg__accion"
                aria-label="Respuesta no útil"
                [attr.aria-pressed]="valoracion() === -1"
                (click)="valorar.emit(-1)"
              >
                <svg lucideIcon="thumbs-down" [size]="16" aria-hidden="true"></svg>
              </button>
            }
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      gap: var(--ns-space-3);
      align-items: flex-start;
      max-width: 100%;
    }
    :host(.ns-chat-msg--usuario) {
      justify-content: flex-end;
    }
    .ns-chat-msg__avatar {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--ns-radius-full);
      background: var(--ns-gradient-ai);
      color: var(--ns-text-inverse);
    }
    .ns-chat-msg__columna {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
      min-width: 0;
      max-width: min(640px, 85%);
    }
    :host(.ns-chat-msg--usuario) .ns-chat-msg__columna {
      align-items: flex-end;
    }
    .ns-chat-msg__burbuja {
      padding: var(--ns-space-3) var(--ns-space-4);
      border-radius: var(--ns-radius-2xl);
      font: 400 1rem/1.5rem var(--ns-font-body);
      overflow-wrap: anywhere;
    }
    :host(.ns-chat-msg--usuario) .ns-chat-msg__burbuja {
      background: var(--ns-ink-950);
      color: var(--ns-text-inverse);
    }
    :host(.ns-chat-msg--asistente) .ns-chat-msg__burbuja {
      border: 1px solid var(--ns-border);
      background: var(--ns-surface);
      color: var(--ns-text);
    }
    :host(.ns-chat-msg--pendiente) .ns-chat-msg__burbuja {
      opacity: 0.7;
    }
    :host(.ns-chat-msg--error) .ns-chat-msg__burbuja {
      outline: 2px solid var(--ns-error);
      outline-offset: 1px;
    }
    .ns-chat-msg__parrafo,
    .ns-chat-msg__lista,
    .ns-chat-msg__datos {
      margin: 0;
    }
    .ns-chat-msg__burbuja > * + * {
      margin-top: var(--ns-space-3);
    }
    .ns-chat-msg__lista {
      padding-left: var(--ns-space-6);
    }
    .ns-chat-msg__datos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
    }
    .ns-chat-msg__chip {
      display: inline-flex;
      align-items: center;
      padding: 2px var(--ns-space-2);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-full);
      background: var(--ns-surface-muted);
      color: var(--ns-text-secondary);
      font: 500 0.75rem/1.25rem var(--ns-font-body);
    }
    .ns-chat-msg__pie {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      align-items: center;
      min-height: 28px;
      color: var(--ns-text-tertiary);
      font: 500 0.75rem/1rem var(--ns-font-body);
    }
    .ns-chat-msg__error {
      display: inline-flex;
      gap: var(--ns-space-1);
      align-items: center;
      color: var(--ns-error);
    }
    .ns-chat-msg__accion {
      display: inline-flex;
      gap: var(--ns-space-1);
      align-items: center;
      justify-content: center;
      min-width: 28px;
      min-height: 28px;
      padding: 0 var(--ns-space-1);
      border: 0;
      border-radius: var(--ns-radius-sm);
      background: transparent;
      color: var(--ns-text-tertiary);
      font: inherit;
      cursor: pointer;
      &:hover {
        background: var(--ns-surface-muted);
        color: var(--ns-text);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 1px;
      }
      &[aria-pressed='true'] {
        color: var(--ns-ai-600);
      }
    }
    .ns-chat-msg__accion--texto {
      color: var(--ns-text-link);
      font-weight: 600;
    }
  `,
  host: {
    '[class]': 'clases()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsChatMessageComponent {
  private readonly toasts = inject(NsToastService);

  readonly rol = input.required<NsRolChat>();
  readonly contenido = input.required<string>();
  /** Herramientas que consultó el asistente, ya traducidas a texto ("Comidas", "Resumen del día"). */
  readonly datosConsultados = input<readonly string[]>([]);
  readonly valoracion = input<1 | -1 | null>(null);
  /** Hora ya formateada ("16:42"). */
  readonly hora = input<string | null>(null);
  readonly estado = input<NsEstadoChat>('enviado');
  readonly error = input<string | null>(null);
  /** Si se muestra "Reintentar" con el error. */
  readonly reintentable = input(true);
  /** Si se muestran 👍/👎 (solo respuestas guardadas del asistente). */
  readonly valorable = input(true);

  readonly valorar = output<1 | -1>();
  readonly reintentar = output<void>();

  protected readonly bloques = computed(() => bloquesChat(this.contenido()));
  protected readonly clases = computed(
    () =>
      `ns-chat-msg ns-chat-msg--${this.rol() === 'USUARIO' ? 'usuario' : 'asistente'} ns-chat-msg--${this.estado()}`,
  );

  protected async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.contenido());
      this.toasts.exito('Respuesta copiada');
    } catch {
      this.toasts.error('No se ha podido copiar', 'Selecciona el texto y cópialo a mano.');
    }
  }
}
