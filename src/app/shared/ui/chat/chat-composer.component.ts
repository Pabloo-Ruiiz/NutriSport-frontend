import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  afterRenderEffect,
  computed,
  input,
  model,
  numberAttribute,
  output,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { idUnico } from '../form/control-campo';

/** Alto máximo del campo antes de hacer scroll (px). */
const ALTO_MAXIMO = 200;

/**
 * Compositor de chat (DESIGN.md §7.15, `ns-chat-composer`): chips de sugerencias, campo multilínea
 * que crece con el texto (hasta 200 px), contador de caracteres y botón enviar.
 *
 *   <ns-chat-composer [(texto)]="borrador" [sugerencias]="sugerencias()" [enviando]="enviando()"
 *                     (enviar)="enviar($event)" />
 *
 * - Enter envía; Mayús+Enter salta de línea (y Enter mientras se compone un carácter con IME no envía).
 * - Al pulsar una sugerencia se envía directamente.
 * - Con `deshabilitado` no se puede escribir ni enviar (p. ej. email sin verificar).
 * - Al enviar vacía el campo; quien lo usa decide qué hacer con el texto emitido.
 */
@Component({
  selector: 'ns-chat-composer',
  imports: [LucideDynamicIcon],
  template: `
    @if (sugerencias().length && !texto() && !deshabilitado()) {
      <ul class="ns-composer__sugerencias" role="list" aria-label="Preguntas sugeridas">
        @for (s of sugerencias(); track s) {
          <li>
            <button type="button" class="ns-composer__chip" [disabled]="enviando()" (click)="enviarSugerencia(s)">
              <svg lucideIcon="sparkles" [size]="14" aria-hidden="true"></svg>
              {{ s }}
            </button>
          </li>
        }
      </ul>
    }
    <div class="ns-composer__caja" [class.ns-composer__caja--deshabilitada]="deshabilitado()">
      <label class="ns-sr-only" [for]="idCampo">{{ etiqueta() }}</label>
      <textarea
        #campo
        class="ns-composer__campo"
        rows="1"
        [id]="idCampo"
        [attr.maxlength]="max()"
        [placeholder]="placeholder()"
        [disabled]="deshabilitado()"
        [value]="texto()"
        [attr.aria-describedby]="idContador"
        (input)="escribir($event)"
        (keydown.enter)="alPulsarEnter($event)"
      ></textarea>
      <button
        type="button"
        class="ns-composer__enviar"
        aria-label="Enviar mensaje"
        [disabled]="!puedeEnviar()"
        (click)="enviarTexto()"
      >
        <svg lucideIcon="send" [size]="20" aria-hidden="true"></svg>
      </button>
    </div>
    <p class="ns-composer__contador" [id]="idContador" [class.ns-composer__contador--limite]="cerca()">
      <span class="ns-sr-only">Caracteres: </span>{{ longitud() }} / {{ max() }}
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
    }
    .ns-composer__sugerencias {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-composer__chip {
      display: inline-flex;
      gap: var(--ns-space-1);
      align-items: center;
      min-height: 36px;
      padding: 0 var(--ns-space-3);
      border: 1px solid var(--ns-accent);
      border-radius: var(--ns-radius-full);
      background: var(--ns-surface);
      color: var(--ns-accent);
      font: 500 0.875rem/1.25rem var(--ns-font-body);
      cursor: pointer;
      &:hover:not(:disabled) {
        background: var(--ns-ai-bg);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
      &:disabled {
        opacity: 0.6;
        cursor: default;
      }
    }
    .ns-composer__caja {
      display: flex;
      gap: var(--ns-space-2);
      align-items: flex-end;
      padding: var(--ns-space-2) var(--ns-space-2) var(--ns-space-2) var(--ns-space-4);
      border: 1px solid var(--ns-border-input);
      border-radius: var(--ns-radius-xl);
      background: var(--ns-surface);
      &:focus-within {
        border-color: var(--ns-accent);
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 1px;
      }
    }
    .ns-composer__caja--deshabilitada {
      background: var(--ns-surface-muted);
    }
    .ns-composer__campo {
      flex: 1;
      min-width: 0;
      max-height: 200px; // ALTO_MAXIMO
      padding: var(--ns-space-2) 0;
      border: 0;
      background: transparent;
      color: var(--ns-text);
      font: 400 1rem/1.5rem var(--ns-font-body);
      resize: none;
      &:focus {
        outline: none;
      }
      &::placeholder {
        color: var(--ns-text-tertiary);
      }
    }
    .ns-composer__enviar {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: var(--ns-radius-lg);
      background: var(--ns-accent);
      color: var(--ns-text-inverse);
      cursor: pointer;
      &:hover:not(:disabled) {
        background: var(--ns-accent);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
      &:disabled {
        background: var(--ns-border-strong);
        cursor: default;
      }
    }
    .ns-composer__contador {
      align-self: flex-end;
      margin: 0;
      color: var(--ns-text-tertiary);
      font: 500 0.75rem/1rem var(--ns-font-body);
      font-variant-numeric: tabular-nums;
    }
    .ns-composer__contador--limite {
      color: var(--ns-warning);
    }
  `,
  host: { class: 'ns-composer' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsChatComposerComponent {
  /** Texto del campo (con [(texto)] para dejar un borrador). */
  readonly texto = model('');
  readonly sugerencias = input<readonly string[]>([]);
  readonly enviando = input(false, { transform: booleanAttribute });
  readonly deshabilitado = input(false, { transform: booleanAttribute });
  readonly max = input(2000, { transform: numberAttribute });
  readonly placeholder = input('Pregunta sobre tus comidas, tu plan o tu progreso…');
  readonly etiqueta = input('Mensaje para el asistente');
  readonly enviar = output<string>();

  protected readonly idCampo = idUnico('ns-composer');
  protected readonly idContador = idUnico('ns-composer-contador');
  private readonly campo = viewChild.required<ElementRef<HTMLTextAreaElement>>('campo');

  protected readonly longitud = computed(() => this.texto().length);
  protected readonly cerca = computed(() => this.longitud() > this.max() * 0.9);
  protected readonly puedeEnviar = computed(
    () => !this.deshabilitado() && !this.enviando() && !!this.texto().trim() && this.longitud() <= this.max(),
  );

  constructor() {
    // El alto sigue al texto, también cuando cambia desde fuera (borrador) o se vacía al enviar.
    afterRenderEffect(() => {
      this.texto();
      this.ajustarAlto();
    });
  }

  /** Pone el foco en el campo (p. ej. al abrir el chat con un borrador). */
  enfocar(): void {
    this.campo().nativeElement.focus();
  }

  protected escribir(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
  }

  protected alPulsarEnter(evento: Event): void {
    const tecla = evento as KeyboardEvent;
    if (tecla.shiftKey || tecla.isComposing) return;
    evento.preventDefault();
    this.enviarTexto();
  }

  protected enviarTexto(): void {
    if (!this.puedeEnviar()) return;
    this.enviar.emit(this.texto().trim());
    this.texto.set('');
  }

  protected enviarSugerencia(sugerencia: string): void {
    if (this.deshabilitado() || this.enviando()) return;
    this.enviar.emit(sugerencia);
  }

  private ajustarAlto(): void {
    const el = this.campo().nativeElement;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTO_MAXIMO)}px`;
  }
}
