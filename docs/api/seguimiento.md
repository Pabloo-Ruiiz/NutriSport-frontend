# NutriSport API · Seguimiento

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Resumen diario del dashboard, peso con media móvil, estadísticas, comparativa e insights.

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Seguimiento
export interface ResumenDiarioResponse {
  fecha: string; // "AAAA-MM-DD"
  objetivo: Nutrientes;
  kcalEntreno: number;
  consumido: Nutrientes;
  restante: Nutrientes;
  excesoKcal: number | null;
  porcentajes: Porcentajes;
  comidas: RegistroComidaResponse[];
  entrenamientos: EntrenamientoResponse[];
  comidasPlanificadasPendientes: ComidaPendienteResponse[];
}
export interface ComidaPendienteResponse {
  menuId: string | null; // UUID
  menuNombre: string;
  id: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  tipoComida: TipoComida | null;
  receta: RecetaResumenResponse;
  raciones: number;
  nutrientes: Nutrientes;
}
export interface PesoRequest {
  fecha: string; // "AAAA-MM-DD"
  pesoKg: number; // 30–250
}
export interface PesoResponse {
  id: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  pesoKg: number;
}
export interface SeriePesoResponse {
  puntos: PuntoPeso[];
  variacion: number | null;
}
export interface PuntoPeso {
  fecha: string; // "AAAA-MM-DD"
  pesoKg: number;
  mediaMovil7: number | null;
}
export interface EstadisticasResponse {
  desde: string; // "AAAA-MM-DD"
  hasta: string; // "AAAA-MM-DD"
  agrupacion: Agrupacion;
  serie: PuntoSerieResponse[];
  mediaDiaria: Nutrientes;
  objetivoMedio: Nutrientes;
  diasConRegistro: number;
  diasEnObjetivo: number;
  porcentajeAdherencia: number;
  repartoMacrosPct: Record<string, number>;
  kcalPorTipoComida: Record<string, number>;
  top: AlimentoFrecuenteResponse[];
}
export interface PuntoSerieResponse {
  periodo: string;
  desde: string; // "AAAA-MM-DD"
  consumido: Nutrientes;
  objetivo: Nutrientes;
  diasConRegistro: number;
  diasEnObjetivo: number;
}
export interface AlimentoFrecuenteResponse {
  alimentoId: string; // UUID
  nombre: string;
  veces: number;
  porcentajeEnergia: number;
  fuente: string;
}
export interface ComparativaResponse {
  actual: EstadisticasResponse;
  anterior: EstadisticasResponse;
  variacionPct: Record<string, number>;
}
export interface InsightResponse {
  id: string; // UUID
  tipo: TipoInsight;
  severidad: SeveridadInsight;
  titulo: string | null;
  texto: string;
  periodoDesde: string | null; // "AAAA-MM-DD"
  periodoHasta: string | null; // "AAAA-MM-DD"
  creadoEn: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
}
```

## §6 · Endpoints

### §6 · Seguimiento

Resumen diario (consumido frente al objetivo del día, con comidas y entrenamientos) y evolución del peso con su media móvil.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/seguimiento/comparativa` | Periodo actual frente al anterior | `periodo?` (Agrupacion) | — | `200` `ComparativaResponse` | 400, 401, 403 |
| GET | `/seguimiento/estadisticas` | Estadísticas de un periodo | `desde` (AAAA-MM-DD), `hasta` (AAAA-MM-DD), `agrupacion?` (Agrupacion) | — | `200` `EstadisticasResponse` | 400, 401, 403 |
| GET | `/seguimiento/insights` | Patrones detectados | — | — | `200` `InsightResponse[]` | 401, 403 |
| GET | `/seguimiento/peso` | Serie de peso con media móvil de 7 días | `desde` (AAAA-MM-DD), `hasta` (AAAA-MM-DD) | — | `200` `SeriePesoResponse` | 400, 401, 403 |
| POST | `/seguimiento/peso` | Registrar un pesaje | — | `PesoRequest` | `201` `PesoResponse` | 400, 401, 403 |
| DELETE | `/seguimiento/peso/{id}` | Eliminar un pesaje | — | — | `204` sin cuerpo | 401, 403, 404 |
| GET | `/seguimiento/resumen` | Resumen diario | `fecha?` (AAAA-MM-DD) | — | `200` `ResumenDiarioResponse` | 400, 401, 403, 422 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /seguimiento/comparativa`: SEMANA (por defecto): de lunes a hoy frente a la semana anterior completa. MES: del día 1 a hoy frente al mes anterior completo. Estadísticas resumidas (sin serie) y variación de la media diaria en % (nula si el periodo anterior no tiene datos) y de la adherencia en puntos.
- `GET /seguimiento/estadisticas`: Serie de energía y macros consumidos frente al objetivo guardado de cada día, agrupada por día, semana ISO o mes; media diaria y objetivo medio (sobre los días con alguna comida); días en objetivo (energía en ±10 %) y adherencia; reparto de macros de la media diaria (suma 100); kcal medias por tipo de comida y los 10 alimentos más consumidos. Si un día con comidas no tiene objetivo, se crea con el perfil actual. Rango de como mucho 366 días.
- `GET /seguimiento/insights`: Insights vigentes, los más recientes primero. Los calcula cada noche una tarea con reglas estadísticas sobre los últimos 28 días (proteína baja, carbohidratos bajos en días de entreno, buen reparto de la proteína, días de la semana con menos registros y tendencia del peso contraria al objetivo); el texto lleva esas cifras y, como mucho, un consejo redactado por la IA sin cifras nuevas. Vacía si el usuario los tiene desactivados en su cuenta.
- `GET /seguimiento/peso`: Pesajes entre desde y hasta (ambos incluidos, máximo 366 días) en orden cronológico.
- `POST /seguimiento/peso`: Peso de 30 a 250 kg. Si ya hay uno ese día, lo sustituye. Si es el más reciente, actualiza el peso del perfil y recalcula sus objetivos.
- `DELETE /seguimiento/peso/{id}`: Si era el más reciente, el perfil toma el anterior.
- `GET /seguimiento/resumen`: Objetivo del día (base del perfil más el gasto de los entrenamientos que cuentan), consumido, restante, exceso, porcentajes, comidas y entrenamientos. 422 PERFIL_REQUERIDO si no hay perfil.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `PesoRequest` | `fecha` | obligatorio |
| `PesoRequest` | `pesoKg` | obligatorio; entre 30 y 250 |
