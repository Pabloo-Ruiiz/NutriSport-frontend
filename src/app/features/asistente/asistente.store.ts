import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  ActualizarConversacionRequest,
  ConversacionResponse,
  ConversacionResumenResponse,
  MensajeAsistente,
} from '@core/models';
import { AsistenteService, MAX_CARACTERES_MENSAJE } from '@core/services/asistente.service';
import { type ApiError, aApiError } from '@core/util/api-error';

/** Conversaciones que se piden para la lista lateral. */
export const CONVERSACIONES_POR_PAGINA = 50;

/** Prefijo del id de los mensajes del usuario que aún no ha confirmado el servidor. */
export const PREFIJO_ID_TEMPORAL = 'tmp-';

export type EstadoMensaje = 'enviado' | 'pendiente' | 'error';

/** Límite diario de mensajes del asistente (el backend responde 429 al superarlo). */
export const LIMITE_MENSAJES_DIA = 50;

/**
 * Motivo por el que no se puede escribir: email sin verificar (403 EMAIL_NO_VERIFICADO) o límite
 * diario alcanzado (429, con los segundos de espera de Retry-After si los hay).
 */
export type BloqueoAsistente = { tipo: 'email' } | { tipo: 'limite'; retryAfterSegundos: number | null };

/** Mensaje tal y como se pinta: el de la API más su estado de envío. */
export interface MensajeVista extends MensajeAsistente {
  estado: EstadoMensaje;
  /** Texto del error si no se pudo enviar (estado 'error'). */
  error: string | null;
  /**
   * El servidor guardó el mensaje aunque la IA no respondiera (503): al reintentar hay que recargar
   * la conversación antes de volver a enviarlo.
   */
  guardado: boolean;
}

/** MensajeAsistente de la API → MensajeVista ya enviado. */
export function aVista(m: MensajeAsistente): MensajeVista {
  return { ...m, estado: 'enviado', error: null, guardado: true };
}

/** Mensajes que se muestran: sin los de HERRAMIENTA. */
function visibles(mensajes: readonly MensajeAsistente[]): MensajeVista[] {
  return mensajes.filter((m) => m.rol !== 'HERRAMIENTA').map(aVista);
}

/**
 * Estado del asistente IA (docs/api/asistente.md). Se provee en el componente:
 * `providers: [AsistenteStore]`.
 *
 * - `conversacion`: la activa (null = conversación nueva, aún sin crear); `mensajes`: los suyos.
 * - `enviar(texto)`: si no hay conversación, la crea primero; añade al momento el mensaje del usuario
 *   como 'pendiente' (id temporal), lo envía y añade la respuesta. Si falla, el mensaje pasa a 'error'
 *   con el texto del error y se puede `reintentar`. Tras el primer mensaje recarga la lista, porque el
 *   backend le pone el título.
 * - Un 503 deja el mensaje guardado en el servidor sin respuesta. Al reintentar se recarga la
 *   conversación y se vuelve a enviar el texto (no hay endpoint para pedir solo la respuesta); el
 *   mensaje guardado sin respuesta se sustituye en pantalla por el reintento.
 */
@Injectable()
export class AsistenteStore {
  private readonly asistente = inject(AsistenteService);

  readonly conversaciones = signal<ConversacionResumenResponse[]>([]);
  readonly conversacion = signal<Omit<ConversacionResponse, 'mensajes'> | null>(null);
  readonly mensajes = signal<MensajeVista[]>([]);
  readonly enviando = signal(false);
  readonly cargando = signal(false);
  /** Error al cargar la lista o una conversación (los de envío van en cada mensaje). */
  readonly error = signal<string | null>(null);
  /** La lista muestra las archivadas (pestaña "Archivadas") en vez de las activas. */
  readonly verArchivadas = signal(false);
  readonly cargandoLista = signal(false);
  /** Último bloqueo del envío (403 email, 429 límite); se quita al enviar con éxito. */
  readonly bloqueo = signal<BloqueoAsistente | null>(null);

  readonly titulo = computed(() => this.conversacion()?.titulo ?? null);
  readonly vacia = computed(() => this.mensajes().length === 0);

  private siguienteTemporal = 0;

