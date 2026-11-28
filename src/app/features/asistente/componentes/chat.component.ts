import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';

import { AsistenteService, MAX_CARACTERES_MENSAJE } from '@core/services/asistente.service';
import { AuthService } from '@core/services/auth.service';
import { aApiError } from '@core/util/api-error';
import { EsperaLimite } from '@core/util/espera-limite';
import { formatearFecha } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsChatComposerComponent } from '@shared/ui/chat/chat-composer.component';
import { NsChatMessageComponent } from '@shared/ui/chat/chat-message.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { datosConsultados, tituloConversacion } from '../asistente';
import { AsistenteStore, LIMITE_MENSAJES_DIA, type MensajeVista } from '../asistente.store';

/**
 * Conversación con el asistente (DESIGN.md §7.15, columna central): cabecera con el avatar IA,
 * mensajes, "Escribiendo…" mientras se espera la respuesta, compositor y aviso orientativo.
 *
 * - Accesibilidad (§10): la respuesta completa se anuncia en una región aria-live="polite" (no los
 *   mensajes del historial al abrir una conversación) y el scroll baja al último mensaje.
 * - 403 EMAIL_NO_VERIFICADO (o la cuenta sin verificar): compositor desactivado con "Verifica tu
 *   email" y "Reenviar". 429: "Has llegado al límite de 50 mensajes de hoy" con la espera, y el
 *   compositor desactivado mientras dure. 503: el mensaje queda con "Reintentar".
 * - En una conversación vacía, las preguntas de GET /asistente/sugerencias como chips.
 */
