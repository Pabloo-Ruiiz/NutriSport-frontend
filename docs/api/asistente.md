# NutriSport API · Asistente IA

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Conversaciones, mensajes, sugerencias y valoración. Ojo con `MensajeAsistente` (§11.1 en `general.md`).

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Asistente
export interface ConversacionResumenResponse {
  id: string; // UUID
  titulo: string | null;
  archivada: boolean;
  ultimoMensajeEn: string | null; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
  vistaPrevia: string | null;
}
// OJO: el OpenAPI fusiona dos clases MensajeResponse distintas. Los endpoints del asistente devuelven esta:
export interface MensajeAsistente {
  id: string;                       // UUID (se usa en POST /asistente/mensajes/{mensajeId}/valoracion)
  rol: RolMensaje;                  // USUARIO o ASISTENTE (HERRAMIENTA no se muestra)
  contenido: string;
  herramientasUsadas: string[];     // vacía en los mensajes del usuario y en las respuestas seguras
  valoracion: -1 | 1 | null;        // solo en las respuestas del asistente
  creadoEn: string;                 // ISO con zona
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
```

## §6 · Endpoints

### §6 · Asistente · Ampliación

Conversaciones con el asistente nutricional: responde en castellano con los datos reales del usuario, que consulta con herramientas de solo lectura (resumen diario, comidas, entrenamientos, menú y tendencias); los temas sensibles reciben una respuesta segura sin llamar al modelo.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/asistente/conversaciones` | Mis conversaciones | `archivada?` (boolean), `page?=0` (integer), `size?=20` (integer), `sort?` (string[]) | — | `200` `Pagina<ConversacionResumenResponse>` | 400, 401, 403 |
| POST | `/asistente/conversaciones` | Nueva conversación | — | — | `201` `ConversacionResponse` | 401, 403 |
| GET | `/asistente/conversaciones/{id}` | Mensajes de una conversación | — | — | `200` `ConversacionResponse` | 401, 403, 404 |
| PATCH | `/asistente/conversaciones/{id}` | Renombrar o archivar una conversación | — | `ActualizarConversacionRequest` | `200` `ConversacionResponse` | 400, 401, 403, 404 |
| DELETE | `/asistente/conversaciones/{id}` | Eliminar una conversación | — | — | `204` sin cuerpo | 401, 403, 404 |
| POST | `/asistente/conversaciones/{id}/mensajes` | Enviar un mensaje al asistente | — | `EnviarMensajeRequest` | `201` `MensajeAsistente` | 400, 401, 403, 404, 429, 503 |
| POST | `/asistente/mensajes/{mensajeId}/valoracion` | Valorar una respuesta | — | `ValoracionRequest` | `204` sin cuerpo | 400, 401, 403, 404, 422 |
| GET | `/asistente/sugerencias` | Preguntas sugeridas | — | — | `200` `string[]` | 401, 403 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /asistente/conversaciones`: La del último mensaje más reciente primero (las que aún no tienen mensajes, al final), con una vista previa del último mensaje. Como mucho 50 por página.
- `POST /asistente/conversaciones`: Conversación vacía; su título se rellena con el primer mensaje.
- `GET /asistente/conversaciones/{id}`: Todos los mensajes en orden cronológico, con las herramientas que usó el asistente en cada respuesta y su valoración.
- `PATCH /asistente/conversaciones/{id}`: Solo cambian los campos presentes.
- `DELETE /asistente/conversaciones/{id}`: La borra con todos sus mensajes.
- `POST /asistente/conversaciones/{id}/mensajes`: Guarda el mensaje y devuelve la respuesta completa del asistente, que consulta los datos del usuario con herramientas de solo lectura (herramientasUsadas). Los mensajes sobre conductas alimentarias de riesgo, dosis de medicamentos o suplementos y consultas médicas reciben una respuesta segura sin llamar al modelo. El primer mensaje da título a la conversación. 429 si se ha alcanzado el límite diario de mensajes; 403 EMAIL_NO_VERIFICADO; 503 si la IA no responde (el mensaje queda guardado sin respuesta).
- `POST /asistente/mensajes/{mensajeId}/valoracion`: 1 (útil) o -1 (no útil); se puede cambiar. Solo las respuestas del asistente (422 si no).
- `GET /asistente/sugerencias`: 3 o 4 preguntas para empezar según la hora del día y si hay entrenamiento hoy.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `ActualizarConversacionRequest` | `titulo` | máx. 100 caracteres; no puede ser solo espacios |
| `EnviarMensajeRequest` | `contenido` | obligatorio; máx. 2000 caracteres |
| `ValoracionRequest` | `valor` | obligatorio; `1` (útil) o `-1` (no útil) |
