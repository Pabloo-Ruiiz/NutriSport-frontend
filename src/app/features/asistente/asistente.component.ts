import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { LayoutService } from '@core/layout/layout.service';
import type { ConversacionResponse, ConversacionResumenResponse } from '@core/models';
import { AsistenteService } from '@core/services/asistente.service';
import { aApiError } from '@core/util/api-error';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import { tituloConversacion } from './asistente';
import { AsistenteStore } from './asistente.store';
import { ChatComponent } from './componentes/chat.component';
import { ListaConversacionesComponent } from './componentes/lista-conversaciones.component';
import { PanelContextoComponent } from './componentes/panel-contexto.component';
import {
  RenombrarConversacionDialogComponent,
  type RenombrarConversacionData,
} from './componentes/renombrar-conversacion-dialog.component';

/**
 * Asistente IA (/asistente y /asistente/:id, DESIGN.md §7.15): lista de conversaciones (280 px; en
 * drawer por debajo de lg), chat y contexto de hoy (300 px desde xl; en drawer con el botón info).
 *
 * - La URL lleva la conversación abierta. /asistente es una conversación nueva, que se crea en el
 *   servidor con el primer mensaje; entonces la URL pasa a /asistente/:id (sin nueva entrada en el
 *   historial).
 * - Si otra pantalla dejó un borrador (AsistenteService.dejarBorrador, p. ej. "Preguntar al
 *   asistente" de un insight), se abre una conversación nueva con ese texto en el compositor.
 */
@Component({
  selector: 'app-asistente',
  imports: [ChatComponent, ListaConversacionesComponent, NgTemplateOutlet, NsDrawerComponent, PanelContextoComponent],
  providers: [AsistenteStore],
  template: `
    <ng-template #lista>
      <app-lista-conversaciones
        [conversaciones]="store.conversaciones()"
        [activaId]="store.conversacion()?.id ?? null"
        [archivadas]="store.verArchivadas()"
        [cargando]="store.cargandoLista()"
        (nueva)="nueva()"
        (abrir)="abrir($event)"
        (cambiarPestana)="store.mostrarArchivadas($event)"
        (renombrar)="renombrar($event)"
        (archivar)="archivar($event)"
        (eliminar)="eliminar($event)"
      />
    </ng-template>

    @if (layout.esEscritorio()) {
      <aside class="ns-asis__lista" aria-label="Conversaciones">
        <ng-container [ngTemplateOutlet]="lista" />
      </aside>
    }

    <app-chat
      class="ns-asis__chat"
      [(borrador)]="borrador"
      [nueva]="!id()"
      [botonLista]="!layout.esEscritorio()"
      [botonContexto]="!layout.esXl()"
      (abrirLista)="listaAbierta.set(true)"
      (abrirContexto)="contextoAbierto.set(true)"
    />

    @if (layout.esXl()) {
      <aside class="ns-asis__contexto" aria-label="Contexto de hoy">
        <app-panel-contexto />
      </aside>
    } @else {
      <!-- El contenido solo existe abierto: así el panel no pide sus datos hasta que se consulta. -->
      <ns-drawer [(abierto)]="contextoAbierto" titulo="Contexto de hoy" [ancho]="360">
        @if (contextoAbierto()) {
          <app-panel-contexto />
        }
      </ns-drawer>
    }

    @if (!layout.esEscritorio()) {
      <ns-drawer [(abierto)]="listaAbierta" titulo="Conversaciones" lado="izquierda" [ancho]="320">
        @if (listaAbierta()) {
          <ng-container [ngTemplateOutlet]="lista" />
        }
      </ns-drawer>
    }
  `,
  styleUrl: './asistente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsistenteComponent {
  /** :id de la ruta (con withComponentInputBinding); sin él, conversación nueva. */
  readonly id = input<string>();

  protected readonly store = inject(AsistenteStore);
  protected readonly layout = inject(LayoutService);
  private readonly asistente = inject(AsistenteService);
  private readonly router = inject(Router);
  private readonly dialogos = inject(NsDialogService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);

  protected readonly borrador = signal('');
  protected readonly listaAbierta = signal(false);
  protected readonly contextoAbierto = signal(false);

  constructor() {
    void this.store.cargarConversaciones();

    // Borrador para la conversación nueva (quien lo deja navega a /asistente).
    const borrador = this.asistente.tomarBorrador();
    if (borrador) this.borrador.set(borrador);

    // La URL manda: abre la conversación del :id (si no es ya la activa) o deja una nueva.
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (!id) {
          if (this.store.conversacion()) this.store.nueva();
        } else if (this.store.conversacion()?.id !== id) {
          void this.store.abrir(id);
        }
      });
    });

    // Una conversación recién creada al enviar el primer mensaje pasa a la URL.
    effect(() => {
      const activa = this.store.conversacion()?.id;
      untracked(() => {
        if (activa && activa !== this.id()) void this.router.navigate(['/asistente', activa], { replaceUrl: true });
      });
    });
  }

  protected nueva(): void {
    this.listaAbierta.set(false);
    this.store.nueva();
    void this.router.navigate(['/asistente']);
  }

  protected abrir(id: string): void {
    this.listaAbierta.set(false);
    void this.router.navigate(['/asistente', id]);
  }

  protected renombrar(c: ConversacionResumenResponse): void {
    this.dialogos
      .open<RenombrarConversacionDialogComponent, ConversacionResponse, RenombrarConversacionData>(
        RenombrarConversacionDialogComponent,
        { titulo: 'Renombrar conversación', size: 'sm', data: { conversacion: c } },
      )
      .closed.subscribe((actualizada) => {
        if (actualizada) this.store.aplicarCambio(actualizada);
      });
  }

  protected async archivar(c: ConversacionResumenResponse): Promise<void> {
    try {
      await this.store.actualizar(c.id, { archivada: !c.archivada });
      this.toasts.exito(c.archivada ? 'Conversación desarchivada' : 'Conversación archivada');
    } catch (e) {
      this.toasts.error('No hemos podido actualizar la conversación', aApiError(e).detalle);
    }
  }

  protected async eliminar(c: ConversacionResumenResponse): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Eliminar la conversación?',
      mensaje: `Se borrará «${tituloConversacion(c.titulo)}» con todos sus mensajes.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!confirmado) return;
    try {
      await this.store.eliminar(c.id);
      this.toasts.exito('Conversación eliminada');
      if (this.id() === c.id) void this.router.navigate(['/asistente']);
    } catch (e) {
      this.toasts.error('No hemos podido eliminar la conversación', aApiError(e).detalle);
    }
  }
}