@Component({
  selector: 'app-chat',
  imports: [
    LucideDynamicIcon,
    NsAlertComponent,
    NsButtonComponent,
    NsChatComposerComponent,
    NsChatMessageComponent,
    NsDisclaimerComponent,
    NsSkeletonComponent,
  ],
  template: `
    <header class="ns-chat__cabecera">
      @if (botonLista()) {
        <button type="button" class="ns-chat__icono-boton" aria-label="Ver conversaciones" (click)="abrirLista.emit()">
          <svg lucideIcon="message-square" [size]="20" aria-hidden="true"></svg>
        </button>
      }
      <span class="ns-chat__avatar" aria-hidden="true"><svg lucideIcon="sparkles" [size]="20"></svg></span>
      <div class="ns-chat__nombre">
        <h2 class="ns-chat__titulo">Asistente NutriSport</h2>
        <p class="ns-chat__estado" [class.ns-chat__estado--escribiendo]="store.enviando()">
          @if (store.enviando()) {
            Escribiendo…
          } @else {
            <span class="ns-chat__punto" aria-hidden="true"></span>
            Conectado a tus datos · {{ titulo() }}
          }
        </p>
      </div>
      @if (botonContexto()) {
        <button
          type="button"
          class="ns-chat__icono-boton"
          aria-label="Ver el contexto de hoy"
          (click)="abrirContexto.emit()"
        >
          <svg lucideIcon="info" [size]="20" aria-hidden="true"></svg>
        </button>
      }
    </header>

    <div class="ns-chat__mensajes" #mensajes tabindex="0" role="region" aria-label="Mensajes de la conversación">
      @if (store.cargando()) {
        <div class="ns-chat__cargando" aria-busy="true" aria-label="Cargando la conversación">
          <ns-skeleton shape="rect" height="64px" width="70%" />
          <ns-skeleton shape="rect" height="120px" width="80%" />
        </div>
      } @else if (store.error() && store.vacia()) {
        <ns-alert type="error" titulo="No hemos podido cargar la conversación">{{ store.error() }}</ns-alert>
      } @else if (store.vacia()) {
        <div class="ns-chat__bienvenida">
          <span class="ns-chat__avatar ns-chat__avatar--grande" aria-hidden="true">
            <svg lucideIcon="sparkles" [size]="28"></svg>
          </span>
          <p class="ns-chat__bienvenida-titulo">¿En qué te ayudo hoy?</p>
          <p class="ns-chat__bienvenida-texto">
            Pregunta sobre tus comidas, tu plan o tu progreso: consulto tus datos para responder.
          </p>
        </div>
      } @else {
        <ol class="ns-chat__lista" role="list">
          @for (m of store.mensajes(); track m.id) {
            <li>
              <ns-chat-message
                [rol]="m.rol === 'USUARIO' ? 'USUARIO' : 'ASISTENTE'"
                [contenido]="m.contenido"
                [datosConsultados]="datos(m)"
                [valoracion]="m.valoracion"
                [hora]="hora(m)"
                [estado]="m.estado"
                [error]="m.error"
                [reintentable]="!bloqueadoPorEmail()"
                (valorar)="valorar(m, $event)"
                (reintentar)="store.reintentar(m.id)"
              />
            </li>
          }
        </ol>
        @if (store.enviando()) {
          <p class="ns-chat__escribiendo" aria-hidden="true">
            <span class="ns-chat__puntos"><span></span><span></span><span></span></span>
            Escribiendo…
          </p>
        }
      }
    </div>

    <!-- Siempre en el DOM: una región aria-live solo se anuncia si ya existía antes del cambio. -->
    <p class="ns-sr-only" aria-live="polite">{{ anuncio() }}</p>

    <div class="ns-chat__pie">
      @if (bloqueadoPorEmail()) {
        <ns-alert type="warning" titulo="Verifica tu email">
          El asistente solo está disponible con el email verificado.
          @if (esperaCorreo.mensaje(); as mensaje) {
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
            [disabled]="esperaCorreo.activa()"
            (click)="reenviarCorreo()"
          >
            Reenviar
          </button>
        </ns-alert>
      } @else if (esperaLimite.mensaje(); as mensaje) {
        <ns-alert type="warning" [titulo]="'Has llegado al límite de ' + limite + ' mensajes de hoy'">
          {{ mensaje }}
        </ns-alert>
      }
      <ns-chat-composer
        [(texto)]="borrador"
        [sugerencias]="sugerencias()"
        [enviando]="store.enviando()"
        [deshabilitado]="bloqueadoPorEmail() || esperaLimite.activa()"
        [max]="max"
        (enviar)="enviar($event)"
      />
      <ns-disclaimer context="asistente" />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    p,
    h2 {
      margin: 0;
    }
    .ns-chat__cabecera {
      display: flex;
      gap: var(--ns-space-3);
      align-items: center;
      padding: var(--ns-space-3) var(--ns-space-4);
      border-bottom: 1px solid var(--ns-border);
    }
    .ns-chat__avatar {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--ns-radius-lg);
      background: var(--ns-gradient-ai);
      color: var(--ns-text-inverse);
    }
    .ns-chat__avatar--grande {
      width: 56px;
      height: 56px;
      border-radius: var(--ns-radius-xl);
    }
    .ns-chat__nombre {
      flex: 1;
      min-width: 0;
    }
    .ns-chat__titulo {
      color: var(--ns-text);
      font: 600 1rem/1.5rem var(--ns-font-display);
    }
    .ns-chat__estado {
      display: flex;
      gap: var(--ns-space-1);
      align-items: center;
      overflow: hidden;
      color: var(--ns-success);
      font: 500 0.75rem/1rem var(--ns-font-body);
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ns-chat__estado--escribiendo {
      color: var(--ns-accent);
    }
    .ns-chat__punto {
      flex: none;
      width: 6px;
      height: 6px;
      border-radius: var(--ns-radius-full);
      background: var(--ns-success);
    }
    .ns-chat__icono-boton {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: var(--ns-radius-md);
      background: transparent;
      color: var(--ns-text-secondary);
      cursor: pointer;
      &:hover {
        background: var(--ns-surface-muted);
        color: var(--ns-text);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 1px;
      }
    }
    .ns-chat__mensajes {
      flex: 1;
      min-height: 0;
      padding: var(--ns-space-4);
      overflow-y: auto;
      overscroll-behavior: contain;
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: -2px;
      }
    }
    .ns-chat__lista {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-chat__cargando {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-chat__bienvenida {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: var(--ns-space-6);
      text-align: center;
    }
    .ns-chat__bienvenida-titulo {
      color: var(--ns-text);
      font: 600 1.25rem/1.75rem var(--ns-font-display);
    }
    .ns-chat__bienvenida-texto {
      max-width: 420px;
      color: var(--ns-text-secondary);
    }
    .ns-chat__escribiendo {
      display: flex;
      gap: var(--ns-space-2);
      align-items: center;
      margin-top: var(--ns-space-3);
      padding-left: calc(32px + var(--ns-space-3));
      color: var(--ns-accent);
      font: 500 0.8125rem/1.25rem var(--ns-font-body);
    }
    .ns-chat__puntos {
      display: inline-flex;
      gap: 3px;
      span {
        width: 6px;
        height: 6px;
        border-radius: var(--ns-radius-full);
        background: currentColor;
        animation: ns-chat-punto 1.2s infinite ease-in-out;
      }
      span:nth-child(2) {
        animation-delay: 0.15s;
      }
      span:nth-child(3) {
        animation-delay: 0.3s;
      }
    }
    @keyframes ns-chat-punto {
      0%,
      80%,
      100% {
        opacity: 0.3;
      }
      40% {
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ns-chat__puntos span {
        animation: none;
      }
    }
    .ns-chat__pie {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      padding: var(--ns-space-3) var(--ns-space-4) max(var(--ns-space-3), env(safe-area-inset-bottom));
      border-top: 1px solid var(--ns-border);
      background: var(--ns-surface);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  protected readonly store = inject(AsistenteStore);
  private readonly asistente = inject(AsistenteService);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(NsToastService);

  /** Texto del compositor (p. ej. el borrador de "Preguntar al asistente"). */
  readonly borrador = model('');
  /** Conversación nueva (/asistente, sin :id): solo entonces se piden las sugerencias. */
  readonly nueva = input(false);
  /** Muestra el botón de la lista de conversaciones (cuando va en un drawer). */
  readonly botonLista = input(false);
  /** Muestra el botón info del panel de contexto (por debajo de xl). */
  readonly botonContexto = input(false);
  readonly abrirLista = output<void>();
  readonly abrirContexto = output<void>();

  protected readonly max = MAX_CARACTERES_MENSAJE;
  protected readonly limite = LIMITE_MENSAJES_DIA;
  protected readonly esperaLimite = new EsperaLimite();
  protected readonly esperaCorreo = new EsperaLimite();
  protected readonly reenviando = signal(false);
  /** Texto de la región aria-live: la respuesta completa del asistente al llegar. */
  protected readonly anuncio = signal('');

  private readonly contenedor = viewChild<ElementRef<HTMLElement>>('mensajes');

  protected readonly titulo = computed(() => tituloConversacion(this.store.titulo()));
  protected readonly bloqueadoPorEmail = computed(
    () => this.store.bloqueo()?.tipo === 'email' || this.auth.cuenta()?.emailVerificado === false,
  );

  /** Sugerencias solo en una conversación nueva y vacía (se piden una vez). */
  private readonly peticionSugerencias = rxResource({
    params: () => (this.nueva() && this.store.vacia() ? true : undefined),
    stream: () => this.asistente.sugerencias(),
  });
  protected readonly sugerencias = computed(() =>
    this.store.vacia() && this.peticionSugerencias.hasValue() ? this.peticionSugerencias.value() : [],
  );

  constructor() {
    // Al terminar un envío: anuncia la respuesta (o el error) y lleva el bloqueo a la espera del 429.
    let estabaEnviando = false;
    effect(() => {
      const enviando = this.store.enviando();
      untracked(() => {
        if (estabaEnviando && !enviando) {
          const ultimo = this.store.mensajes().at(-1);
          if (ultimo?.rol === 'ASISTENTE') {
            this.anuncio.set(`El asistente responde: ${ultimo.contenido}`);
            this.esperaLimite.limpiar();
          } else if (ultimo?.estado === 'error') {
            this.anuncio.set(`No se ha podido enviar el mensaje. ${ultimo.error ?? ''}`.trim());
          }
          const bloqueo = this.store.bloqueo();
          if (bloqueo?.tipo === 'limite') this.esperaLimite.iniciar(bloqueo.retryAfterSegundos);
        }
        estabaEnviando = enviando;
      });
    });

    // Scroll al último mensaje cuando llegan mensajes o aparece "Escribiendo…".
    afterRenderEffect(() => {
      this.store.mensajes().length;
      this.store.enviando();
      const el = this.contenedor()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  protected enviar(texto: string): void {
    void this.store.enviar(texto);
  }

  protected datos(m: MensajeVista): string[] {
    return m.rol === 'ASISTENTE' ? datosConsultados(m.herramientasUsadas) : [];
  }

  protected hora(m: MensajeVista): string | null {
    return m.estado === 'enviado' ? formatearFecha(m.creadoEn, 'hora') : null;
  }

  protected async valorar(m: MensajeVista, valor: 1 | -1): Promise<void> {
    try {
      await this.store.valorar(m.id, valor);
    } catch (e) {
      this.toasts.error('No hemos podido guardar tu valoración', aApiError(e).detalle);
    }
  }

  protected async reenviarCorreo(): Promise<void> {
    const email = this.auth.cuenta()?.email;
    if (!email || this.reenviando() || this.esperaCorreo.activa()) return;
    this.reenviando.set(true);
    this.esperaCorreo.limpiar();
    try {
      await firstValueFrom(this.auth.reenviarVerificacion(email));
      this.toasts.exito('Correo reenviado', `Revisa la bandeja de ${email}. El enlace caduca en 24 horas.`);
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 429) this.esperaCorreo.iniciar(error.retryAfterSegundos);
      else this.toasts.error('No hemos podido reenviar el correo', error.detalle);
    } finally {
      this.reenviando.set(false);
    }
  }
}
