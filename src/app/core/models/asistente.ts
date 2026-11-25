// Asistente con IA · Ampliación (NutriSport_API.md §5).

export type RolMensaje = 'USUARIO' | 'ASISTENTE' | 'HERRAMIENTA';

export interface ConversacionResumenResponse {
  id: string; // UUID
  titulo: string | null;
  archivada: boolean;
  ultimoMensajeEn: string | null; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
  vistaPrevia: string | null;
}
/**
 * OJO (§11): el OpenAPI fusiona dos clases MensajeResponse distintas. Los endpoints del
 * asistente (POST /asistente/conversaciones/{id}/mensajes y ConversacionResponse.mensajes)
 * devuelven esta, no la MensajeResponse { mensaje } de auth.ts.
 */
export interface MensajeAsistente {
  id: string; // UUID (se usa en POST /asistente/mensajes/{mensajeId}/valoracion)
  rol: RolMensaje; // USUARIO o ASISTENTE (HERRAMIENTA no se muestra)
  contenido: string;
  herramientasUsadas: string[]; // vacía en los mensajes del usuario y en las respuestas seguras
  valoracion: -1 | 1 | null; // solo en las respuestas del asistente
  creadoEn: string; // ISO con zona
}
export interface ConversacionResponse {
  id: string; // UUID
  titulo: string | null;
  archivada: boolean;
  mensajes: MensajeAsistente[];
}
export interface ActualizarConversacionRequest {
  titulo?: string; // máx. 100 car.
  archivada?: boolean;
}
export interface EnviarMensajeRequest {
  contenido: string; // máx. 2000 car.
}
export interface ValoracionRequest {
  valor: number;
}
