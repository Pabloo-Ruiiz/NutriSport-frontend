import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import type {
  ActualizarConversacionRequest,
  ConversacionResponse,
  ConversacionResumenResponse,
  EnviarMensajeRequest,
  MensajeAsistente,
  Pagina,
  ValoracionRequest,
} from '../models';

/** Conversaciones por página como mucho (GET /asistente/conversaciones). */
export const MAX_CONVERSACIONES_POR_PAGINA = 50;
/** Longitud máxima de un mensaje (EnviarMensajeRequest.contenido). */
export const MAX_CARACTERES_MENSAJE = 2000;
/** Longitud máxima del título de una conversación. */
export const MAX_CARACTERES_TITULO = 100;

export interface FiltrosConversaciones {
  /** true: solo archivadas; false: solo activas; sin valor: todas. */
  archivada?: boolean | null;
  page: number;
  /** Se limita a 1–50. */
  size: number;
}

/**
 * Asistente IA (NutriSport_API.md §6 Asistente · Ampliación): conversaciones, mensajes, valoraciones
 * y sugerencias. Los mensajes son `MensajeAsistente` (no el `MensajeResponse` de /auth, ver §11.1).
 */
@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/asistente`;

  /** Texto que otra pantalla deja preparado para el compositor (p. ej. "Preguntar al asistente"). */
  private readonly borrador = signal<string | null>(null);

  /** Deja un borrador para la próxima conversación nueva del asistente. */
  dejarBorrador(texto: string): void {
    this.borrador.set(texto.slice(0, MAX_CARACTERES_MENSAJE));
  }

  /** Devuelve el borrador pendiente (una sola vez) o null. */
  tomarBorrador(): string | null {
    const texto = this.borrador();
    this.borrador.set(null);
    return texto;
  }

  /**
   * GET /asistente/conversaciones: la del último mensaje más reciente primero (las vacías al final),
   * con vista previa. `size` se limita a 50.
   */
  conversaciones(filtros: FiltrosConversaciones): Observable<Pagina<ConversacionResumenResponse>> {
    const size = Math.min(Math.max(1, Math.trunc(filtros.size)), MAX_CONVERSACIONES_POR_PAGINA);
    let params = new HttpParams().set('page', Math.max(0, Math.trunc(filtros.page))).set('size', size);
    if (filtros.archivada !== undefined && filtros.archivada !== null) {
      params = params.set('archivada', filtros.archivada);
    }
    return this.http.get<Pagina<ConversacionResumenResponse>>(`${this.url}/conversaciones`, { params });
  }

  /** POST /asistente/conversaciones (201): conversación vacía; el primer mensaje le da título. */
  crear(): Observable<ConversacionResponse> {
    return this.http.post<ConversacionResponse>(`${this.url}/conversaciones`, null);
  }

  /** GET /asistente/conversaciones/{id}: todos los mensajes en orden cronológico. */
  detalle(id: string): Observable<ConversacionResponse> {
    return this.http.get<ConversacionResponse>(`${this.url}/conversaciones/${encodeURIComponent(id)}`);
  }

  /** PATCH /asistente/conversaciones/{id}: renombrar o archivar; solo se envían los campos presentes. */
  actualizar(id: string, req: ActualizarConversacionRequest): Observable<ConversacionResponse> {
    const cuerpo: ActualizarConversacionRequest = {};
    if (req.titulo !== undefined) cuerpo.titulo = req.titulo.trim();
    if (req.archivada !== undefined) cuerpo.archivada = req.archivada;
    return this.http.patch<ConversacionResponse>(`${this.url}/conversaciones/${encodeURIComponent(id)}`, cuerpo);
  }

  /** DELETE /asistente/conversaciones/{id} (204): la borra con todos sus mensajes. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/conversaciones/${encodeURIComponent(id)}`);
  }

  /**
   * POST /asistente/conversaciones/{id}/mensajes (201): guarda el mensaje y devuelve la respuesta
   * completa del asistente. 429 al llegar al límite diario; 503 si la IA no responde (el mensaje del
   * usuario queda guardado sin respuesta).
   */
  enviar(id: string, contenido: string): Observable<MensajeAsistente> {
    const cuerpo: EnviarMensajeRequest = { contenido: contenido.trim() };
    return this.http.post<MensajeAsistente>(`${this.url}/conversaciones/${encodeURIComponent(id)}/mensajes`, cuerpo);
  }

  /** POST /asistente/mensajes/{mensajeId}/valoracion (204): 1 útil, -1 no útil (se puede cambiar). */
  valorar(mensajeId: string, valor: 1 | -1): Observable<void> {
    const cuerpo: ValoracionRequest = { valor };
    return this.http.post<void>(`${this.url}/mensajes/${encodeURIComponent(mensajeId)}/valoracion`, cuerpo);
  }

  /** GET /asistente/sugerencias: 3 o 4 preguntas según la hora y si hay entrenamiento hoy. */
  sugerencias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/sugerencias`);
  }
}
