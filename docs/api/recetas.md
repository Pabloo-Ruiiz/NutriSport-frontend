# NutriSport API · Recetas

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Catálogo de recetas propias y de TheMealDB, detalle, nutrición calculada, relacionadas y favoritas (Ampliación A2–A3).

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Recetas
export interface RecetaResumenResponse {
  id: string | null; // UUID
  referenciaExterna: string | null;
  origen: OrigenReceta;
  nombre: string;
  categoria: string | null;
  area: string | null;
  imagenUrl: string | null;
  nutricionRacion: NutricionRacion | null;
  estadoNutricional: string | null;
  alergenosVerificados: boolean;
  compatible: boolean;
  favorita: boolean;
  fuente: FuenteResponse | null;
}
export interface RecetaResponse {
  id: string; // UUID
  origen: OrigenReceta;
  nombre: string;
  descripcion: string | null;
  idioma: string;
  categoria: string | null;
  area: string | null;
  imagenUrl: string | null;
  raciones: number;
  racionesSupuestas: boolean;
  tiempoPreparacionMin: number | null;
  dificultad: Dificultad | null;
  franjasAptas: string[];
  etiquetas: string[];
  ingredientes: IngredienteRecetaResponse[];
  instrucciones: PasoReceta[];
  nutricionRacion: NutricionRacion | null;
  estadoNutricional: EstadoNutricional;
  completitudPct: number | null;
  alergenos: string[];
  alergenosVerificados: boolean;
  compatible: boolean;
  favorita: boolean;
  fuente: FuenteResponse | null;
}
export interface IngredienteRecetaResponse {
  nombre: string;
  nombreOriginal: string | null;
  medidaOriginal: string | null;
  gramos: number | null;
  estadoConversion: EstadoConversion;
  alimentoId: string | null; // UUID
}
export interface PasoReceta {
  orden: number;
  texto: string;
}
export interface BusquedaRecetasResponse {
  catalogo: PaginaResponseRecetaResumenResponse;
  themealdb: RecetaResumenResponse[];
  themealdbDisponible: boolean;
}
export interface NutricionRecetaResponse {
  raciones: number;
  racionesSupuestas: boolean;
  porRacion: Nutrientes | null;
  estado: EstadoNutricional;
  completitudPct: number;
  ingredientes: IngredienteCalculoResponse[];
}
export interface IngredienteCalculoResponse {
  nombre: string;
  nombreOriginal: string | null;
  medidaOriginal: string | null;
  gramos: number | null;
  estadoConversion: EstadoConversion;
  fuente: string;
}
```

## §6 · Endpoints

### §6 · Recetas · Ampliación

Catálogo de recetas propias e importadas de TheMealDB: búsqueda, detalle con cantidades por raciones, relacionadas y favoritas. Las de TheMealDB están en inglés, con raciones supuestas y atribución ("Receta e imagen: TheMealDB"); sus nutrientes se calculan con los ingredientes.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/recetas` | Buscar recetas | `q?` (string), `ingrediente?` (string), `categoria?` (string), `area?` (string), `origen?` (string), `franja?` (TipoComida), `maxKcal?` (number), `minProteina?` (number), `page?=0` (integer), `size?=20` (integer), `sort?` (string[]) | — | `200` `BusquedaRecetasResponse` | 400, 401 |
| GET | `/recetas/{id}` | Detalle de una receta | `raciones?` (integer) | — | `200` `RecetaResponse` | 400, 401, 404 |
| PUT | `/recetas/{id}/favorita` | Marcar como favorita | — | — | `204` sin cuerpo | 401, 403, 404 |
| DELETE | `/recetas/{id}/favorita` | Quitar de favoritas | — | — | `204` sin cuerpo | 401, 403, 404 |
| GET | `/recetas/{id}/nutricion` | Desglose del cálculo nutricional | `raciones?` (integer) | — | `200` `NutricionRecetaResponse` | 400, 401, 404 |
| GET | `/recetas/{id}/relacionadas` | Recetas relacionadas | — | — | `200` `RecetaResumenResponse[]` | 401, 403, 404 |
| GET | `/recetas/categorias` | Categorías de receta | — | — | `200` `CategoriaResponse[]` | 401 |
| GET | `/recetas/externas/themealdb/{idMeal}` | Detalle de una receta de TheMealDB | — | — | `200` `RecetaResponse` | 400, 401, 403, 404, 503 |
| GET | `/recetas/favoritas` | Mis recetas favoritas | — | — | `200` `RecetaResumenResponse[]` | 401, 403 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /recetas`: Recetas del catálogo (públicas publicadas y propias) paginadas y, en la primera página, las de TheMealDB aún no importadas (estadoNutricional PENDIENTE, con referenciaExterna). TheMealDB se consulta con el texto o, si no, con el ingrediente, la categoría o el área; no se consulta si se filtra por franja, kcal o proteína, que solo se aplican a recetas con cálculo COMPLETO o APROXIMADO. Si TheMealDB no está disponible, themealdbDisponible = false y la cabecera X-Proveedor-No-Disponible.
- `GET /recetas/{id}`: Ingredientes con las cantidades para las raciones pedidas, instrucciones, nutrientes por ración (si hay cálculo), alérgenos y si es compatible con tus restricciones.
- `PUT /recetas/{id}/favorita`: Si ya lo era, no cambia nada.
- `DELETE /recetas/{id}/favorita`: Si no lo era, no cambia nada.
- `GET /recetas/{id}/nutricion`: Cada ingrediente con sus gramos para las raciones pedidas, cómo se han obtenido (EXACTA, ESTIMADA, DESPRECIABLE o SIN_DATOS) y la fuente de sus nutrientes; nutrientes por ración (nulos si el cálculo es INCOMPLETO), estado y completitud. Las raciones de TheMealDB son supuestas.
- `GET /recetas/{id}/relacionadas`: Hasta 6 de la misma categoría o con el mismo primer ingrediente.
- `GET /recetas/categorias`: Categorías de recetas en castellano, en su orden. codigoExterno es la categoría equivalente de TheMealDB (p. ej. Chicken para Pollo).
- `GET /recetas/externas/themealdb/{idMeal}`: La importa la primera vez (idioma en, 4 raciones supuestas, sin publicar, ingredientes pendientes de emparejar) y devuelve su detalle con el id propio; después sale del catálogo sin llamar a TheMealDB.
- `GET /recetas/favoritas`: Las marcadas más recientemente primero.

## §7 · Flujos

### §7.4. Recetas (Ampliación)

- `GET /recetas` devuelve `BusquedaRecetasResponse`: `catalogo` (página de recetas propias y ya importadas) y, solo en la primera página, `themealdb` (recetas de TheMealDB aún **no importadas**: `id = null`, `referenciaExterna = idMeal`, sin nutrientes, `estadoNutricional` "PENDIENTE").
- Para abrir una de TheMealDB sin `id`: `GET /recetas/externas/themealdb/{referenciaExterna}` → la importa y devuelve el `RecetaResponse` con su `id` propio. Después usa siempre `/recetas/{id}`.
- `estadoNutricional`: `COMPLETO` (cifras), `APROXIMADO` (prefijo "≈"), `INCOMPLETO` (sin cifras por ración; no se puede planificar ni registrar).
- Recetas de TheMealDB: `idioma = "en"`, `racionesSupuestas = true` y atribución "Receta e imagen: TheMealDB".
