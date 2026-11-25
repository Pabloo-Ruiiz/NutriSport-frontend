# NutriSport API · Actividad

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Entrenamientos realizados y planificados, tipos de actividad y relación con la alimentación.

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Actividad
export interface TipoActividadResponse {
  codigo: string;
  nombre: string;
  met: number;
  categoria: string | null;
}
export interface EntrenamientoRequest {
  tipoActividadCodigo: string; // máx. 40 car.
  fechaHora: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
  duracionMin: number; // 1–600
  intensidad: Intensidad;
  rpe?: number; // 1–10
  estado?: EstadoEntrenamiento;
  distanciaKm?: number; // 0–9999.99
  notas?: string; // máx. 500 car.
}
export interface EntrenamientoResponse {
  id: string; // UUID
  tipoActividadCodigo: string;
  tipoActividadNombre: string;
  fechaHora: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
  duracionMin: number;
  intensidad: Intensidad;
  rpe: number | null;
  estado: EstadoEntrenamiento;
  kcalEstimadas: number;
  distanciaKm: number | null;
  notas: string | null;
}
export interface RelacionNutricionResponse {
  desde: string; // "AAAA-MM-DD"
  hasta: string; // "AAAA-MM-DD"
  mediaEntreno: Nutrientes;
  objetivoEntreno: Nutrientes;
  mediaDescanso: Nutrientes;
  objetivoDescanso: Nutrientes;
  diasEntreno: number;
  diasDescanso: number;
  sesionesConProteinaPost: number;
  sesiones: number;
}
```

## §6 · Endpoints

### §6 · Actividad

Entrenamientos realizados y planificados con su gasto neto estimado a partir del MET, el peso y la duración, y catálogo de tipos de actividad. Cada cambio recalcula el objetivo del día.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/entrenamientos` | Historial y próximos entrenamientos | `desde` (AAAA-MM-DD), `hasta` (AAAA-MM-DD), `estado?` (EstadoEntrenamiento) | — | `200` `EntrenamientoResponse[]` | 400, 401, 403 |
| POST | `/entrenamientos` | Registrar o planificar un entrenamiento | — | `EntrenamientoRequest` | `201` `EntrenamientoResponse` | 400, 401, 403, 422 |
| PUT | `/entrenamientos/{id}` | Editar un entrenamiento (incluido marcarlo como realizado) | — | `EntrenamientoRequest` | `200` `EntrenamientoResponse` | 400, 401, 403, 404, 422 |
| DELETE | `/entrenamientos/{id}` | Eliminar un entrenamiento | — | — | `204` sin cuerpo | 401, 403, 404 |
| GET | `/entrenamientos/relacion-nutricion` | Alimentación en días de entreno frente a descanso | `desde` (AAAA-MM-DD), `hasta` (AAAA-MM-DD) | — | `200` `RelacionNutricionResponse` | 400, 401, 403 |
| GET | `/entrenamientos/tipos` | Catálogo de actividades con su MET | — | — | `200` `TipoActividadResponse[]` | 401, 403 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /entrenamientos`: Entrenamientos entre desde y hasta (ambos incluidos, máximo 92 días) en orden cronológico, opcionalmente de un estado.
- `POST /entrenamientos`: Duración de 1 a 600 minutos. Sin estado: PLANIFICADO si la fecha es futura y REALIZADO si no (un entrenamiento futuro no puede estar REALIZADO). Calcula el gasto neto estimado con el peso del perfil y recalcula el objetivo del día. 422 PERFIL_REQUERIDO si no hay perfil.
- `PUT /entrenamientos/{id}`: Sustituye sus datos; sin estado se conserva el actual. Recalcula el gasto y los objetivos de los días afectados. 422 PERFIL_REQUERIDO si no hay perfil.
- `DELETE /entrenamientos/{id}`: Recalcula el objetivo de su día.
- `GET /entrenamientos/relacion-nutricion`: Media diaria consumida y objetivo medio en los días con algún entrenamiento planificado o realizado frente a los días sin entrenamiento (solo los días con alguna comida registrada), y cuántas sesiones tienen al menos 25 g de proteína en las comidas con hora de las 2 h siguientes al final del entreno. Rango de como mucho 366 días.
- `GET /entrenamientos/tipos`: Tipos de actividad activos, ordenados por categoría y nombre. Su código se usa en tipoActividadCodigo y en el deporte principal del perfil.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `EntrenamientoRequest` | `tipoActividadCodigo` | obligatorio; máx. 40 caracteres |
| `EntrenamientoRequest` | `fechaHora` | obligatorio |
| `EntrenamientoRequest` | `duracionMin` | obligatorio; entre 1 y 600 |
| `EntrenamientoRequest` | `intensidad` | obligatorio |
| `EntrenamientoRequest` | `rpe` | entre 1 y 10 |
| `EntrenamientoRequest` | `estado` | sin él: PLANIFICADO si la fecha es futura y REALIZADO si no; un entrenamiento futuro no puede ser REALIZADO |
| `EntrenamientoRequest` | `distanciaKm` | entre 0 y 9999.99 |
| `EntrenamientoRequest` | `notas` | máx. 500 caracteres |
