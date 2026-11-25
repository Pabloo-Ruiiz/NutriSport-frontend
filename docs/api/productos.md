# NutriSport API · Productos comerciales (Open Food Facts)

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Búsqueda bajo demanda y ficha por código de barras (Ampliación A1).

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Productos (Open Food Facts)
export interface ProductoResumenResponse {
  id: string | null; // UUID
  codigoBarras: string;
  nombre: string;
  marca: string | null;
  imagenUrl: string | null;
  kcal100: number;
  nutricionCompleta: boolean;
  fuente: FuenteResponse;
}
export interface ProductoResponse {
  id: string | null; // UUID
  codigoBarras: string;
  nombre: string;
  marca: string | null;
  imagenUrl: string | null;
  unidadBase: UnidadBase;
  por100: Por100;
  racion: Racion | null;
  ingredientesTexto: string | null;
  alergenosContiene: string[];
  alergenosTrazas: string[];
  alergenosRevisados: boolean;
  nutricionCompleta: boolean;
  fuente: FuenteResponse;
}
export interface Por100 {
  kcal: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  azucares: number | null;
  saturadas: number | null;
  fibra: number | null;
  sal: number | null;
}
export interface Racion {
  gramos: number | null;
  descripcion: string | null;
}
```

## §6 · Endpoints

### §6 · Productos · Ampliación

Productos comerciales de Open Food Facts: búsqueda bajo demanda y ficha por código de barras. El catálogo hace de caché (30 días) y la aplicación sigue funcionando con él si el proveedor no responde. Datos de Open Food Facts (ODbL), con atribución en cada producto.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/productos` | Buscar productos comerciales | `q?` (string), `page?=0` (integer) | — | `200` `ProductoResumenResponse[]` | 400, 401, 403 |
| GET | `/productos/{codigoBarras}` | Producto por código de barras | — | — | `200` `ProductoResponse` | 400, 401, 403, 404, 409, 503 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /productos`: Busca en Open Food Facts, 20 por página. Llámalo solo cuando el usuario lo pida (botón "Buscar en productos comerciales"), nunca mientras escribe: el límite de búsquedas lo comparten todos los usuarios. Caché de 1 hora. Los resultados no se guardan; los que ya están en el catálogo llevan id. Si el proveedor no está disponible, responde 200 con una lista vacía y la cabecera X-Proveedor-No-Disponible.
- `GET /productos/{codigoBarras}`: Busca primero en el catálogo; si no está o su copia tiene más de 30 días, lo pide a Open Food Facts y lo guarda. Si el proveedor no responde, devuelve la copia del catálogo aunque sea antigua. Un producto con la información nutricional incompleta se devuelve sin id y con nutricionCompleta = false: no se puede registrar en una comida. Los alérgenos de los productos importados están sin revisar.

## §7 · Flujos

### §7.3. Productos comerciales y código de barras (Ampliación)

- `GET /productos?q=` consulta Open Food Facts: **solo al pulsar el botón** "Buscar en productos comerciales", nunca mientras se escribe (el límite lo comparten todos los usuarios).
- `GET /productos/{codigoBarras}` (8–14 dígitos) busca en el catálogo y, si no está, en Open Food Facts. Si `nutricionCompleta = false` (o `id = null`), el producto **no se puede registrar**: ofrece "Crear alimento propio".
- Para registrar un producto: `AlimentoRegistradoRequest` con `alimentoId` (si tiene `id`) o con `codigoBarras`.
- Muestra siempre la atribución (`fuente.atribucion`, con enlace a `fuente.url`) donde aparezcan datos de Open Food Facts (licencia ODbL).
