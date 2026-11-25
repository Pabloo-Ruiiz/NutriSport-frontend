# NutriSport API · Catálogo de alimentos y categorías

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Búsqueda de alimentos, recientes y frecuentes, alimentos privados del usuario y categorías. Valores por 100 g o 100 ml.

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Catálogo de alimentos y categorías
export interface AlimentoResumenResponse {
  id: string; // UUID
  nombre: string;
  marca: string | null;
  kcal100: number;
  proteinas100: number;
  carbohidratos100: number;
  grasas100: number;
  fuente: FuenteAlimento;
}
export interface AlimentoResponse {
  id: string; // UUID
  nombre: string;
  marca: string | null;
  categoriaId: string | null; // UUID
  categoriaNombre: string | null;
  preparacion: Preparacion | null;
  kcal100: number;
  proteinas100: number;
  carbohidratos100: number;
  grasas100: number;
  azucares100: number | null;
  saturadas100: number | null;
  fibra100: number | null;
  sal100: number | null;
  unidadBase: UnidadBase;
  porciones: PorcionCasera[];
  alergenosContiene: Alergeno[];
  alergenosTrazas: Alergeno[];
  alergenosRevisados: boolean;
  contieneLactosa: boolean;
  aptoVegano: boolean;
  aptoVegetariano: boolean;
  aptoPescetariano: boolean;
  fuente: FuenteAlimento;
  referenciaExterna: string | null;
  visibilidad: Visibilidad;
  validado: boolean;
  activo: boolean;
  propio: boolean;
}
export interface AlimentoRequest {
  nombre: string; // máx. 150 car.
  marca?: string; // máx. 80 car.
  categoriaId: string; // UUID
  preparacion?: Preparacion;
  kcal100: number; // 0–900
  proteinas100: number; // 0–100
  carbohidratos100: number; // 0–100
  grasas100: number; // 0–100
  azucares100?: number; // 0–100
  saturadas100?: number; // 0–100
  fibra100?: number; // 0–100
  sal100?: number; // 0–100
  unidadBase: UnidadBase;
  porciones?: PorcionCasera[]; // 0–20 elementos
  alergenosContiene?: Alergeno[];
  alergenosTrazas?: Alergeno[];
  contieneLactosa: boolean;
  aptoVegano: boolean;
  aptoVegetariano: boolean;
  aptoPescetariano: boolean;
}
export interface PorcionCasera {
  nombre: string; // máx. 40 car.
  gramos: number; // >0 y ≤5000
}
export interface CategoriaResponse {
  id: string; // UUID
  nombre: string;
  tipo: TipoCategoria;
  padreId: string | null; // UUID
  seccionCompra: string | null;
  codigoExterno: string | null;
  orden: number;
}
export interface CategoriaRequest {
  nombre: string; // máx. 80 car.
  tipo: TipoCategoria;
  padreId?: string; // UUID
  seccionCompra?: string; // máx. 40 car.
  orden: number; // 0–999
}
```

## §6 · Endpoints

### §6 · Catálogo

Búsqueda de alimentos (públicos y privados propios), alimentos recientes y frecuentes, alimentos privados del usuario y categorías. Los valores nutricionales son por 100 g o 100 ml.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/alimentos` | Buscar alimentos | `q?` (string), `categoria?` (string), `page?=0` (integer), `size?=20` (integer), `sort?` (string[]) | — | `200` `Pagina<AlimentoResumenResponse>` | 400, 401 |
| POST | `/alimentos` | Crear un alimento privado | — | `AlimentoRequest` | `201` `AlimentoResponse` | 400, 401, 403 |
| GET | `/alimentos/{id}` | Detalle de un alimento | — | — | `200` `AlimentoResponse` | 401, 404 |
| PUT | `/alimentos/{id}` | Editar un alimento privado propio | — | `AlimentoRequest` | `200` `AlimentoResponse` | 400, 401, 403, 404 |
| DELETE | `/alimentos/{id}` | Eliminar un alimento privado propio | — | — | `204` sin cuerpo | 401, 403, 404 |
| GET | `/alimentos/frecuentes` | Alimentos más usados | — | — | `200` `AlimentoResumenResponse[]` | 401, 403 |
| GET | `/alimentos/recientes` | Alimentos usados recientemente | — | — | `200` `AlimentoResumenResponse[]` | 401, 403 |
| GET | `/categorias` | Listar categorías de un tipo | `tipo` (TipoCategoria) | — | `200` `CategoriaResponse[]` | 400, 401 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /alimentos`: Alimentos activos públicos y privados propios. Tolera tildes, mayúsculas y errores de escritura; los más parecidos van primero (se ignora sort). size: máximo 50.
- `POST /alimentos`: Solo lo ve su creador; queda sin validar y con los alérgenos sin revisar. Vegano implica vegetariano y vegetariano implica pescetariano.
- `GET /alimentos/{id}`: Valores nutricionales, porciones caseras, alérgenos y aptitud para dietas. 404 si no existe o es privado de otro usuario.
- `PUT /alimentos/{id}`: Mismas reglas que al crearlo. 404 si no es un alimento privado propio y activo.
- `DELETE /alimentos/{id}`: Si ya se ha usado en alguna comida solo se desactiva (el historial lo conserva). 404 si no es un alimento privado propio y activo.
- `GET /alimentos/frecuentes`: Los 20 alimentos que más has registrado en los últimos 90 días.
- `GET /alimentos/recientes`: Los 20 últimos alimentos distintos registrados en tus comidas, el más reciente primero.
- `GET /categorias`: Categorías de alimentos o de recetas en su orden de presentación, con su categoría padre.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `AlimentoRequest` | `nombre` | obligatorio; máx. 150 caracteres |
| `AlimentoRequest` | `marca` | máx. 80 caracteres |
| `AlimentoRequest` | `categoriaId` | obligatorio |
| `AlimentoRequest` | `kcal100` | obligatorio; entre 0 y 900 |
| `AlimentoRequest` | `proteinas100` | obligatorio; entre 0 y 100 |
| `AlimentoRequest` | `carbohidratos100` | obligatorio; entre 0 y 100 |
| `AlimentoRequest` | `grasas100` | obligatorio; entre 0 y 100 |
| `AlimentoRequest` | `azucares100` | entre 0 y 100 |
| `AlimentoRequest` | `saturadas100` | entre 0 y 100 |
| `AlimentoRequest` | `fibra100` | entre 0 y 100 |
| `AlimentoRequest` | `sal100` | entre 0 y 100 |
| `AlimentoRequest` | `unidadBase` | obligatorio |
| `AlimentoRequest` | `porciones` | 0–20 elementos |
| `AlimentoRequest` | `contieneLactosa` | obligatorio |
| `AlimentoRequest` | `aptoVegano` | obligatorio; vegano implica vegetariano y vegetariano implica pescetariano |
| `AlimentoRequest` | `aptoVegetariano` | obligatorio |
| `AlimentoRequest` | `aptoPescetariano` | obligatorio |
| `CategoriaRequest` | `nombre` | obligatorio; máx. 80 caracteres |
| `CategoriaRequest` | `tipo` | obligatorio |
| `CategoriaRequest` | `seccionCompra` | máx. 40 caracteres |
| `CategoriaRequest` | `orden` | obligatorio; entre 0 y 999 |
| `PorcionCasera` | `nombre` | obligatorio; máx. 40 caracteres |
| `PorcionCasera` | `gramos` | obligatorio; mayor que 0 y como mucho 5000 |
