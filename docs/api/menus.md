# NutriSport API · Menús (planificador)

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Generación por reglas, edición, alternativas, registro de comidas planificadas y sugerencia IA (Ampliación A4).

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Menús
export interface MenuResumenResponse {
  id: string; // UUID
  nombre: string;
  tipo: TipoMenu;
  fechaInicio: string; // "AAAA-MM-DD"
  fechaFin: string; // "AAAA-MM-DD"
  favorito: boolean;
  estado: EstadoMenu;
  generadoAutomaticamente: boolean;
  numeroComidas: number;
}
export interface MenuResponse {
  id: string; // UUID
  nombre: string;
  tipo: TipoMenu;
  fechaInicio: string; // "AAAA-MM-DD"
  fechaFin: string; // "AAAA-MM-DD"
  favorito: boolean;
  estado: EstadoMenu;
  generadoAutomaticamente: boolean;
  explicacion: string | null;
  dias: DiaMenuResponse[];
  resumen: Resumen;
}
export interface DiaMenuResponse {
  fecha: string; // "AAAA-MM-DD"
  objetivo: ObjetivoDiarioResponse | null;
  planificado: Nutrientes;
  porcentajeObjetivo: number;
  diaEntreno: boolean;
  comidas: ComidaPlanificadaResponse[];
}
export interface ComidaPlanificadaResponse {
  id: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  tipoComida: TipoComida | null;
  receta: RecetaResumenResponse;
  raciones: number;
  nutrientes: Nutrientes;
  bloqueada: boolean;
  consumida: boolean;
}
export interface Resumen {
  mediaKcal: number;
  ajustePorcentaje: number;
  proteinaMedia: number;
}
export interface GenerarMenuRequest {
  tipo: TipoMenu;
  fechaInicio: string; // "AAAA-MM-DD"
  nombre?: string; // máx. 100 car.
  conExplicacion?: boolean; // por defecto true
}
export interface ActualizarMenuRequest {
  nombre?: string; // máx. 100 car.
  favorito?: boolean;
  estado?: EstadoMenu;
}
export interface DuplicarMenuRequest {
  fechaInicio: string; // "AAAA-MM-DD"
  nombre?: string; // máx. 100 car.
}
export interface AnadirComidaRequest {
  recetaId: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  tipoComida: TipoComida;
  raciones: number; // >0 y ≤10
}
export interface ActualizarComidaPlanificadaRequest {
  recetaId?: string; // UUID
  raciones?: number; // >0 y ≤10
  fecha?: string; // "AAAA-MM-DD"
  tipoComida?: TipoComida;
  bloqueada?: boolean;
}
export interface AlternativaResponse {
  receta: RecetaResumenResponse;
  raciones: number;
  nutrientes: Nutrientes;
  diferenciaKcalPct: number | null;
}
export interface SugerenciaIaRequest {
  preferencia?: string; // máx. 300 car.
}
export interface SugerenciaIaResponse {
  id: string; // UUID
  texto: string;
  deltaKcalRacion: number | null;
  deltaProteinaRacion: number | null;
  valida: boolean;
}
export interface AplicarSugerenciaRequest {
  sugerenciaId: string; // UUID
}
```

## §6 · Endpoints

### §6 · Menús · Ampliación

Menús planificados por días con recetas y raciones: generación con un motor de reglas determinista, lo planificado frente al objetivo de cada día (incluidos los entrenamientos), favoritos, estado, edición manual (añadir, quitar, cambiar, bloquear), alternativas, regeneración, duplicado, registro de comidas planificadas y sugerencias de ajuste de la IA validadas por el backend.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/menus` | Mis menús | `favorito?` (boolean), `desde?` (AAAA-MM-DD), `page?=0` (integer), `size?=20` (integer), `sort?` (string[]) | — | `200` `Pagina<MenuResumenResponse>` | 400, 401, 403 |
| GET | `/menus/{id}` | Detalle de un menú | — | — | `200` `MenuResponse` | 401, 403, 404 |
| PATCH | `/menus/{id}` | Cambiar nombre, favorito o estado | — | `ActualizarMenuRequest` | `200` `MenuResponse` | 400, 401, 403, 404 |
| DELETE | `/menus/{id}` | Eliminar un menú | — | — | `204` sin cuerpo | 401, 403, 404 |
| POST | `/menus/{id}/comidas` | Añadir una receta al menú | — | `AnadirComidaRequest` | `200` `MenuResponse` | 400, 401, 403, 404, 422 |
| PUT | `/menus/{id}/comidas/{comidaId}` | Cambiar una comida del menú | — | `ActualizarComidaPlanificadaRequest` | `200` `MenuResponse` | 400, 401, 403, 404, 409, 422 |
| DELETE | `/menus/{id}/comidas/{comidaId}` | Quitar una comida del menú | — | — | `204` sin cuerpo | 401, 403, 404 |
| GET | `/menus/{id}/comidas/{comidaId}/alternativas` | Alternativas para una comida | — | — | `200` `AlternativaResponse[]` | 401, 403, 404 |
| POST | `/menus/{id}/comidas/{comidaId}/registrar` | Registrar una comida planificada | `hora?` (HH:mm) | — | `201` `RegistroComidaResponse` | 400, 401, 403, 404, 409, 422 |
| POST | `/menus/{id}/comidas/{comidaId}/sugerencia-ia` | Sugerencia IA para una comida | — | `SugerenciaIaRequest` | `200` `SugerenciaIaResponse` | 400, 401, 403, 404, 422, 503 |
| POST | `/menus/{id}/comidas/{comidaId}/sugerencia-ia/aplicar` | Aplicar una sugerencia IA | — | `AplicarSugerenciaRequest` | `200` `MenuResponse` | 400, 401, 403, 404, 409, 422 |
| POST | `/menus/{id}/duplicar` | Reutilizar el menú en otras fechas | — | `DuplicarMenuRequest` | `201` `MenuResponse` | 400, 401, 403, 404 |
| POST | `/menus/{id}/regenerar` | Regenerar el menú | — | — | `200` `MenuResponse` | 401, 403, 404, 422 |
| POST | `/menus/generar` | Generar un menú | — | `GenerarMenuRequest` | `201` `MenuResponse` | 400, 401, 403, 422 |
| GET | `/menus/recetas-disponibles` | Recetas para añadir a un día | `fecha` (AAAA-MM-DD), `tipoComida` (TipoComida), `q?` (string) | — | `200` `AlternativaResponse[]` | 400, 401, 403 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /menus`: Resumen de los menús, el que empieza más tarde primero (como mucho 50 por página).
- `GET /menus/{id}`: Todos los días del menú con sus comidas (nutrientes = por ración × raciones), lo planificado frente al objetivo del día (porcentajeObjetivo) y si es día de entreno. Sin perfil, objetivo es null y porcentajeObjetivo 0. Las recetas sin cálculo nutricional no suman.
- `PATCH /menus/{id}`: Solo cambian los campos presentes; devuelve el menú completo.
- `DELETE /menus/{id}`: Lo borra con sus comidas planificadas; las comidas ya registradas se conservan.
- `POST /menus/{id}/comidas`: La fecha debe estar dentro del menú (400). La receta debe estar publicada o ser propia (422 RECETA_NO_PUBLICADA), tener cálculo COMPLETO o APROXIMADO (422 NUTRICION_INCOMPLETA) y ser compatible con las restricciones estrictas (422 RECETA_INCOMPATIBLE). Devuelve el menú.
- `PUT /menus/{id}/comidas/{comidaId}`: Cambia la receta, las raciones, el día (dentro del menú), la franja o el bloqueo; los campos ausentes no cambian. Una comida bloqueada no cambia al regenerar. La receta nueva sigue las mismas reglas que al añadirla (422 RECETA_NO_PUBLICADA, NUTRICION_INCOMPLETA o RECETA_INCOMPATIBLE). 409 COMIDA_CONSUMIDA si ya está consumida.
- `DELETE /menus/{id}/comidas/{comidaId}`: Si ya estaba registrada, la comida registrada se conserva.
- `GET /menus/{id}/comidas/{comidaId}/alternativas`: Hasta 3 recetas que pasan el filtro duro del motor para la franja, distintas de la actual y de las del mismo día, con las raciones que mejor ajustan y la energía en ±15 % de la comida original (diferenciaKcalPct), ordenadas con la puntuación del motor. Vacía si la receta actual no tiene cálculo nutricional.
- `POST /menus/{id}/comidas/{comidaId}/registrar`: Crea una comida registrada con origen PLAN con los ingredientes emparejados de la receta escalados a las raciones (raciones / raciones de la receta) y marca la planificada como consumida. Como cualquier comida registrada, su fecha puede ser como mucho mañana (400). 409 COMIDA_CONSUMIDA si ya estaba registrada; 422 NUTRICION_INCOMPLETA si la receta no tiene ingredientes emparejados.
- `POST /menus/{id}/comidas/{comidaId}/sugerencia-ia`: La IA propone UN ajuste de cantidad o una sustitución de un ingrediente de la receta (recibe los ingredientes con gramos, el hueco energético y proteico del día y las restricciones, nunca datos personales). El backend busca el alimento en el catálogo, comprueba restricciones y alérgenos y calcula las cifras (deltas por ración); si el alimento no existe o no cumple, valida = false y el texto dice por qué. 422 PERFIL_REQUERIDO sin perfil; 503 si la IA no responde.
- `POST /menus/{id}/comidas/{comidaId}/sugerencia-ia/aplicar`: Crea una receta PROPIA derivada (copia privada con el ajuste y sus nutrientes recalculados) y la pone en la comida; devuelve el menú. 422 SUGERENCIA_NO_VALIDA si se descartó o el alimento ya no cumple; 409 SUGERENCIA_APLICADA, COMIDA_CONSUMIDA o SUGERENCIA_OBSOLETA (la comida ya tiene otra receta).
- `POST /menus/{id}/duplicar`: Copia el menú desde fechaInicio (no anterior a hoy) desplazando todas las comidas los mismos días, con su receta, raciones y bloqueo pero sin consumo. La copia queda ACTIVA, no favorita y sin explicación; sin nombre se llama "Copia de …".
- `POST /menus/{id}/regenerar`: Vuelve a elegir con el motor de reglas las comidas no bloqueadas ni consumidas; las bloqueadas y las consumidas se conservan y su energía se descuenta del objetivo de su día. 422 PERFIL_REQUERIDO sin perfil; 422 SIN_RECETAS_COMPATIBLES si ninguna receta encaja.
- `POST /menus/generar`: Genera con el motor de reglas (no con IA) un menú DIARIO (1 día) o SEMANAL (7 días consecutivos; de lunes a domingo si empieza en lunes) desde fechaInicio, que no puede ser anterior a hoy. Solo usa recetas publicadas, públicas o propias, con cálculo COMPLETO o APROXIMADO, aptas para cada franja, compatibles con las restricciones estrictas y dentro del tiempo máximo de cocina. Cada día se ajusta a su objetivo (con los entrenamientos planificados) en ±10 % de kcal y ±15 % de proteína o lleva un aviso en la explicación. Con conExplicacion (por defecto), la IA redacta una explicación breve con datos ya calculados; si falla, se usa una de plantilla. El menú se guarda ACTIVO con generadoAutomaticamente = true. 422 PERFIL_REQUERIDO sin perfil; 422 SIN_RECETAS_COMPATIBLES si ninguna receta encaja.
- `GET /menus/recetas-disponibles`: Recetas publicadas (públicas o propias) con cálculo COMPLETO o APROXIMADO, aptas para la franja y compatibles con las restricciones estrictas; con q, solo las que lo contienen en el nombre. Con perfil, ordenadas por su ajuste a la parte del hueco del día (objetivo − lo registrado − lo planificado pendiente en menús ACTIVO) que corresponde a la franja, con las raciones que mejor encajan y diferenciaKcalPct respecto a esa parte; sin perfil, por nombre, con 1 ración y diferenciaKcalPct null. Como mucho 50.

## §7 · Flujos

### §7.5. Planificador de menús (Ampliación)

- **Generar:** `POST /menus/generar {tipo, fechaInicio, nombre?, conExplicacion?}` → `MenuResponse` con `dias[]`, cada uno con su `objetivo`, lo `planificado`, `porcentajeObjetivo`, `diaEntreno` y `comidas[]`.
- **Editar:** casi todas las operaciones devuelven el **menú completo** (`MenuResponse`): sustituye el estado del componente con la respuesta (no hagas cálculos en el cliente).
- **Añadir receta a una franja:** `GET /menus/recetas-disponibles?fecha=&tipoComida=&q=` → `AlternativaResponse[]` (receta, raciones propuestas, nutrientes y `diferenciaKcalPct`) → `POST /menus/{id}/comidas`.
- **Sustituir:** `GET /menus/{id}/comidas/{comidaId}/alternativas` (hasta 3) → `PUT /menus/{id}/comidas/{comidaId} {recetaId, raciones}`.
- **Bloquear / mover:** `PUT` con `{bloqueada}` o con `{fecha, tipoComida}` (el drag & drop usa esto).
- **Registrar como consumida:** `POST /menus/{id}/comidas/{comidaId}/registrar?hora=HH:mm` → `RegistroComidaResponse`; después recarga el menú (`consumida = true`).
- **Sugerencia IA:** `POST …/sugerencia-ia {preferencia?}` → `SugerenciaIaResponse`; si `valida`, "Aplicar" → `POST …/sugerencia-ia/aplicar {sugerenciaId}` (devuelve el menú). Requiere email verificado.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `ActualizarComidaPlanificadaRequest` | `raciones` | mayor que 0 y como mucho 10 |
| `ActualizarMenuRequest` | `nombre` | máx. 100 caracteres; no puede ser solo espacios |
| `AnadirComidaRequest` | `recetaId` | obligatorio |
| `AnadirComidaRequest` | `fecha` | obligatorio |
| `AnadirComidaRequest` | `tipoComida` | obligatorio |
| `AnadirComidaRequest` | `raciones` | obligatorio; mayor que 0 y como mucho 10 |
| `AplicarSugerenciaRequest` | `sugerenciaId` | obligatorio |
| `DuplicarMenuRequest` | `fechaInicio` | obligatorio; no anterior a hoy |
| `DuplicarMenuRequest` | `nombre` | máx. 100 caracteres; no puede ser solo espacios |
| `GenerarMenuRequest` | `tipo` | obligatorio |
| `GenerarMenuRequest` | `fechaInicio` | obligatorio; no anterior a hoy |
| `GenerarMenuRequest` | `nombre` | máx. 100 caracteres; no puede ser solo espacios |
| `SugerenciaIaRequest` | `preferencia` | máx. 300 caracteres |
