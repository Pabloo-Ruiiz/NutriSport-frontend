# NutriSport API · Lista de la compra

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Listas generadas desde un menú, productos libres, ingredientes de recetas y progreso (Ampliación A5).

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Lista de la compra
export interface ListaCompraResumenResponse {
  id: string; // UUID
  nombre: string;
  estado: EstadoLista;
  menuId: string | null; // UUID
  fechaDesde: string | null; // "AAAA-MM-DD"
  fechaHasta: string | null; // "AAAA-MM-DD"
  comprados: number;
  total: number;
  creadoEn: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
}
export interface ListaCompraResponse {
  id: string; // UUID
  nombre: string;
  estado: EstadoLista;
  menuId: string | null; // UUID
  fechaDesde: string | null; // "AAAA-MM-DD"
  fechaHasta: string | null; // "AAAA-MM-DD"
  comprados: number;
  total: number;
  secciones: SeccionCompraResponse[];
}
export interface SeccionCompraResponse {
  nombre: string;
  productos: ProductoCompraResponse[];
}
export interface ProductoCompraResponse {
  id: string; // UUID
  nombre: string;
  cantidad: number;
  unidad: UnidadCompra;
  seccion: string;
  comprado: boolean;
  manual: boolean;
  desglose: EntradaDesglose[];
}
export interface EntradaDesglose {
  fecha: string; // "AAAA-MM-DD"
  gramos: number | null;
}
export interface GenerarListaRequest {
  desde?: string; // "AAAA-MM-DD"
  hasta?: string; // "AAAA-MM-DD"
}
export interface ActualizarListaRequest {
  nombre?: string; // máx. 100 car.
  estado?: EstadoLista;
}
export interface ProductoCompraRequest {
  nombre: string; // máx. 120 car.
  cantidad: number; // >0 y ≤99999.99
  unidad: UnidadCompra;
  seccion?: string; // máx. 40 car.
}
export interface ActualizarProductoRequest {
  cantidad?: number; // >0 y ≤99999.99
  unidad?: UnidadCompra;
  comprado?: boolean;
}
export interface AnadirRecetaListaRequest {
  recetaId: string; // UUID
  raciones: number; // >0 y ≤50
}
```

## §6 · Endpoints

### §6 · Compra · Ampliación

Listas generadas desde un menú con las cantidades sumadas por alimento y agrupadas por sección del supermercado, productos libres, ingredientes de una receta y progreso de la compra.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/listas-compra` | Mis listas de la compra | `page?=0` (integer), `size?=20` (integer), `sort?` (string[]) | — | `200` `Pagina<ListaCompraResumenResponse>` | 400, 401, 403 |
| GET | `/listas-compra/{id}` | Detalle de una lista | — | — | `200` `ListaCompraResponse` | 401, 403, 404 |
| PATCH | `/listas-compra/{id}` | Renombrar o completar una lista | — | `ActualizarListaRequest` | `200` `ListaCompraResponse` | 400, 401, 403, 404 |
| DELETE | `/listas-compra/{id}` | Eliminar una lista | — | — | `204` sin cuerpo | 401, 403, 404 |
| POST | `/listas-compra/{id}/productos` | Añadir un producto libre | — | `ProductoCompraRequest` | `201` `ListaCompraResponse` | 400, 401, 403, 404 |
| PATCH | `/listas-compra/{id}/productos/{productoId}` | Editar o marcar un producto | — | `ActualizarProductoRequest` | `200` `ListaCompraResponse` | 400, 401, 403, 404 |
| DELETE | `/listas-compra/{id}/productos/{productoId}` | Quitar un producto | — | — | `204` sin cuerpo | 401, 403, 404 |
| POST | `/listas-compra/{id}/productos/desde-receta` | Añadir los ingredientes de una receta | — | `AnadirRecetaListaRequest` | `201` `ListaCompraResponse` | 400, 401, 403, 404 |
| POST | `/listas-compra/desde-menu/{menuId}` | Generar una lista desde un menú | — | `GenerarListaRequest` | `201` `ListaCompraResponse` | 400, 401, 403, 404 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /listas-compra`: Resumen de las listas con su progreso (comprados de total), la más reciente primero (como mucho 50 por página).
- `GET /listas-compra/{id}`: Productos agrupados por sección en el orden de las categorías de alimentos (las secciones propias, al final); dentro de cada sección, los comprados al final.
- `PATCH /listas-compra/{id}`: Solo cambian los campos presentes; devuelve la lista completa.
- `DELETE /listas-compra/{id}`: La borra con sus productos.
- `POST /listas-compra/{id}/productos`: Producto escrito a mano (manual = true) con su cantidad y unidad. Sin sección va a "Otros". Devuelve la lista completa.
- `PATCH /listas-compra/{id}/productos/{productoId}`: Cambia la cantidad, la unidad o si está comprado; los campos ausentes no cambian. Devuelve la lista completa.
- `DELETE /listas-compra/{id}/productos/{productoId}`: Lo borra de la lista, esté comprado o no.
- `POST /listas-compra/{id}/productos/desde-receta`: Escala los ingredientes a raciones / raciones de la receta. Los emparejados con el catálogo se suman al producto pendiente del mismo alimento (o se crea uno); los demás se añaden como texto libre con su medida original, en 1 UD. 404 si la receta no existe o es privada de otro usuario.
- `POST /listas-compra/desde-menu/{menuId}`: Suma los ingredientes emparejados con el catálogo de las comidas no consumidas del menú (cantidad de la receta × raciones / raciones de la receta) por alimento, en G o ML (KG o L desde 1000), con la sección de su categoría y el desglose por día. Sin cuerpo o sin fechas, el menú completo; desde y hasta deben estar dentro del menú (400). Si no hay nada que comprar, la lista se crea vacía.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `ActualizarListaRequest` | `nombre` | máx. 100 caracteres; no puede ser solo espacios |
| `ActualizarProductoRequest` | `cantidad` | mayor que 0 y como mucho 99999.99 |
| `AnadirRecetaListaRequest` | `recetaId` | obligatorio |
| `AnadirRecetaListaRequest` | `raciones` | obligatorio; mayor que 0 y como mucho 50 |
| `ProductoCompraRequest` | `nombre` | obligatorio; máx. 120 caracteres |
| `ProductoCompraRequest` | `cantidad` | obligatorio; mayor que 0 y como mucho 99999.99 |
| `ProductoCompraRequest` | `unidad` | obligatorio |
| `ProductoCompraRequest` | `seccion` | máx. 40 caracteres |