  /**
   * Recarga la lista de conversaciones (activas o archivadas, según `verArchivadas`) y actualiza el
   * título de la activa.
   */
  async cargarConversaciones(): Promise<void> {
    const archivadas = this.verArchivadas();
    this.cargandoLista.set(true);
    try {
      const pagina = await firstValueFrom(
        this.asistente.conversaciones({ archivada: archivadas, page: 0, size: CONVERSACIONES_POR_PAGINA }),
      );
      if (this.verArchivadas() !== archivadas) return; // cambió de pestaña mientras tanto
      this.conversaciones.set(pagina.content);
      const activa = this.conversacion();
      const resumen = activa && pagina.content.find((c) => c.id === activa.id);
      if (resumen && resumen.titulo !== activa.titulo) this.conversacion.set({ ...activa, titulo: resumen.titulo });
    } catch (e) {
      this.error.set(aApiError(e).detalle);
    } finally {
      this.cargandoLista.set(false);
    }
  }

  /** Cambia de pestaña (Activas · Archivadas) y recarga la lista. */
  async mostrarArchivadas(archivadas: boolean): Promise<void> {
    if (this.verArchivadas() === archivadas) return;
    this.verArchivadas.set(archivadas);
    this.conversaciones.set([]);
    await this.cargarConversaciones();
  }

  /**
   * Aplica un PATCH ya hecho (renombrar, desde su diálogo) o lo hace (archivar/desarchivar): actualiza
   * la activa y la lista; al archivar o desarchivar, la conversación sale de la pestaña actual.
   */
  async actualizar(id: string, req: ActualizarConversacionRequest): Promise<void> {
    this.aplicarCambio(await firstValueFrom(this.asistente.actualizar(id, req)));
  }

  /** Cambios de una conversación devueltos por el servidor (p. ej. por el diálogo de renombrar). */
  aplicarCambio(c: ConversacionResponse): void {
    const activa = this.conversacion();
    if (activa?.id === c.id) this.conversacion.set({ id: c.id, titulo: c.titulo, archivada: c.archivada });
    this.conversaciones.update((lista) =>
      c.archivada !== this.verArchivadas()
        ? lista.filter((x) => x.id !== c.id)
        : lista.map((x) => (x.id === c.id ? { ...x, titulo: c.titulo, archivada: c.archivada } : x)),
    );
  }

  /** Elimina una conversación; si era la activa, deja una nueva vacía. */
  async eliminar(id: string): Promise<void> {
    await firstValueFrom(this.asistente.eliminar(id));
    this.conversaciones.update((lista) => lista.filter((c) => c.id !== id));
    if (this.conversacion()?.id === id) this.nueva();
  }

  /** Abre una conversación con todos sus mensajes. */
  async abrir(id: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.aplicar(await firstValueFrom(this.asistente.detalle(id)));
    } catch (e) {
      this.error.set(aApiError(e).detalle);
    } finally {
      this.cargando.set(false);
    }
  }

  /** Empieza una conversación nueva: no se crea en el servidor hasta el primer mensaje. */
  nueva(): void {
    this.conversacion.set(null);
    this.mensajes.set([]);
    this.error.set(null);
  }

  /** Envía un mensaje del usuario (vacío, demasiado largo o con otro envío en curso: no hace nada). */
  async enviar(texto: string): Promise<void> {
    const contenido = texto.trim();
    if (!contenido || contenido.length > MAX_CARACTERES_MENSAJE || this.enviando()) return;
    const temporal: MensajeVista = {
      id: `${PREFIJO_ID_TEMPORAL}${++this.siguienteTemporal}`,
      rol: 'USUARIO',
      contenido,
      herramientasUsadas: [],
      valoracion: null,
      creadoEn: new Date().toISOString(),
      estado: 'pendiente',
      error: null,
      guardado: false,
    };
    this.mensajes.update((lista) => [...lista, temporal]);
    await this.mandar(temporal.id);
  }

  /** Vuelve a enviar un mensaje que falló. */
  async reintentar(idTemporal: string): Promise<void> {
    const mensaje = this.mensajes().find((m) => m.id === idTemporal);
    if (!mensaje || mensaje.estado !== 'error' || this.enviando()) return;
    const conversacion = this.conversacion();
    if (mensaje.guardado && conversacion) {
      // 503: el servidor ya tiene el mensaje (sin respuesta). Se recarga la conversación y se quita
      // de la vista esa copia guardada, que sustituye el reintento.
      this.enviando.set(true);
      try {
        const recargada = await firstValueFrom(this.asistente.detalle(conversacion.id));
        const servidor = visibles(recargada.mensajes);
        const ultimo = servidor.at(-1);
        if (ultimo?.rol === 'USUARIO' && ultimo.contenido === mensaje.contenido) servidor.pop();
        this.conversacion.set({ id: recargada.id, titulo: recargada.titulo, archivada: recargada.archivada });
        this.mensajes.set([...servidor, { ...mensaje, estado: 'pendiente', error: null, guardado: false }]);
      } catch (e) {
        this.marcarError(idTemporal, aApiError(e));
        this.enviando.set(false);
        return;
      }
      this.enviando.set(false);
    } else {
      this.cambiar(idTemporal, { estado: 'pendiente', error: null });
    }
    await this.mandar(idTemporal);
  }

  /** Valora una respuesta del asistente (al momento; si falla, se deshace). */
  async valorar(mensajeId: string, valor: 1 | -1): Promise<void> {
    const anterior = this.mensajes().find((m) => m.id === mensajeId)?.valoracion ?? null;
    this.cambiar(mensajeId, { valoracion: valor });
    try {
      await firstValueFrom(this.asistente.valorar(mensajeId, valor));
    } catch (e) {
      this.cambiar(mensajeId, { valoracion: anterior });
      throw aApiError(e);
    }
  }

  /** Envía el mensaje pendiente `id`: crea la conversación si hace falta y añade la respuesta. */
  private async mandar(id: string): Promise<void> {
    const mensaje = this.mensajes().find((m) => m.id === id);
    if (!mensaje) return;
    this.enviando.set(true);
    // Primer mensaje de la conversación: ninguno confirmado por el servidor todavía.
    const primero = !this.mensajes().some((m) => m.estado === 'enviado');
    try {
      let conversacion = this.conversacion();
      if (!conversacion) {
        const creada = await firstValueFrom(this.asistente.crear());
        conversacion = { id: creada.id, titulo: creada.titulo, archivada: creada.archivada };
        this.conversacion.set(conversacion);
      }
      const respuesta = await firstValueFrom(this.asistente.enviar(conversacion.id, mensaje.contenido));
      this.cambiar(id, { estado: 'enviado', error: null, guardado: true });
      this.mensajes.update((lista) => [...lista, aVista(respuesta)]);
      this.bloqueo.set(null);
      // El backend acaba de poner el título: se recarga la lista de activas.
      if (primero && !this.verArchivadas()) void this.cargarConversaciones();
    } catch (e) {
      this.marcarError(id, aApiError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  private marcarError(id: string, error: ApiError): void {
    let texto = error.detalle;
    if (error.status === 429) {
      // Límite diario de mensajes, con cuándo se puede volver a intentar.
      texto = `Has llegado al límite de ${LIMITE_MENSAJES_DIA} mensajes de hoy. ${error.mensajeEspera()}`;
      this.bloqueo.set({ tipo: 'limite', retryAfterSegundos: error.retryAfterSegundos });
    } else if (error.esCodigo('EMAIL_NO_VERIFICADO')) {
      texto = 'Verifica tu email para usar el asistente.';
      this.bloqueo.set({ tipo: 'email' });
    }
    // Con 503 el backend guardó el mensaje (y la conversación ya existe).
    this.cambiar(id, { estado: 'error', error: texto.trim(), guardado: error.status === 503 });
  }

  private cambiar(id: string, cambios: Partial<MensajeVista>): void {
    this.mensajes.update((lista) => lista.map((m) => (m.id === id ? { ...m, ...cambios } : m)));
  }

  private aplicar(c: ConversacionResponse): void {
    this.conversacion.set({ id: c.id, titulo: c.titulo, archivada: c.archivada });
    this.mensajes.set(visibles(c.mensajes));
  }
}
